# OTA Update Architecture Diagram

This document provides visual diagrams to understand the OTA update system architecture.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DESKTOP APPLICATION                       │
│                         (Electron + React)                       │
├─────────────────────────────────────────────────────────────────┤
│  Settings Dialog (UI)                                           │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ • Select firmware version                              │     │
│  │ • Download from GitHub                                 │     │
│  │ • Upload to device                                     │     │
│  └───────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  use-mcu-update Hook                                            │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ • Manage versions list                                 │     │
│  │ • Download firmware (.hex)                             │     │
│  │ • Trigger upload                                       │     │
│  └───────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  Electron Main Process                                          │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ update.ts: GitHub release download                     │     │
│  │ serial.ts: UART communication & upload                 │     │
│  └───────────────────────────────────────────────────────┘     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ UART
                               │ (115200 baud)
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                       STM32F407VGTx MCU                          │
│                         (Firmware in C)                          │
├─────────────────────────────────────────────────────────────────┤
│  UART Interrupt Handler                                         │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ • Receive commands                                     │     │
│  │ • Parse HEX lines                                      │     │
│  │ • Send responses                                       │     │
│  └───────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  Command Processor (utils.c)                                    │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ • Process "SET FIRMWARE_UPDATE ..."                    │     │
│  │ • Process HEX lines (":...")                           │     │
│  │ • Route to bootloader                                  │     │
│  └───────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  Bootloader Module (bootloader.c)                               │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ • Parse Intel HEX format                               │     │
│  │ • Validate checksums                                   │     │
│  │ • Erase flash sectors                                  │     │
│  │ • Write to flash memory                                │     │
│  │ • Manage state machine                                 │     │
│  └───────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  STM32 HAL Flash Driver                                         │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ • HAL_FLASH_Unlock/Lock                                │     │
│  │ • HAL_FLASHEx_Erase                                    │     │
│  │ • HAL_FLASH_Program                                    │     │
│  └───────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  Flash Memory (1024 KB)                                         │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Sector 0-1:  32KB  Bootloader (preserved)             │     │
│  │ Sector 2-3:  32KB  Config EEPROM (preserved)          │     │
│  │ Sector 4:    64KB  ┐                                   │     │
│  │ Sector 5-10: 768KB │ Application (updateable)         │     │
│  │ Sector 11:   128KB Config storage (preserved)         │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## State Machine Flow

```
┌──────────┐
│   IDLE   │ ◄────────────────────┐
└────┬─────┘                      │
     │                            │
     │ START command              │ ABORT command
     │                            │
     ▼                            │
┌──────────┐                      │
│  READY   │                      │
└────┬─────┘                      │
     │                            │
     │ First HEX line             │
     │                            │
     ▼                            │
┌──────────┐                      │
│RECEIVING │──────────────────────┤
└────┬─────┘                      │
     │                            │
     │ EOF record (":00000001FF") │
     │                            │
     ▼                            │
┌──────────┐                      │
│COMPLETE  │                      │
└────┬─────┘                      │
     │                            │
     │ END command                │
     │                            │
     ▼                            │
┌──────────┐                      │
│  RESET   │                      │
└──────────┘                      │
                                  │
     ┌──────────┐                 │
     │  ERROR   │─────────────────┘
     └──────────┘
         ▲
         │ Any error condition
         │ (checksum fail, flash error, etc.)
```

## Update Sequence Diagram

```
Desktop App              STM32 Device             Flash Memory
    │                         │                         │
    │──"SET FIRMWARE_────────>│                         │
    │   UPDATE START"         │                         │
    │                         │                         │
    │                         │──Erase sectors 4-10────>│
    │                         │                         │
    │<────"UPDATE READY"──────│                         │
    │                         │                         │
    │──":020000040800F2"─────>│                         │
    │  (Extended address)     │                         │
    │                         │                         │
    │──":10000000..."────────>│                         │
    │  (Data record)          │                         │
    │                         │──Write 16 bytes────────>│
    │                         │                         │
    │──":10001000..."────────>│                         │
    │  (Data record)          │                         │
    │                         │──Write 16 bytes────────>│
    │                         │                         │
    │       ... (many more HEX lines) ...               │
    │                         │                         │
    │──":00000001FF"─────────>│                         │
    │  (EOF record)           │                         │
    │                         │                         │
    │<──"UPDATE COMPLETE"─────│                         │
    │                         │                         │
    │──"SET FIRMWARE_────────>│                         │
    │   UPDATE END"           │                         │
    │                         │                         │
    │<──"Resetting..."────────│                         │
    │                         │                         │
    │                         │ (System Reset)          │
    │                         ▼                         │
    │                         │                         │
    │                    New Firmware Boots             │
    │                         │                         │
```

## Intel HEX Format

```
:LLAAAATTDDDDDDDDDDDDDDDDDDCC
│││││││││                  ││
││││││││└─ Data bytes ──────┘│
│││││││└─ Record type        │
││││└└└─ Address (16-bit)    │
││└└─ Byte count             │
│└─ Start code ':'           │
└─ Checksum                  │
```

**Example HEX Records:**

```
:020000040800F2
 │││││││││││││└─ Checksum = 0xF2
 ││││││││└└└└─ Data = 08 00
 │││││││└─ Type = 04 (Extended Linear Address)
 ││││└└─ Address = 0000
 │└└─ Count = 02 (2 data bytes)
 └─ Start code

Result: Set extended address to 0x08000000

:10010000001002080D01000811010008000000007F
 │││││││││                              └─ Checksum
 ││││││││└─ 16 bytes of data (program code)
 │││││└└─ Type = 00 (Data Record)
 ││││└─ Address = 0100 (offset in current segment)
 │└└─ Count = 10 (16 bytes)
 └─ Start code

Result: Write 16 bytes to address 0x08000100

:00000001FF
 │││││││││└─ Checksum = 0xFF
 ││││││└└─ No data
 │││││└─ Type = 01 (End Of File)
 ││└└─ Address = 0000
 │└─ Count = 00
 └─ Start code

Result: End of file, update complete
```

## Memory Map Detail

```
STM32F407VGTx Flash Memory (1024 KB total)

0x08000000 ┌─────────────────────────────┐
           │ Sector 0:  16 KB            │ ┐
0x08004000 ├─────────────────────────────┤ │ Bootloader
           │ Sector 1:  16 KB            │ ┘ (preserved)
0x08008000 ├─────────────────────────────┤
           │ Sector 2:  16 KB            │ ┐ EEPROM
0x0800C000 ├─────────────────────────────┤ │ Emulation
           │ Sector 3:  16 KB            │ ┘ (preserved)
0x08010000 ├═════════════════════════════┤
           │ Sector 4:  64 KB            │ ┐
0x08020000 ├═════════════════════════════┤ │
           │ Sector 5:  128 KB           │ │
0x08040000 ├═════════════════════════════┤ │
           │ Sector 6:  128 KB           │ │
0x08060000 ├═════════════════════════════┤ │
           │ Sector 7:  128 KB           │ │ Application
0x08080000 ├═════════════════════════════┤ │ 832 KB
           │ Sector 8:  128 KB           │ │ (updateable)
0x080A0000 ├═════════════════════════════┤ │
           │ Sector 9:  128 KB           │ │
0x080C0000 ├═════════════════════════════┤ │
           │ Sector 10: 128 KB           │ ┘
0x080E0000 ├─────────────────────────────┤
           │ Sector 11: 128 KB           │ Config Storage
0x08100000 └─────────────────────────────┘ (preserved)

Legend:
════ Updateable (erased and written during OTA)
──── Preserved (never touched during OTA)
```

## Data Flow During Update

```
GitHub Release Server
        │
        │ HTTPS Download
        │ (.hex file)
        ▼
┌──────────────────┐
│ Local Storage    │
│ ~/.userData/     │
│   updates/       │
│   v1.0.1.hex     │
└────────┬─────────┘
         │ Read file
         │ line by line
         ▼
┌──────────────────┐
│ Upload Function  │
│ serial.ts        │
│                  │
│ • Read HEX line  │
│ • Send via UART  │
│ • Wait 20ms      │
│ • Repeat         │
└────────┬─────────┘
         │ UART TX
         │ (115200 baud)
         ▼
┌──────────────────┐
│ UART Interrupt   │
│ Handler          │
│                  │
│ • Receive char   │
│ • Build line     │
│ • Process '\n'   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ HEX Parser       │
│ bootloader.c     │
│                  │
│ • Parse fields   │
│ • Verify checksum│
│ • Extract data   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Flash Writer     │
│ HAL_FLASH_*      │
│                  │
│ • Unlock         │
│ • Program word   │
│ • Lock           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Flash Memory     │
│ 0x08010000+      │
│                  │
│ • Store firmware │
│ • Verify write   │
└──────────────────┘
```

## Error Handling Flow

```
┌────────────────┐
│ HEX Line Input │
└───────┬────────┘
        │
        ▼
┌────────────────┐      No      ┌─────────────┐
│ Valid format?  ├──────────────>│ Report      │
│ (starts ':')   │               │ "Invalid    │
└───────┬────────┘               │  format"    │
        │ Yes                    └──────┬──────┘
        ▼                               │
┌────────────────┐      No      ┌──────┴──────┐
│ Checksum OK?   ├──────────────>│ Report      │
│                │               │ "Checksum   │
└───────┬────────┘               │  error"     │
        │ Yes                    └──────┬──────┘
        ▼                               │
┌────────────────┐      No      ┌──────┴──────┐
│ Address valid? ├──────────────>│ Report      │
│ (in range)     │               │ "Address    │
└───────┬────────┘               │  error"     │
        │ Yes                    └──────┬──────┘
        ▼                               │
┌────────────────┐      No      ┌──────┴──────┐
│ Flash write OK?├──────────────>│ Report      │
│                │               │ "Flash      │
└───────┬────────┘               │  error"     │
        │ Yes                    └──────┬──────┘
        ▼                               │
┌────────────────┐                      │
│ Success!       │                      │
│ Continue       │                      │
└────────────────┘                      │
                                        │
        All errors ──────────────────────┘
                │
                ▼
        ┌────────────────┐
        │ Set state =    │
        │ BOOTLOADER_    │
        │ ERROR          │
        └───────┬────────┘
                │
                ▼
        ┌────────────────┐
        │ User can:      │
        │ • Retry        │
        │ • Abort        │
        │ • Reflash      │
        └────────────────┘
```

## Component Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (TypeScript)                                       │
├─────────────────────────────────────────────────────────────┤
│ • UI for version selection                                  │
│ • Download firmware from GitHub                             │
│ • Trigger upload process                                    │
│ • Display progress/status                                   │
│ • Handle user interactions                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Backend (TypeScript/Node)                                   │
├─────────────────────────────────────────────────────────────┤
│ • File I/O (read .hex files)                                │
│ • Serial port communication                                 │
│ • Send commands and HEX lines                               │
│ • Parse responses                                           │
│ • Manage timing/delays                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Firmware (C)                                                │
├─────────────────────────────────────────────────────────────┤
│ • Parse Intel HEX format                                    │
│ • Validate checksums                                        │
│ • Manage flash operations                                   │
│ • Protect critical sectors                                  │
│ • Report progress/errors                                    │
│ • Coordinate state machine                                  │
└─────────────────────────────────────────────────────────────┘
```

## Performance Profile

```
Update Timeline (500 KB firmware):

00:00 ┌─────────────────────────────────────────────────────┐
      │ START command                                       │
00:02 ├─────────────────────────────────────────────────────┤
      │ Flash Erase (10-15 seconds)                         │
      │ ████████████████                                     │
00:17 ├─────────────────────────────────────────────────────┤
      │ UPDATE READY response                               │
00:18 ├─────────────────────────────────────────────────────┤
      │ HEX Upload (50 minutes @ 160 bytes/sec)            │
      │ ██████████████████████████████████████████████████  │
      │ ... (many progress updates) ...                     │
50:18 ├─────────────────────────────────────────────────────┤
      │ UPDATE COMPLETE response                            │
50:19 ├─────────────────────────────────────────────────────┤
      │ END command                                         │
50:20 ├─────────────────────────────────────────────────────┤
      │ System Reset (1 second)                             │
50:21 ├─────────────────────────────────────────────────────┤
      │ New firmware boots                                  │
      └─────────────────────────────────────────────────────┘

Total Time: ~51 minutes for 500KB

Breakdown:
- Erase:  2.5% (15 sec)
- Upload: 97.5% (50 min)
- Reset:  0.1% (1 sec)
```

## Integration Points

```
┌──────────────────────────────────────────────────────────┐
│                    Integration Points                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Frontend Hook ◄──────► IPC Handler ◄──────► Serial API │
│  (use-mcu-update)     (main/index.ts)      (serial.ts)  │
│                                                           │
│  Serial API ◄──────────────► UART ◄──────► MCU Handler  │
│  (serial.ts)              (USB/UART)      (utils.c)     │
│                                                           │
│  MCU Handler ◄──────────────────────────► Bootloader    │
│  (utils.c)                               (bootloader.c) │
│                                                           │
│  Bootloader ◄────────────────────────────► Flash HAL    │
│  (bootloader.c)                          (HAL_FLASH_*)  │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

These diagrams provide a visual understanding of how all the components work together to enable OTA firmware updates. Refer to the individual documentation files for detailed explanations of each component.

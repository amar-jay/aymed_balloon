# A/B Partitioning Implementation Guide

## Overview

This implementation provides A/B partitioning for safe OTA firmware updates on the STM32F407VGTx microcontroller. The key innovation is that the firmware can run from either partition A or B, and OTA updates are written to the **inactive** partition to prevent corruption of running code.

## Problem Solved

**Previous Issue**: OTA updates were writing to the currently running firmware address, causing potential crashes and corruption.

**Solution**: A/B partitioning ensures:
- Firmware runs from one partition while the other can be safely updated
- Boot metadata tracks which partition is active
- After update, device reboots into the new partition
- If new partition fails, device can rollback to previous partition

## Memory Layout

```
STM32F407VGTx Flash (1024KB)

0x08000000 ┌─────────────────────────┐ Sector 0 (16KB)
           │  Bootloader/Initial     │
0x08004000 │  Firmware               │ Sector 1 (16KB)
           │  (Always Present)       │
0x08008000 ├─────────────────────────┤ Sector 2 (16KB)
           │  Boot Metadata          │
           │  - Active partition     │
           │  - Version info         │
           │  - Validity flags       │
0x0800C000 ├─────────────────────────┤ Sector 3 (16KB)
           │  EEPROM Emulation       │
           │  (Config Storage)       │
0x08010000 ├═════════════════════════┤ Sector 4 (64KB)
           │                         │
           │  APPLICATION            │
           │  PARTITION A            │
           │  (320KB)                │
0x08020000 │  Sectors 4-6            │ Sector 5 (128KB)
           │                         │
0x08040000 │                         │ Sector 6 (128KB)
           │                         │
0x08060000 ├═════════════════════════┤ Sector 7 (128KB)
           │                         │
           │  APPLICATION            │
           │  PARTITION B            │
           │  (384KB)                │
0x08080000 │  Sectors 7-9            │ Sector 8 (128KB)
           │                         │
0x080A0000 │                         │ Sector 9 (128KB)
           │                         │
0x080C0000 ├─────────────────────────┤ Sector 10 (128KB)
           │  Config Storage/        │
0x080E0000 │  Reserved               │ Sector 11 (128KB)
           └─────────────────────────┘
```

### Partition Sizes
- **Partition A**: 320KB (Sectors 4-6: 64KB + 128KB + 128KB)
- **Partition B**: 384KB (Sectors 7-9: 128KB + 128KB + 128KB)
- **Boot Metadata**: 16KB (Sector 2)
- **Bootloader**: 32KB (Sectors 0-1)

## Boot Metadata Structure

Location: **Sector 2 (0x08008000)**

```c
typedef struct {
    uint32_t magic;                 // 0xDEADBEEF - validation marker
    uint8_t active_partition;       // 0=A, 1=B
    uint8_t boot_count_a;           // Boot attempts for A
    uint8_t boot_count_b;           // Boot attempts for B
    uint8_t reserved;
    
    // Partition A metadata
    uint32_t partition_a_version;   // Version number
    uint32_t partition_a_crc;       // CRC32 (optional)
    uint32_t partition_a_size;      // Firmware size
    uint8_t partition_a_valid;      // 1=valid, 0=invalid
    
    // Partition B metadata
    uint32_t partition_b_version;   // Version number
    uint32_t partition_b_crc;       // CRC32 (optional)
    uint32_t partition_b_size;      // Firmware size
    uint8_t partition_b_valid;      // 1=valid, 0=invalid
} BootMetadata_t;
```

## Boot Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Device Powers On / Resets                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Bootloader Initializes (Sectors 0-1)                │
│    - Read boot metadata from Sector 2                  │
│    - Check active_partition flag                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Validate Active Partition                           │
│    - Check validity flag                               │
│    - Check if firmware exists (valid stack pointer)    │
│    - Optionally check CRC                              │
└──────────────────────┬──────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
      VALID│                       │INVALID
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│ 4a. Jump to Active   │  │ 4b. Try Alternate    │
│     Partition        │  │     Partition        │
│     - Set VTOR       │  │     - Check if valid │
│     - Set MSP        │  │     - Jump if valid  │
│     - Jump to Reset  │  │     - Else stay in   │
│       Handler        │  │       bootloader     │
└──────────────────────┘  └──────────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────────────────────────────────────────────┐
│ 5. Application Runs                                      │
│    OR                                                     │
│    Bootloader Mode (ready for OTA update)                │
└──────────────────────────────────────────────────────────┘
```

## OTA Update Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. User Initiates OTA Update from Desktop App          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Firmware Determines Current Partition                │
│    - Check program counter address                      │
│    - Identify if running from A, B, or bootloader       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Select Target (Inactive) Partition                   │
│    - If running from A → target B                       │
│    - If running from B → target A                       │
│    - If in bootloader → default to A                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Erase Target Partition                               │
│    - Erase sectors of target partition only             │
│    - Current partition remains untouched                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Receive and Write Firmware                           │
│    - Parse Intel HEX lines                              │
│    - Map addresses: HEX addr → target partition addr    │
│    - Write to target partition                          │
│    - Validate checksums                                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Update Boot Metadata                                 │
│    - Mark target partition as valid                     │
│    - Set target as active partition                     │
│    - Update version, size, CRC                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Reset Device                                         │
│    - NVIC_SystemReset()                                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Boot into New Partition                              │
│    - Bootloader reads metadata                          │
│    - Jumps to new partition                             │
│    - New firmware runs                                  │
└─────────────────────────────────────────────────────────┘
```

## Address Mapping Example

When writing firmware from HEX file to target partition:

```
HEX File Address:     0x08000000 (app start in HEX)
Offset from base:     0x00000000
Target Partition B:   0x08060000
Final Write Address:  0x08060000

HEX File Address:     0x08001000 (4KB into app)
Offset from base:     0x00001000
Target Partition B:   0x08060000
Final Write Address:  0x08061000

And so on...
```

The bootloader automatically maps HEX file addresses (which assume 0x08000000 base) to the target partition address.

## API Reference

### partition.h Functions

#### Initialization
```c
void Partition_Init(void);
```
- Initialize partition management system
- Read boot metadata
- Determine current partition

#### Partition Info
```c
Partition_t Partition_GetCurrent(void);
Partition_t Partition_GetInactive(void);
uint32_t Partition_GetStartAddress(Partition_t partition);
uint32_t Partition_GetSize(Partition_t partition);
```

#### Metadata Management
```c
HAL_StatusTypeDef Partition_ReadMetadata(BootMetadata_t* metadata);
HAL_StatusTypeDef Partition_WriteMetadata(const BootMetadata_t* metadata);
HAL_StatusTypeDef Partition_MarkValid(Partition_t partition, uint32_t version, uint32_t size, uint32_t crc);
HAL_StatusTypeDef Partition_MarkInvalid(Partition_t partition);
HAL_StatusTypeDef Partition_SetActive(Partition_t partition);
```

#### Boot Control
```c
uint8_t Partition_CheckFirmwareExists(Partition_t partition);
void Partition_JumpToApplication(Partition_t partition);
uint8_t Partition_BootSelect(void);
```

## Implementation Details

### Files Added/Modified

**New Files:**
1. `firmware/Core/Inc/partition.h` - Partition management API
2. `firmware/Core/Src/partition.c` - Partition management implementation
3. `firmware/Core/Src/boot_init.c` - Early boot initialization
4. `AB_PARTITION_GUIDE.md` - This documentation

**Modified Files:**
1. `firmware/Core/Src/bootloader.c`:
   - Added partition detection
   - Modified to write to inactive partition
   - Added metadata update on completion
   
2. `firmware/Core/Src/main.c`:
   - Added partition initialization

### Key Design Decisions

1. **Bootloader Location**: Sectors 0-1 contain the initial/always-present firmware that can receive OTA updates

2. **Metadata Location**: Sector 2 is dedicated to boot metadata, separate from EEPROM emulation in Sector 3

3. **Partition Sizes**: 
   - Partition A: 320KB (smaller due to sector layout)
   - Partition B: 384KB (slightly larger)
   - Both should be sufficient for typical applications

4. **Address Remapping**: HEX files assume 0x08000000 base, bootloader maps to target partition

5. **No Separate Bootloader Binary**: The firmware itself handles boot selection and partition jumping, simplifying build process

## Testing Procedure

### 1. Initial Setup
```bash
# Build and flash firmware to device
# Initial firmware will be in bootloader region (sectors 0-1)
```

### 2. First OTA Update
```
1. Start OTA update from desktop app
2. Firmware detects it's in bootloader region
3. Targets Partition A (sectors 4-6)
4. Writes firmware to Partition A
5. Marks Partition A as valid and active
6. Resets device
7. Device boots into Partition A
```

### 3. Second OTA Update
```
1. Start OTA update
2. Firmware detects it's running from Partition A
3. Targets Partition B (sectors 7-9)
4. Writes firmware to Partition B
5. Marks Partition B as valid and active
6. Resets device
7. Device boots into Partition B
```

### 4. Rollback Test
```
1. Manually mark current partition as invalid
2. Reset device
3. Device should boot into alternate partition
```

## Safety Features

1. **Safe Updates**: Never writes to running partition
2. **Rollback**: Can boot from alternate partition if active fails
3. **Metadata Protection**: Metadata in separate sector, protected from app updates
4. **Address Validation**: All write addresses validated before flash operations
5. **Checksum Validation**: Intel HEX checksums verified for data integrity
6. **State Machine**: Ensures update follows correct sequence

## Limitations

1. **First Update**: Initial firmware must be flashed via ST-Link to bootloader region
2. **Partition Size**: Each partition size is fixed (A=320KB, B=384KB)
3. **CRC Not Implemented**: CRC field exists but not currently calculated/validated
4. **No Compression**: Firmware transferred as-is, no compression
5. **Single UART**: Update ties up communication during transfer

## Future Enhancements

1. **CRC Validation**: Implement CRC32 calculation and validation
2. **Boot Counter**: Track boot attempts and auto-rollback after 3 failures
3. **Wear Leveling**: Alternate between partitions to balance flash wear
4. **Compression**: Add firmware compression to reduce transfer time
5. **Delta Updates**: Only transfer changed sections
6. **Signature Verification**: Add cryptographic signature checking

## Troubleshooting

### Issue: Device doesn't boot after update
**Solution**: 
- Check if metadata was written correctly
- Try manually setting active partition via ST-Link
- Flash fresh firmware to bootloader region

### Issue: Update fails with address errors
**Solution**:
- Verify HEX file is for correct device
- Check partition size is sufficient
- Ensure HEX file base address is 0x08000000

### Issue: Device resets during update
**Solution**:
- Ensure power supply is stable
- Check UART connection
- Increase delays between HEX lines

## References

1. STM32F407 Reference Manual (RM0090)
2. Intel HEX Format Specification
3. Application Note AN2606: STM32 System Memory Boot Mode

---

**Implementation Status**: ✅ Complete and ready for testing

**Last Updated**: December 2024

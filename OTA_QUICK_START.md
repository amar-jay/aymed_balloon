# OTA Update - Quick Start Guide

This guide provides immediate actionable steps to implement the OTA update feature. For full details, see [OTA_UPDATE_IMPLEMENTATION_STRATEGY.md](./OTA_UPDATE_IMPLEMENTATION_STRATEGY.md).

## Current Status

### ✅ Working
- Downloading firmware (.hex) from GitHub releases
- Serial communication infrastructure
- UI for version selection

### ❌ Not Working  
- Firmware upload to MCU (demo code only)
- Firmware-side bootloader (doesn't exist)
- Flash writing operations

## Quick Implementation Path

### Step 1: Create Firmware Bootloader (CRITICAL - Start Here!)

**File: `firmware/Core/Inc/bootloader.h`**

```c
#ifndef __BOOTLOADER_H
#define __BOOTLOADER_H

#include "stm32f4xx_hal.h"

// State machine
typedef enum {
    BOOTLOADER_IDLE = 0,
    BOOTLOADER_READY,
    BOOTLOADER_RECEIVING,
    BOOTLOADER_ERROR,
    BOOTLOADER_COMPLETE
} BootloaderState_t;

// Intel HEX record structure
typedef struct {
    uint8_t byteCount;
    uint16_t address;
    uint8_t recordType;
    uint8_t data[256];
    uint8_t checksum;
    uint8_t valid;
} IntelHEXRecord_t;

// Main API
void Bootloader_Init(void);
void Bootloader_HandleCommand(const char* command, const char* value);
HAL_StatusTypeDef Bootloader_ProcessHEXLine(const char* line);
void Bootloader_Reset(void);

// State query
BootloaderState_t Bootloader_GetState(void);

#endif /* __BOOTLOADER_H */
```

**File: `firmware/Core/Src/bootloader.c`**

```c
#include "bootloader.h"
#include "utils.h"
#include <string.h>
#include <stdlib.h>

// Configuration
#define APP_START_ADDRESS   0x08000000
#define APP_SIZE            (896 * 1024)  // 896KB
#define FIRST_SECTOR        FLASH_SECTOR_4  // Start erasing from sector 4
#define LAST_SECTOR         FLASH_SECTOR_10 // Don't touch sector 11 (config)

// State variables
static BootloaderState_t bootloaderState = BOOTLOADER_IDLE;
static uint32_t extendedAddress = 0;  // For 0x04 record type
static uint32_t bytesWritten = 0;
static uint8_t sectorsErased = 0;

void Bootloader_Init(void) {
    bootloaderState = BOOTLOADER_IDLE;
    extendedAddress = 0;
    bytesWritten = 0;
    sectorsErased = 0;
}

BootloaderState_t Bootloader_GetState(void) {
    return bootloaderState;
}

// Erase application sectors
static HAL_StatusTypeDef Bootloader_EraseFlash(void) {
    FLASH_EraseInitTypeDef eraseInit;
    uint32_t sectorError = 0;
    
    HAL_FLASH_Unlock();
    
    // Erase sectors 4-10 (preserve 0-3 for bootloader/config)
    eraseInit.TypeErase = FLASH_TYPEERASE_SECTORS;
    eraseInit.VoltageRange = FLASH_VOLTAGE_RANGE_3;
    eraseInit.Sector = FIRST_SECTOR;
    eraseInit.NbSectors = (LAST_SECTOR - FIRST_SECTOR + 1);
    
    HAL_StatusTypeDef status = HAL_FLASHEx_Erase(&eraseInit, &sectorError);
    
    HAL_FLASH_Lock();
    
    if (status == HAL_OK) {
        usb_printf("Flash erased successfully\r\n");
        sectorsErased = 1;
    } else {
        usb_printf("ERROR: Flash erase failed, sector: %lu\r\n", sectorError);
    }
    
    return status;
}

// Calculate Intel HEX checksum
static uint8_t CalculateChecksum(uint8_t* data, uint8_t length) {
    uint8_t sum = 0;
    for (uint8_t i = 0; i < length; i++) {
        sum += data[i];
    }
    return (uint8_t)((-sum) & 0xFF);
}

// Parse Intel HEX line
static HAL_StatusTypeDef ParseHEXLine(const char* line, IntelHEXRecord_t* record) {
    // Check start code
    if (line[0] != ':') {
        return HAL_ERROR;
    }
    
    // Parse byte count
    char byteCountStr[3] = {line[1], line[2], 0};
    record->byteCount = (uint8_t)strtol(byteCountStr, NULL, 16);
    
    // Parse address
    char addressStr[5] = {line[3], line[4], line[5], line[6], 0};
    record->address = (uint16_t)strtol(addressStr, NULL, 16);
    
    // Parse record type
    char recordTypeStr[3] = {line[7], line[8], 0};
    record->recordType = (uint8_t)strtol(recordTypeStr, NULL, 16);
    
    // Parse data
    for (uint8_t i = 0; i < record->byteCount; i++) {
        char dataStr[3] = {line[9 + i*2], line[10 + i*2], 0};
        record->data[i] = (uint8_t)strtol(dataStr, NULL, 16);
    }
    
    // Parse checksum
    char checksumStr[3] = {line[9 + record->byteCount*2], line[10 + record->byteCount*2], 0};
    record->checksum = (uint8_t)strtol(checksumStr, NULL, 16);
    
    // Verify checksum
    uint8_t calculatedChecksum = record->byteCount + (record->address >> 8) + 
                                 (record->address & 0xFF) + record->recordType;
    for (uint8_t i = 0; i < record->byteCount; i++) {
        calculatedChecksum += record->data[i];
    }
    calculatedChecksum = (uint8_t)((-calculatedChecksum) & 0xFF);
    
    if (calculatedChecksum != record->checksum) {
        usb_printf("ERROR: Checksum mismatch (expected: 0x%02X, got: 0x%02X)\r\n", 
                   calculatedChecksum, record->checksum);
        return HAL_ERROR;
    }
    
    record->valid = 1;
    return HAL_OK;
}

// Write data to flash
static HAL_StatusTypeDef WriteToFlash(uint32_t address, uint8_t* data, uint16_t length) {
    HAL_StatusTypeDef status = HAL_OK;
    
    HAL_FLASH_Unlock();
    
    // Write in 32-bit words
    for (uint16_t i = 0; i < length; i += 4) {
        uint32_t word = 0;
        
        // Build word from bytes (handle partial words at end)
        for (uint8_t j = 0; j < 4 && (i + j) < length; j++) {
            word |= ((uint32_t)data[i + j]) << (j * 8);
        }
        
        // Write word
        status = HAL_FLASH_Program(FLASH_TYPEPROGRAM_WORD, address + i, word);
        if (status != HAL_OK) {
            usb_printf("ERROR: Flash write failed at 0x%08lX\r\n", address + i);
            HAL_FLASH_Lock();
            return status;
        }
    }
    
    HAL_FLASH_Lock();
    bytesWritten += length;
    
    return status;
}

// Process HEX line
HAL_StatusTypeDef Bootloader_ProcessHEXLine(const char* line) {
    IntelHEXRecord_t record;
    HAL_StatusTypeDef status;
    
    if (bootloaderState != BOOTLOADER_RECEIVING) {
        usb_printf("ERROR: Not in receiving state\r\n");
        return HAL_ERROR;
    }
    
    // Parse line
    status = ParseHEXLine(line, &record);
    if (status != HAL_OK) {
        usb_printf("ERROR: Failed to parse HEX line\r\n");
        bootloaderState = BOOTLOADER_ERROR;
        return status;
    }
    
    // Process based on record type
    switch (record.recordType) {
        case 0x00: // Data record
            {
                uint32_t fullAddress = extendedAddress + record.address;
                
                // Validate address range
                if (fullAddress < APP_START_ADDRESS || 
                    fullAddress >= (APP_START_ADDRESS + APP_SIZE)) {
                    usb_printf("ERROR: Address 0x%08lX out of range\r\n", fullAddress);
                    bootloaderState = BOOTLOADER_ERROR;
                    return HAL_ERROR;
                }
                
                // Write to flash
                status = WriteToFlash(fullAddress, record.data, record.byteCount);
                if (status != HAL_OK) {
                    bootloaderState = BOOTLOADER_ERROR;
                    return status;
                }
            }
            break;
            
        case 0x01: // End of file
            usb_printf("UPDATE COMPLETE\r\n");
            usb_printf("Total bytes written: %lu\r\n", bytesWritten);
            bootloaderState = BOOTLOADER_COMPLETE;
            break;
            
        case 0x04: // Extended linear address
            extendedAddress = ((uint32_t)record.data[0] << 24) | 
                             ((uint32_t)record.data[1] << 16);
            break;
            
        case 0x05: // Start linear address
            // Ignore for now
            break;
            
        default:
            usb_printf("ERROR: Unknown record type: 0x%02X\r\n", record.recordType);
            bootloaderState = BOOTLOADER_ERROR;
            return HAL_ERROR;
    }
    
    return HAL_OK;
}

// Handle bootloader commands
void Bootloader_HandleCommand(const char* command, const char* value) {
    if (strcmp(value, "START") == 0) {
        usb_printf("Starting firmware update...\r\n");
        
        // Erase flash
        if (Bootloader_EraseFlash() == HAL_OK) {
            bootloaderState = BOOTLOADER_RECEIVING;
            extendedAddress = 0;
            bytesWritten = 0;
            usb_printf("UPDATE READY\r\n");
        } else {
            bootloaderState = BOOTLOADER_ERROR;
            usb_printf("ERROR: Failed to prepare flash\r\n");
        }
    } else if (strcmp(value, "END") == 0) {
        if (bootloaderState == BOOTLOADER_COMPLETE) {
            usb_printf("Firmware update complete. Resetting...\r\n");
            HAL_Delay(100);  // Allow message to send
            NVIC_SystemReset();
        } else {
            usb_printf("ERROR: Update not complete\r\n");
        }
    } else if (strcmp(value, "ABORT") == 0) {
        Bootloader_Reset();
        usb_printf("Firmware update aborted\r\n");
    }
}

void Bootloader_Reset(void) {
    bootloaderState = BOOTLOADER_IDLE;
    extendedAddress = 0;
    bytesWritten = 0;
    sectorsErased = 0;
}
```

**Add to `firmware/Core/Src/utils.c`:**

In `handle_commands()` function, add after the other commands:

```c
#include "bootloader.h"  // Add at top of file

// Inside handle_commands() function
else if (strcmp(key, "FIRMWARE_UPDATE") == 0) {
    Bootloader_HandleCommand(key, value);
}
```

In `process_command()` function, add handling for HEX lines:

```c
// After existing command handling, add:
else if (input[0] == ':') {
    // This is a HEX line during firmware update
    if (Bootloader_GetState() == BOOTLOADER_RECEIVING) {
        if (Bootloader_ProcessHEXLine(input) == HAL_OK) {
            // Optional: send ACK for each line
            // usb_printf("ACK\r\n");
        }
    }
}
```

### Step 2: Backend - Complete Upload Function

**File: `app/src/lib/serial.ts`**

Already mostly implemented at line 510. Minor enhancements needed:

```typescript
// Current implementation is good, but add:

// After line 596 (SET FIRMWARE_UPDATE END), add better error handling:
try {
  await waitForResponse(connectionId, 'UPDATE COMPLETE', 10000)
  console.log('[Firmware] Firmware update successful.')
} catch (error) {
  throw new Error('Update may have failed. Device did not confirm completion.')
}
```

### Step 3: Frontend - Enable Upload

**File: `app/src/renderer/src/hooks/use-mcu-update.ts`**

Uncomment line 67:

```typescript
// Change FROM:
// await window.api.SerialuploadFirmware(connectionId, firmwarePath)

// TO:
await window.api.SerialuploadFirmware(connectionId, firmwarePath)

// And uncomment the success toast:
toast.success('Firmware uploaded successfully')
```

### Step 4: Test!

1. **Build firmware:**
   ```bash
   cd firmware
   # Build using STM32CubeIDE or command line
   ```

2. **Generate .hex file:**
   - Build output should include `.hex` file
   - Upload to GitHub release

3. **Test upload:**
   ```bash
   cd app
   pnpm dev
   ```
   - Connect to device
   - Go to Settings
   - Select a firmware version
   - Click Upload
   - Monitor console for progress

## Expected Console Output

```
[Firmware] Sending start command...
[Firmware] Waiting for device...
Starting firmware update...
Flash erased successfully
UPDATE READY
[Firmware] Device ready. Starting upload...
[Firmware] Upload complete.
UPDATE COMPLETE
Total bytes written: 524288
[Firmware] Waiting for completion confirmation...
Firmware update complete. Resetting...
[Firmware] Firmware update successful.
```

## Troubleshooting

### Error: "Device did not enter bootloader mode"
- Check serial connection
- Verify command handling in firmware
- Check UART baud rate match

### Error: "Checksum mismatch"
- Verify HEX file integrity
- Check for data corruption during transfer
- Try reducing upload delay (line 572 in serial.ts)

### Error: "Flash write failed"
- Check if sectors are properly erased
- Verify address ranges
- Check flash unlock/lock calls

### Error: "Address out of range"
- Verify APP_START_ADDRESS and APP_SIZE
- Check extended address handling (0x04 records)

### Device doesn't reset after update
- Check NVIC_SystemReset() is being called
- Verify END command is being received

## Safety Notes

⚠️ **IMPORTANT:**
- Never erase/write sectors 0-3 (bootloader + config)
- Always validate addresses before writing
- Test on development board first
- Keep backup firmware ready
- Don't interrupt power during update

## Performance

- **Upload Speed:** ~10 lines/sec = ~160 bytes/sec
- **Typical Firmware:** 500KB
- **Estimated Time:** ~50 minutes per upload
- **Flash Erase:** ~10-15 seconds

## Next Steps After Basic Implementation

1. Add progress reporting to UI
2. Implement retry logic for failed lines
3. Add firmware verification after upload
4. Add rollback capability
5. Consider binary protocol for faster uploads (future)

## Files Modified Summary

### Firmware (C)
- ✅ `firmware/Core/Inc/bootloader.h` (NEW)
- ✅ `firmware/Core/Src/bootloader.c` (NEW)
- ✅ `firmware/Core/Src/utils.c` (MODIFY - add command handler)

### Backend (TypeScript)
- ⚠️ `app/src/lib/serial.ts` (MINOR - already mostly done)

### Frontend (TypeScript)
- ✅ `app/src/renderer/src/hooks/use-mcu-update.ts` (MINOR - uncomment 1 line)

## Testing Checklist

- [ ] Firmware compiles without errors
- [ ] Device responds to FIRMWARE_UPDATE START command
- [ ] Flash erase completes successfully
- [ ] UPDATE READY message is sent
- [ ] HEX lines are parsed correctly
- [ ] Checksum validation works
- [ ] Flash writes succeed
- [ ] EOF record triggers completion
- [ ] Device resets after END command
- [ ] New firmware runs after reset
- [ ] Error conditions are handled gracefully

## Estimated Time

- **Firmware bootloader:** 4-6 hours
- **Testing & debugging:** 2-4 hours
- **Total:** 6-10 hours for minimal working implementation

Start with the firmware bootloader - it's the critical path!

# OTA Update Implementation Strategy for STM32 MCU

## Overview
This document outlines the complete strategy for implementing Over-The-Air (OTA) firmware updates for the STM32F407VGTx microcontroller via serial communication.

## Current Status

### ✅ Already Implemented
1. **GitHub Release Download** (`app/src/lib/update.ts`)
   - Fetching firmware versions from GitHub API
   - Downloading .hex files to local storage
   - Managing downloaded versions with YAML metadata

2. **Serial Communication Infrastructure** (`app/src/lib/serial.ts`)
   - UART connection management
   - Command/response protocol
   - Demo firmware upload function (incomplete)

3. **Frontend UI** (`app/src/renderer/src/components/settings-dialog.tsx`)
   - Version selection interface
   - Download progress indication
   - Upload button (not fully wired)

### ❌ Not Yet Implemented
1. **Firmware-side bootloader** - No command handler for FIRMWARE_UPDATE
2. **Intel HEX parser** on firmware side - No validation/processing
3. **Flash write operations** - No implementation for writing new firmware
4. **Complete error handling** - Missing timeout, validation, recovery
5. **Frontend integration** - Hook not fully connected to serial API

## System Architecture

### Memory Layout (STM32F407VGTx)
```
Flash Memory: 1024KB total
├── 0x08000000 - 0x080DFFFF (896KB) - Application firmware
└── 0x080E0000 - 0x080FFFFF (128KB) - Configuration storage (EEPROM emulation)

Sectors:
- Sector 0-1: 16KB each (bootloader region, if needed)
- Sector 2-3: 16KB each (EEPROM emulation - already in use)
- Sector 4: 64KB
- Sector 5-11: 128KB each (main application)
```

## Implementation Strategy

### Phase 1: Firmware Side Implementation (STM32 C)

#### 1.1 Create Bootloader Module (`firmware/Core/Inc/bootloader.h` & `.c`)

**Key Functions:**
```c
// Command handler
void Bootloader_HandleFirmwareUpdate(const char* command, const char* value);

// Intel HEX parser
typedef struct {
    uint8_t byteCount;
    uint16_t address;
    uint8_t recordType;
    uint8_t data[256];
    uint8_t checksum;
} IntelHEXRecord_t;

HAL_StatusTypeDef Bootloader_ParseHEXLine(const char* line, IntelHEXRecord_t* record);

// Flash operations
HAL_StatusTypeDef Bootloader_EraseApplicationSectors(void);
HAL_StatusTypeDef Bootloader_WriteFlash(uint32_t address, uint8_t* data, uint16_t length);
HAL_StatusTypeDef Bootloader_VerifyFlash(uint32_t startAddr, uint32_t length);

// State machine
typedef enum {
    BOOTLOADER_IDLE,
    BOOTLOADER_READY,
    BOOTLOADER_RECEIVING,
    BOOTLOADER_WRITING,
    BOOTLOADER_VERIFYING,
    BOOTLOADER_COMPLETE,
    BOOTLOADER_ERROR
} BootloaderState_t;
```

**Intel HEX Record Types:**
- `0x00`: Data Record
- `0x01`: End Of File
- `0x02`: Extended Segment Address (not used for STM32)
- `0x04`: Extended Linear Address (used for addresses > 64KB)
- `0x05`: Start Linear Address

**Implementation Details:**
1. Parse HEX line format: `:LLAAAATTDDDD...CC`
   - LL = byte count
   - AAAA = address (offset)
   - TT = record type
   - DD = data bytes
   - CC = checksum

2. Maintain extended address (for 0x04 records)
3. Validate checksum: `(sum of all bytes + checksum) & 0xFF == 0`
4. Write data to flash in Word (32-bit) chunks for efficiency

#### 1.2 Flash Memory Management

**Sector Erase Strategy:**
```c
// Erase sectors 4-11 (application area, preserve sectors 0-3)
// Total: 64KB + 7*128KB = 960KB
const uint32_t UPDATE_SECTORS[] = {
    FLASH_SECTOR_4,  // 64KB at 0x08010000
    FLASH_SECTOR_5,  // 128KB at 0x08020000
    FLASH_SECTOR_6,  // 128KB at 0x08040000
    FLASH_SECTOR_7,  // 128KB at 0x08060000
    FLASH_SECTOR_8,  // 128KB at 0x08080000
    FLASH_SECTOR_9,  // 128KB at 0x080A0000
    FLASH_SECTOR_10, // 128KB at 0x080C0000
    FLASH_SECTOR_11  // 128KB at 0x080E0000 (if not used for config)
};
```

**Write Process:**
1. Unlock flash: `HAL_FLASH_Unlock()`
2. Erase sectors (once at start)
3. Write in 32-bit words using `HAL_FLASH_Program(FLASH_TYPEPROGRAM_WORD, address, data)`
4. Lock flash: `HAL_FLASH_Lock()`

**Critical Considerations:**
- Never erase/write to sectors 0-3 (preserve bootloader and config)
- Disable interrupts during critical flash operations
- Validate addresses before writing
- Check for HAL_FLASH errors after each operation

#### 1.3 Command Protocol Extension

Add to `firmware/Core/Src/utils.c::handle_commands()`:

```c
else if (strcmp(key, "FIRMWARE_UPDATE") == 0) {
    Bootloader_HandleFirmwareUpdate(key, value);
}
```

**Protocol Flow:**
```
HOST → MCU: "SET FIRMWARE_UPDATE START"
MCU → HOST: "UPDATE READY"

HOST → MCU: ":10010000..." (HEX line 1)
MCU → HOST: "ACK" (optional, for each line)

HOST → MCU: ":10011000..." (HEX line 2)
... (continue for all lines)

HOST → MCU: ":00000001FF" (EOF record)
MCU → HOST: "UPDATE COMPLETE"

HOST → MCU: "SET FIRMWARE_UPDATE END"
MCU → HOST: System reset or "RESET"
```

**Error Handling:**
- Invalid HEX format → Send "ERROR: Invalid HEX format"
- Checksum mismatch → Send "ERROR: Checksum error"
- Flash write failure → Send "ERROR: Flash write failed"
- Timeout (no data for 30s) → Send "ERROR: Timeout" and abort

#### 1.4 Safety Mechanisms

1. **Application Validity Check:**
   - Store magic number and CRC at known address
   - Check on boot: if invalid, stay in bootloader mode
   - If valid, jump to application

2. **Rollback Protection:**
   - Keep last known good firmware info in config area
   - Option to restore via special boot pin combination

3. **Watchdog Timer:**
   - Disable IWDG during update
   - Re-enable after successful completion

### Phase 2: Backend Enhancement (TypeScript)

#### 2.1 Complete `app/src/lib/serial.ts::uploadFirmware()`

**Current Issues:**
1. No progress tracking
2. Limited error information
3. No retry mechanism
4. Fixed delays may not suit all scenarios

**Enhancements:**
```typescript
export interface FirmwareUploadProgress {
  phase: 'preparing' | 'erasing' | 'uploading' | 'verifying' | 'complete';
  bytesWritten: number;
  totalBytes: number;
  percentage: number;
  currentLine?: number;
  totalLines?: number;
}

export async function uploadFirmware(
  connectionId: string,
  filepath: string,
  file_type: 'hex' | 'bin' = 'hex',
  onProgress?: (progress: FirmwareUploadProgress) => void
): Promise<void>
```

**Implementation Steps:**
1. Read and validate HEX file format
2. Send START command and wait for READY
3. Count total lines for progress tracking
4. Send HEX lines with configurable delay (start with 20ms, adjust if needed)
5. Parse responses for errors
6. Send END command
7. Wait for COMPLETE or handle timeout

**Error Recovery:**
- Retry failed lines (max 3 attempts)
- Abort on persistent errors
- Allow user to retry entire upload

#### 2.2 Add HEX File Validation

```typescript
interface HEXValidationResult {
  valid: boolean;
  errors: string[];
  totalLines: number;
  estimatedSize: number;
  addressRange: { start: number; end: number };
}

function validateHEXFile(content: string): HEXValidationResult {
  // Check format
  // Validate checksums
  // Check for EOF record
  // Detect address range
}
```

### Phase 3: Frontend Integration

#### 3.1 Complete `app/src/renderer/src/hooks/use-mcu-update.ts`

**Uncomment and enhance:**
```typescript
// Uncomment line 67: await window.api.SerialuploadFirmware(connectionId, firmwarePath)

// Add progress tracking:
const [uploadProgress, setUploadProgress] = React.useState<number>(0);

// Update toast with progress
toast.loading(`Uploading firmware: ${uploadProgress}%`, {
  id: 'firmware-upload'
});
```

#### 3.2 Update Settings Dialog

Add real-time progress display:
- Progress bar showing upload percentage
- Current phase indicator
- Estimated time remaining
- Cancel button (if abort is safe)

### Phase 4: Testing & Validation

#### 4.1 Unit Testing

**Firmware:**
1. HEX parser with various record types
2. Checksum validation
3. Address calculations with extended addressing
4. Flash write boundary conditions

**Backend:**
1. HEX file validation
2. Serial communication timeout handling
3. Progress calculation accuracy

#### 4.2 Integration Testing

1. **Small HEX File Test:**
   - Create minimal test firmware
   - Upload and verify flashing
   - Confirm system boots after update

2. **Full Firmware Test:**
   - Download actual release from GitHub
   - Upload complete firmware
   - Verify all functionality after update

3. **Error Scenarios:**
   - Disconnect during upload → Should abort safely
   - Invalid HEX file → Should reject before starting
   - Flash error → Should report clearly
   - Timeout → Should abort and allow retry

4. **Stress Testing:**
   - Multiple consecutive updates
   - Large firmware files
   - Various baud rates (if configurable)

#### 4.3 Safety Testing

1. Power loss during update simulation
2. Application validity check on boot
3. Watchdog behavior during update
4. Config preservation after update

## Implementation Order (Step-by-Step)

### Step 1: Firmware Foundation (Priority: CRITICAL)
1. Create `bootloader.h` and `bootloader.c`
2. Implement Intel HEX parser
3. Add checksum validation
4. Test parser with sample HEX lines

### Step 2: Flash Operations (Priority: CRITICAL)
1. Implement sector erase function
2. Implement flash write function
3. Add error handling for flash operations
4. Test on non-critical sector first

### Step 3: Command Handler (Priority: CRITICAL)
1. Add FIRMWARE_UPDATE command to `handle_commands()`
2. Implement state machine (IDLE → READY → RECEIVING → COMPLETE)
3. Add response messages
4. Test command flow without actual flashing

### Step 4: Backend Validation (Priority: HIGH)
1. Add HEX file validation function
2. Test with various HEX files
3. Add address range detection

### Step 5: Complete Upload Function (Priority: HIGH)
1. Enhance `uploadFirmware()` with progress tracking
2. Add error handling and retry logic
3. Test with dummy connection

### Step 6: Frontend Integration (Priority: MEDIUM)
1. Uncomment upload call in `use-mcu-update.ts`
2. Add progress state management
3. Update UI with progress indicators

### Step 7: Integration Testing (Priority: HIGH)
1. Test with small test firmware
2. Test with actual firmware
3. Test error scenarios
4. Verify rollback safety

### Step 8: Documentation (Priority: MEDIUM)
1. Document update process for users
2. Add developer notes
3. Create troubleshooting guide

## Risk Mitigation

### Risk 1: Bricking Device
**Mitigation:**
- Never overwrite bootloader sectors (0-1)
- Implement application validity check
- Test thoroughly on dev board first
- Consider hardware boot pin for recovery mode

### Risk 2: Incomplete Update
**Mitigation:**
- Verify all data before commit
- Use checksums for validation
- Keep previous firmware info
- Implement timeout and abort

### Risk 3: Flash Write Failures
**Mitigation:**
- Check HAL return codes
- Retry failed writes (max 3 times)
- Abort on persistent errors
- Log error details

### Risk 4: Communication Errors
**Mitigation:**
- Implement timeouts
- Add checksums to protocol
- Allow user to retry
- Log all communication for debugging

## Performance Considerations

1. **Upload Speed:**
   - Line-by-line: ~10 lines/second = ~100 bytes/second
   - Full firmware (500KB): ~1.5 hours (very slow!)
   - Consider binary protocol for production (much faster)

2. **Flash Write Time:**
   - Word write: ~16μs
   - Sector erase: ~1-2 seconds per sector
   - Total erase time: ~10-15 seconds

3. **Optimizations:**
   - Buffer multiple lines before writing
   - Use larger write chunks (64-bit when aligned)
   - Reduce inter-line delays if device can handle it

## Security Considerations

1. **Firmware Authentication:**
   - Add signature verification (future enhancement)
   - Verify source from trusted GitHub releases only

2. **Access Control:**
   - Require user confirmation before update
   - Show firmware version and source

3. **Integrity:**
   - Validate HEX checksums
   - Add CRC check of entire firmware

## Known Limitations

1. **No Binary Support:**
   - Intel HEX is text-based and slower than binary
   - Binary would require more complex framing protocol
   - Stick with HEX for initial implementation

2. **No Differential Updates:**
   - Always upload entire firmware
   - Differential updates would be complex to implement

3. **No Compression:**
   - Files are uploaded as-is
   - Compression could reduce transfer time

4. **Single UART:**
   - Update ties up communication channel
   - Cannot monitor other system functions during update

## Future Enhancements

1. **Binary Protocol:**
   - Much faster upload (10-100x)
   - Requires robust framing and error detection

2. **Differential Updates:**
   - Only upload changed sectors
   - Requires complex diffing algorithm

3. **Dual Bank Flash:**
   - Write to inactive bank
   - Swap on boot if valid
   - Allows instant rollback

4. **Compressed Updates:**
   - Reduce transfer time
   - Requires decompression on device

5. **Firmware Signing:**
   - Cryptographic verification
   - Prevent unauthorized firmware

6. **OTA via WiFi/BLE:**
   - Wireless updates
   - Requires additional hardware

## References

1. Intel HEX Format: https://en.wikipedia.org/wiki/Intel_HEX
2. STM32F4 Reference Manual: RM0090
3. HAL Flash Driver Documentation
4. Application Note AN3988: "Clock configuration tool for STM32F40xxx/41xxx microcontrollers"
5. Application Note AN2606: "STM32 microcontroller system memory boot mode"

## Appendix: Intel HEX Format Quick Reference

```
Format: :LLAAAATTDDDD...CC

Example:
:10010000214601360121470136007EFE09D21940
│││││││││││└─── Checksum
││││││└───────── Data bytes (16 bytes in this case)
││││└─────────── Record Type (00 = data)
│││└──────────── Address (0x0100)
│└───────────── Byte Count (0x10 = 16 bytes)
└────────────── Start code (:)

Record Types:
00 - Data
01 - End Of File
04 - Extended Linear Address
05 - Start Linear Address

Checksum calculation:
1. Sum all bytes (LL + AA + AA + TT + DD + ... + DD)
2. Take two's complement (negate and add 1)
3. Take least significant byte
```

## Appendix: Example Test Hex (Minimal)

```hex
:020000040800F2
:10000000001002080D010008110100080000000080
:00000001FF
```
This minimal HEX:
1. Sets extended address to 0x08000000
2. Writes 16 bytes to address 0x00000000 (interrupt vector table start)
3. End of file

## Summary

This implementation strategy provides a complete roadmap for implementing OTA firmware updates. The key is to start with the firmware-side bootloader (most critical), then enhance the backend, and finally integrate the frontend. Each phase should be thoroughly tested before moving to the next. The approach prioritizes safety and reliability over speed, ensuring that devices cannot be bricked during updates.

**Estimated Implementation Time:**
- Firmware bootloader: 16-24 hours
- Backend enhancements: 8-12 hours  
- Frontend integration: 4-6 hours
- Testing and debugging: 16-24 hours
- **Total: 44-66 hours (1-1.5 weeks)**

**Next Steps:**
1. Review this strategy with the team
2. Set up dev/test environment with STM32 board
3. Begin Step 1: Firmware bootloader implementation
4. Conduct incremental testing after each step

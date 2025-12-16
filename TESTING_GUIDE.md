# OTA Update Testing Guide

This guide walks through testing the OTA firmware update implementation step-by-step.

## Prerequisites

1. **Hardware:**
   - STM32F407VGTx development board
   - USB-to-Serial adapter or ST-Link debugger
   - Stable power supply

2. **Software:**
   - STM32CubeIDE (or arm-none-eabi-gcc toolchain)
   - Node.js and pnpm (for Electron app)
   - Serial terminal (optional, for debugging)

3. **Firmware:**
   - At least two different firmware versions to test updates

## Phase 1: Build and Flash Initial Firmware

### 1.1 Build the Firmware

```bash
cd firmware
# Open in STM32CubeIDE and build, or use command line:
# make all
```

**Expected Output:**
- `balloon_machine_v3.elf`
- `balloon_machine_v3.hex`
- `balloon_machine_v3.bin`

### 1.2 Flash via ST-Link

```bash
# Using STM32CubeProgrammer or ST-Link utility
# Flash the .hex or .elf file
```

### 1.3 Verify Basic Communication

```bash
cd ../app
pnpm dev
```

In the app:
1. Connect to device
2. Verify you can read status/config
3. Try a simple command like "GET VERSION"

**Expected:** Device responds normally, all basic functions work

## Phase 2: Unit Test - HEX Parser

### 2.1 Test Valid HEX Lines

Send these commands via serial terminal or app:

```
SET FIRMWARE_UPDATE START
```

**Expected Response:**
```
Starting firmware update...
Erasing flash sectors 4 to 10...
Flash erased successfully
UPDATE READY
```

### 2.2 Test Extended Address Record

Send:
```
:020000040800F2
```

**Expected Response:**
```
Extended address set to: 0x08000000
```

### 2.3 Test Data Record

Send:
```
:10000000001002080D010008110100080000000080
```

**Expected Response:**
- No error
- Progress updates may appear

### 2.4 Test Invalid Checksum

Send (intentionally wrong checksum):
```
:10000000001002080D010008110100080000000000
```

**Expected Response:**
```
ERROR: Checksum mismatch (expected 0x80, got 0x00)
```

### 2.5 Test EOF Record

Send:
```
:00000001FF
```

**Expected Response:**
```
UPDATE COMPLETE
Total bytes written: XXX (X KB)
```

### 2.6 Test END Command

Send:
```
SET FIRMWARE_UPDATE END
```

**Expected Response:**
```
Firmware update complete. Resetting in 1 second...
```

**Device should reset**

## Phase 3: Integration Test - Small Firmware

### 3.1 Create Minimal Test Firmware

Create a simple test program (blinky LED at different rate):

```c
// test_firmware.c
int main(void) {
    // Initialize HAL
    HAL_Init();
    SystemClock_Config();
    
    // Initialize LED GPIO
    // ...
    
    while(1) {
        // Blink at 1Hz instead of normal 2Hz
        HAL_GPIO_TogglePin(LED_GPIO_Port, LED_Pin);
        HAL_Delay(500);  // Different from normal firmware
    }
}
```

Build and generate .hex file.

### 3.2 Upload Test Firmware via GitHub

1. Create a GitHub release with version tag (e.g., "v0.0.1-test")
2. Attach the test .hex file
3. Verify download in app works

### 3.3 Upload via OTA

In the app:
1. Go to Settings → Firmware Update
2. Select "v0.0.1-test"
3. Click "Download" (if not already downloaded)
4. Click "Upload to Device"
5. Monitor progress

**Expected Console Output:**
```
[Firmware] Sending start command...
[Firmware] Waiting for device...
[Firmware] Device ready. Starting upload...
[Firmware] Upload complete.
[Firmware] Waiting for completion confirmation...
[Firmware] Firmware update successful.
```

**On Device (via serial monitor):**
```
Starting firmware update...
Erasing flash sectors 4 to 10...
Flash erased successfully
UPDATE READY
Extended address set to: 0x08000000
Progress: 1 KB written
Progress: 2 KB written
...
UPDATE COMPLETE
Total bytes written: XXXXX (XXX KB)
Firmware update complete. Resetting in 1 second...
```

### 3.4 Verify New Firmware

After reset:
- Device should boot
- LED should blink at new rate (1Hz)
- Device should respond to commands
- Check version: "GET VERSION"

## Phase 4: Integration Test - Full Firmware

### 4.1 Build Full Firmware

Build the complete production firmware with a version increment.

### 4.2 Create GitHub Release

1. Tag: e.g., "v1.0.1"
2. Attach .hex file
3. Add release notes

### 4.3 Download and Upload

Same steps as Phase 3.3, but with full firmware.

**Note:** This will take longer (~30-60 minutes depending on size).

### 4.4 Verify Functionality

After update:
1. Check all sensors work
2. Test heater controls
3. Verify PID loops function
4. Test manual controls
5. Check configuration persistence

## Phase 5: Error Scenario Testing

### 5.1 Test Disconnection During Update

1. Start firmware update
2. After 10% progress, disconnect USB cable
3. Reconnect and try again

**Expected:**
- App shows error
- Device aborts update
- Device should still boot (old firmware intact if not overwritten yet)

### 5.2 Test Invalid HEX File

1. Create a corrupted .hex file:
   - Modify some bytes randomly
   - Save as test-corrupted.hex

2. Try to upload

**Expected:**
- Checksum errors detected
- Update aborted
- Device remains in safe state

### 5.3 Test Abort Command

1. Start firmware update
2. Send: `SET FIRMWARE_UPDATE ABORT`

**Expected Response:**
```
Firmware update aborted
```

Device returns to IDLE state.

### 5.4 Test Address Out of Range

Manually send a HEX line with invalid address:

```
:10FFFF00001002080D010008110100080000000080
```

**Expected Response:**
```
ERROR: Address 0xFFFFFFFF out of range
```

### 5.5 Test Power Loss Simulation

**WARNING: Only do this on a test board!**

1. Start firmware update
2. Cut power at 50% progress
3. Restore power
4. Device should boot to old firmware (or fail safely)
5. Retry update

## Phase 6: Performance Testing

### 6.1 Measure Upload Speed

1. Use a large firmware file (~500KB)
2. Time the upload process
3. Calculate: bytes/second

**Expected:** ~160 bytes/second (10 lines/sec × 16 bytes/line)

### 6.2 Optimize Upload Delay

In `app/src/lib/serial.ts`, line 572:

```typescript
await new Promise((resolve) => setTimeout(resolve, 20))
```

Try different delays:
- 10ms (faster, may cause errors)
- 15ms (good balance)
- 20ms (current, safe)
- 50ms (slow but very reliable)

Record which works best for your setup.

### 6.3 Measure Flash Operations

Monitor serial output for timing:
- Flash erase time: Should be ~10-15 seconds
- Time between progress updates (1KB): Should be ~6 seconds

## Phase 7: Stress Testing

### 7.1 Consecutive Updates

Upload firmware 5 times in a row without issues.

**Expected:** All succeed, no accumulated errors

### 7.2 Different Firmware Versions

Alternate between two different firmwares:
1. Upload v1.0.0
2. Verify it works
3. Upload v1.0.1
4. Verify it works
5. Upload v1.0.0 again
6. Verify it works

**Expected:** All transitions succeed

### 7.3 Config Persistence

1. Set custom configuration values
2. Upload new firmware
3. Verify config values are preserved

**Expected:** Configuration data in sectors 2-3 remains intact

## Debugging Tips

### Enable Verbose Logging

In `bootloader.c`, uncomment debug statements:

```c
// After each flash write:
usb_printf("Wrote %d bytes to 0x%08lX\r\n", length, address);
```

### Monitor Flash Status

Add after erase/write operations:

```c
uint32_t error = HAL_FLASH_GetError();
usb_printf("Flash error code: 0x%08lX\r\n", error);
```

### Check Memory Usage

After upload completes, read back flash:

```c
uint32_t* ptr = (uint32_t*)0x08010000;  // Start of sector 4
usb_printf("First word: 0x%08lX\r\n", *ptr);
```

### Serial Monitor

Use a serial terminal alongside the app:
- Baud: 115200
- Data bits: 8
- Stop bits: 1
- Parity: None

## Common Issues and Solutions

### Issue: "Device did not enter bootloader mode"

**Possible Causes:**
- Device not responding to commands
- UART connection issue
- Firmware not handling command

**Solutions:**
1. Check serial connection (baud rate, port)
2. Verify command handler is called in utils.c
3. Check if device is busy (try after reset)

### Issue: "Flash erase failed"

**Possible Causes:**
- Flash locked
- Write protection enabled
- Sectors in use

**Solutions:**
1. Ensure HAL_FLASH_Unlock() is called
2. Check sector numbers are correct
3. Verify no code is running from those sectors

### Issue: "Checksum mismatch"

**Possible Causes:**
- Data corruption during transfer
- Parsing error
- Wrong HEX file format

**Solutions:**
1. Reduce transfer speed (increase delay)
2. Verify HEX file integrity
3. Check parsing logic

### Issue: "Device doesn't boot after update"

**Possible Causes:**
- Incomplete upload
- Vector table corrupted
- Stack pointer invalid

**Solutions:**
1. Verify entire HEX file was sent
2. Check first bytes at 0x08000000 (stack pointer)
3. Re-flash via ST-Link
4. Check linker script addresses

### Issue: "Upload extremely slow"

**Possible Causes:**
- Large inter-line delays
- Flash write delays
- RTOS task scheduling

**Solutions:**
1. Reduce delay in serial.ts (line 572)
2. Remove optional ACKs
3. Optimize flash writes (use 64-bit when possible)

## Success Criteria

The OTA update implementation is considered successful when:

- ✅ Device accepts START command and erases flash
- ✅ HEX lines are parsed correctly with checksum validation
- ✅ Data is written to flash without errors
- ✅ Progress updates are sent regularly
- ✅ EOF record triggers completion
- ✅ Device resets and boots new firmware
- ✅ All device functionality works after update
- ✅ Configuration is preserved
- ✅ Error conditions are handled gracefully
- ✅ Multiple consecutive updates succeed
- ✅ Upload completes in reasonable time (<60 min for 500KB)

## Next Steps After Testing

Once basic OTA is working:

1. **Add UI Progress Bar:** Show upload percentage in settings dialog
2. **Implement Retry Logic:** Auto-retry failed lines
3. **Add Verification:** Read back and verify written data
4. **Improve Speed:** Consider binary protocol or larger chunks
5. **Add Signing:** Cryptographic verification of firmware
6. **Dual Bank:** Use dual bank flash for safer updates
7. **Differential Updates:** Only update changed sectors

## Test Log Template

Use this template to document your testing:

```
Date: ____________________
Tester: __________________
Firmware Version: ________
App Version: _____________

Test Results:
[ ] Phase 1: Build and Flash - PASS / FAIL
    Notes: ___________________________

[ ] Phase 2: Unit Tests - PASS / FAIL
    Notes: ___________________________

[ ] Phase 3: Small Firmware - PASS / FAIL
    Upload Time: ______ seconds
    Notes: ___________________________

[ ] Phase 4: Full Firmware - PASS / FAIL
    Upload Time: ______ seconds
    Notes: ___________________________

[ ] Phase 5: Error Scenarios - PASS / FAIL
    Notes: ___________________________

[ ] Phase 6: Performance - PASS / FAIL
    Upload Speed: ______ bytes/sec
    Notes: ___________________________

[ ] Phase 7: Stress Testing - PASS / FAIL
    Notes: ___________________________

Overall Result: PASS / FAIL

Issues Found:
1. ________________________________
2. ________________________________
3. ________________________________

Recommendations:
1. ________________________________
2. ________________________________
3. ________________________________
```

## Support

If you encounter issues:

1. Check the console logs (both app and serial)
2. Review the implementation in bootloader.c
3. Verify HEX file format
4. Test with ST-Link programmer first
5. Consult STM32 HAL documentation
6. Review Intel HEX specification

Good luck with testing! 🚀

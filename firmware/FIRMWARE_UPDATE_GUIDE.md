# Firmware Update Guide

## Overview

This firmware uses an **in-application OTA (Over-The-Air) update mechanism**. This is NOT a traditional dual-bank bootloader. The device updates itself while running.

## Architecture

### What This Is
- Single firmware image running from address 0x08000000
- Self-update capability via UART
- Intel HEX format support
- Flash sectors 0-10 are updateable (896KB total)
- Flash sector 11 reserved for configuration (128KB, never touched)

### What This Is NOT
- NOT a separate bootloader in protected flash
- NOT dual-bank firmware architecture  
- NOT STM32's built-in DFU bootloader
- NO automatic recovery from failed updates

## Memory Layout

```
STM32F407VGTx Flash Memory (1024KB total):

Sector  | Address Range        | Size   | Usage
--------|---------------------|--------|------------------------
0       | 0x08000000-0x08003FFF | 16KB   | Vector table, startup
1       | 0x08004000-0x08007FFF | 16KB   | Firmware code
2       | 0x08008000-0x0800BFFF | 16KB   | Firmware code (EEPROM emulation also here)
3       | 0x0800C000-0x0800FFFF | 16KB   | Firmware code
4       | 0x08010000-0x0801FFFF | 64KB   | Firmware code
5       | 0x08020000-0x0803FFFF | 128KB  | Firmware code
6       | 0x08040000-0x0805FFFF | 128KB  | Firmware code
7       | 0x08060000-0x0807FFFF | 128KB  | Firmware code
8       | 0x08080000-0x0809FFFF | 128KB  | Firmware code
9       | 0x080A0000-0x080BFFFF | 128KB  | Firmware code
10      | 0x080C0000-0x080DFFFF | 128KB  | Firmware code
11      | 0x080E0000-0x080FFFFF | 128KB  | Configuration (PRESERVED)
```

## Update Process

### Step-by-Step

1. **Device runs normally**
   - Firmware operates from 0x08000000
   - All functionality available

2. **Initiate update** (via UART)
   ```
   FIRMWARE_UPDATE=START
   ```
   - Device suspends non-essential RTOS tasks
   - Erases sectors 0-10 (takes ~30 seconds)
   - **⚠️ POINT OF NO RETURN: Device is now partially erased**
   - Enters RECEIVING state

3. **Send firmware data**
   - Send Intel HEX file line by line
   - Device writes to flash and validates each write
   - Progress updates every 16KB
   - Example HEX line: `:10010000214601360121470136007EFE09D2190140`

4. **Complete update**
   ```
   FIRMWARE_UPDATE=END
   ```
   - Device validates vector table
   - Performs system reset
   - New firmware boots

### Abort Update

```
FIRMWARE_UPDATE=ABORT
```

**⚠️ WARNING**: If sectors were already erased, the device is bricked and requires SWD/JTAG recovery!

## Safety Mechanisms

### Validations Performed

1. **Address Range Check**: Prevents writes outside valid flash
2. **Config Sector Protection**: Prevents writes to sector 11
3. **Minimum Size Check**: Firmware must be at least 16KB
4. **Vector Table Validation**: Checks stack pointer is in valid RAM range
5. **Reset Vector Check**: Verifies reset vector points to flash

### Error Handling

- Parse errors → abort to ERROR state
- Flash write errors → abort to ERROR state  
- Address out of range → abort to ERROR state
- Config sector write attempt → abort to ERROR state

## Risks and Limitations

### ⚠️ CRITICAL RISKS

1. **Bricking Risk**: If update interrupted after erase starts:
   - Power loss during erase/write
   - UART disconnection during transfer
   - Invalid firmware data
   - **Result**: Device BRICKED, requires SWD/JTAG programmer

2. **No Recovery Mechanism**:
   - No fallback firmware
   - No automatic rollback
   - No safe boot mode

3. **No Boot Loops**:
   - Update mode must be explicitly requested each time
   - No persistent boot flags
   - No automatic update retry

### Mitigation Strategies

**Before Starting Update:**
- [ ] Verify stable power supply (battery or stable AC)
- [ ] Test UART connection reliability
- [ ] Have complete HEX file ready
- [ ] Have SWD/JTAG programmer available for recovery
- [ ] Test new firmware in development environment first

**During Update:**
- [ ] Do NOT disconnect power
- [ ] Do NOT disconnect UART
- [ ] Monitor progress messages
- [ ] Wait for "UPDATE COMPLETE" confirmation

**After Update:**
- [ ] Verify device boots successfully
- [ ] Test all functionality
- [ ] Keep previous firmware backup for recovery

## Comparison with Traditional Bootloader

| Feature | This Implementation | Traditional Bootloader |
|---------|-------------------|----------------------|
| Separate bootloader code | ❌ No | ✅ Yes |
| Protected boot region | ❌ No | ✅ Yes (can't be overwritten) |
| Recovery from failed update | ❌ No | ✅ Yes (can rollback) |
| Update while running | ✅ Yes | ❌ No (bootloader updates app) |
| Complexity | Low | High |
| Flash overhead | None | 32-64KB for bootloader |
| Brick risk | ⚠️ HIGH | Low |

## Development Recommendations

### For Future Improvements

If brick risk is unacceptable, consider implementing a true dual-bank bootloader:

1. **Create Separate Bootloader Project**:
   - Small bootloader in sectors 0-1 (32KB)
   - Handles update logic
   - Never erased during updates

2. **Modify Application**:
   - Relocate to start at sector 4 (0x08010000)
   - Update linker script
   - Set VTOR offset

3. **Implement Boot Magic**:
   - Use RTC backup registers
   - Persistent flag survives reset
   - Bootloader checks flag at startup

4. **Add Safety Features**:
   - CRC verification of new firmware
   - Dual firmware slots (A/B)
   - Automatic rollback on boot failure

### Intel HEX File Generation

Firmware must be compiled to start at 0x08000000. In STM32CubeIDE:

1. Build project normally
2. Generate HEX file (usually automatic)
3. Or use objcopy:
   ```bash
   arm-none-eabi-objcopy -O ihex firmware.elf firmware.hex
   ```

## Troubleshooting

### Device Bricked After Update

**Symptoms**: Device doesn't boot, no UART response

**Recovery**:
1. Connect ST-LINK or J-Link via SWD
2. Use STM32CubeProgrammer or OpenOCD
3. Erase chip
4. Flash working firmware via SWD
5. Reset device

### Update Stuck in RECEIVING State

**Possible Causes**:
- Missing Intel HEX EOF record (`:00000001FF`)
- Communication timeout
- Invalid HEX format

**Solution**:
1. Send complete HEX file with EOF record
2. Or send `FIRMWARE_UPDATE=ABORT` and retry

### "Invalid stack pointer" Warning

**Cause**: New firmware may be corrupt or for wrong address

**Action**:
- Send `FIRMWARE_UPDATE=ABORT` to cancel
- Or send `FIRMWARE_UPDATE=END` to proceed anyway (risky!)

## Example Update Session

```
> FIRMWARE_UPDATE=START

========================================
   FIRMWARE UPDATE - DANGER ZONE
========================================
WARNING: This will erase ALL firmware!
WARNING: Device will BRICK if interrupted!
- Ensure stable power supply
- Ensure reliable UART connection
- Do NOT disconnect during update

Sectors to erase: 0-10 (896KB)
Config sector 11: PRESERVED

This will take ~30 seconds...
========================================

Erasing flash sectors...
Flash erased successfully

========================================
UPDATE READY - Send Intel HEX data now
========================================

> :020000040800F2
Extended address set to: 0x08000000

> :10000000002001200D030008B1020008B5020008C3
Progress: 0 KB written

> :10001000B9020008BD020008000000000000000094
Progress: 16 KB written

[... many more HEX lines ...]

> :00000001FF
UPDATE COMPLETE
Total bytes written: 245760 (240 KB)
Stack pointer: 0x20020000
Reset vector: 0x0800030D

> FIRMWARE_UPDATE=END

========================================
   FIRMWARE UPDATE SUCCESSFUL
========================================
Total bytes written: 245760 (240 KB)
Update duration: 42 seconds
Resetting device in 2 seconds...
========================================

[Device resets and boots new firmware]
```

## Contact

For questions or issues related to firmware updates, contact the development team.

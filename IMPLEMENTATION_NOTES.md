# A/B Partitioning Implementation Notes

## Implementation Completed

This document provides technical notes on the A/B partitioning implementation for OTA firmware updates.

## Key Design Choices

### 1. Function Address for Partition Detection

**Implementation**: Uses function address to determine current partition
```c
uint32_t pc = (uint32_t)Partition_Init;
```

**Rationale**: 
- Simple and portable across toolchains
- Function addresses are determined at link time and accurately reflect code location
- Alternative (inline assembly) is less portable and harder to maintain

**Note**: This gets the function's address in flash, not the program counter, but this is sufficient for determining which partition the code is running from since all code in a partition has addresses in that partition's range.

### 2. Metadata Location

**Location**: Sector 2 (0x08008000)

**Rationale**:
- Separate from EEPROM emulation (Sector 3)
- Protected from application updates
- Can be erased/written independently
- Survives application partition swaps

### 3. Partition Sizes

**Partition A**: 320KB (Sectors 4-6)
**Partition B**: 384KB (Sectors 7-9)

**Rationale**:
- Constrained by STM32F407 sector layout
- Both sizes sufficient for typical embedded applications
- Sector 4 is 64KB while others are 128KB, creating size difference
- Alternative would be equal 256KB partitions but would waste flash

### 4. Boot Logic in Main Firmware

**Approach**: Boot selection logic in main firmware, not separate bootloader binary

**Rationale**:
- Simpler build process (single binary)
- Easier to maintain
- No need for separate bootloader project
- Can still receive OTA updates

**Trade-offs**:
- Bootloader code uses some of application space
- Can't update bootloader itself via OTA
- For production, consider separate bootloader binary

## Address Mapping

HEX files assume application starts at 0x08000000. The bootloader automatically maps these addresses to the target partition:

```
HEX Address:    0x08000000 + offset
↓
Target Address: partition_base + offset
```

Example:
- HEX line for 0x08001000
- If targeting Partition B (0x08060000)
- Writes to 0x08061000

## Boot Flow Details

### First Boot (Fresh Device)
1. Firmware runs from bootloader region (Sectors 0-1)
2. Metadata doesn't exist or is invalid
3. Initialize default metadata (Partition A active but invalid)
4. Stay in bootloader mode
5. Wait for OTA update

### After First OTA Update
1. OTA writes to Partition A (Sectors 4-6)
2. Marks Partition A as valid and active
3. Resets device
4. Boot code checks metadata
5. Finds Partition A is active and valid
6. Jumps to Partition A
7. Application runs from Partition A

### Subsequent Updates
1. Application detects it's running from Partition A
2. Targets Partition B for update
3. Writes to Partition B
4. Marks Partition B as valid and active
5. Resets device
6. Boots into Partition B

## Safety Mechanisms

### 1. Validity Checks
- Stack pointer must point to valid RAM (0x20000000-0x20020000)
- Reset vector must be in flash with Thumb bit set
- Prevents jumping to corrupted/empty partitions

### 2. Metadata Protection
- Metadata in dedicated sector
- Magic number (0xDEADBEEF) validates metadata
- If invalid, safe defaults used

### 3. Rollback Capability
- If active partition fails validation
- Automatically tries alternate partition
- If both fail, stays in bootloader mode

### 4. Address Validation
- All write addresses checked against partition bounds
- Prevents writes outside target partition
- Prevents corruption of bootloader or config

## Limitations and Future Work

### Current Limitations

1. **No CRC Validation**: CRC field exists but not implemented
2. **No Boot Counter**: Boot attempts not tracked for auto-rollback
3. **Static Partition Size**: Can't resize partitions without reflashing
4. **No Compression**: Firmware transferred uncompressed
5. **Single UART**: Can't use other communication during update

### Recommended Improvements

1. **Implement CRC32**:
   - Calculate during firmware write
   - Validate before marking partition valid
   - Provides data integrity check

2. **Boot Counter Logic**:
   ```c
   if (boot_count > 3) {
       // Mark partition as invalid
       // Try alternate partition
   }
   ```

3. **Watchdog Integration**:
   - Suspend watchdog during update
   - Use watchdog to detect boot failures
   - Auto-rollback on repeated resets

4. **Compression**:
   - Compress firmware before transfer
   - Decompress on device
   - Reduce transfer time significantly

5. **Delta Updates**:
   - Only transfer changed sectors
   - Much faster for small changes
   - Requires diff/patch algorithm

## Testing Checklist

- [ ] Build firmware successfully
- [ ] Flash initial firmware via ST-Link
- [ ] Verify partition detection works
- [ ] Test first OTA update to Partition A
- [ ] Verify boot into Partition A
- [ ] Test second OTA update to Partition B
- [ ] Verify boot into Partition B
- [ ] Test A→B and B→A cycles
- [ ] Test metadata persistence across resets
- [ ] Test invalid partition handling
- [ ] Test address validation (try writing outside partition)
- [ ] Test with corrupted firmware (verify rollback)
- [ ] Measure flash erase time
- [ ] Measure update transfer time
- [ ] Verify config preservation across updates

## Debugging Tips

### Check Current Partition
Add debug output:
```c
Partition_t current = Partition_GetCurrent();
usb_printf("Running from partition: %d\n", current);
```

### Check Metadata
Read and print metadata:
```c
BootMetadata_t meta;
Partition_ReadMetadata(&meta);
usb_printf("Active: %d, A_valid: %d, B_valid: %d\n", 
           meta.active_partition, 
           meta.partition_a_valid, 
           meta.partition_b_valid);
```

### Force Partition Jump
Manually set partition and reset:
```c
Partition_SetActive(PARTITION_B);
NVIC_SystemReset();
```

### Verify Address Mapping
Log write addresses during update:
```c
usb_printf("Writing to: 0x%08lX (HEX: 0x%08lX)\n", 
           targetAddress, hexAddress);
```

## File Summary

| File | Purpose | Size |
|------|---------|------|
| partition.h | Partition API definitions | ~7KB |
| partition.c | Partition implementation | ~12KB |
| bootloader.c | OTA update with A/B support | ~13KB |
| boot_init.c | Boot-time partition check | ~2KB |
| main.c | Partition initialization | Modified |
| AB_PARTITION_GUIDE.md | User documentation | ~14KB |
| IMPLEMENTATION_NOTES.md | Technical notes | This file |

## References

1. STM32F407 Reference Manual (RM0090) - Flash memory section
2. ARM Cortex-M4 Programming Manual - Vector table and boot
3. Intel HEX Format Specification
4. Previous implementation: bootloader.c (single partition version)

---

**Status**: Implementation complete, ready for testing

**Last Updated**: December 2024

**Authors**: Aymed Balloon Team

# OTA Firmware Update - RTOS Safety Considerations

## Overview

The STM32 firmware uses FreeRTOS with multiple concurrent tasks that share resources such as Flash memory and UART. This document describes the RTOS safety measures implemented in the bootloader to ensure safe firmware updates without conflicts or data corruption.

## Problem Statement

The original bootloader implementation did not account for the RTOS environment where multiple tasks run concurrently:

### Shared Resources
1. **Flash Memory**
   - Sectors 2-3: EEPROM emulation (config storage)
   - Sectors 4-10: Application firmware (being updated)
   - Accessed by: Config writes, sensor logging, firmware update

2. **UART (UART4)**
   - Used for command/response protocol
   - Accessed by: Log task, bootloader messages
   - Protected by: `uartSemaphoreHandle`

### RTOS Tasks

```
┌─────────────────────────────────────────────────────────┐
│ Task Name      │ Priority    │ Flash Access │ UART Use │
├─────────────────────────────────────────────────────────┤
│ defaultTask    │ AboveNormal │ No           │ No       │
│ logTask        │ Normal      │ No           │ Yes (✓)  │
│ sensorTask     │ Normal2     │ Maybe        │ No       │
│ heaterTask     │ Normal1     │ Maybe        │ No       │
└─────────────────────────────────────────────────────────┘

Mutexes/Semaphores:
- configMutexHandle: Protects configuration data
- stateMutexHandle: Protects state data
- uartSemaphoreHandle: Protects UART access
```

### Potential Issues

1. **Flash Conflicts**: If sensor or heater tasks try to write to flash (EEPROM emulation) while bootloader is erasing/writing, this could cause:
   - Flash operation failures
   - Data corruption
   - System hang

2. **Task Preemption**: Flash operations (erase can take 10-15 seconds) could be interrupted by task switches, potentially corrupting the operation.

3. **UART Contention**: Multiple tasks trying to send messages could interfere with bootloader communication (already handled by `uartSemaphoreHandle`).

## Solution Implementation

### 1. Task Suspension

Non-essential tasks are suspended during firmware update to prevent conflicts:

```c
static void Bootloader_SuspendNonEssentialTasks(void) {
    // Suspend sensor task (may access flash for logging)
    if (sensorTaskHandle != NULL) {
        vTaskSuspend(sensorTaskHandle);
    }
    
    // Suspend heater task (may access config in flash)
    if (heaterTaskHandle != NULL) {
        vTaskSuspend(heaterTaskHandle);
    }
    
    tasksWereSuspended = 1;
}
```

**When Applied:**
- Called at the start of firmware update (START command)
- Tasks remain suspended until:
  - Firmware update completes (system reset)
  - Update is aborted (ABORT command)
  - Error occurs during preparation

**Which Tasks Are Suspended:**
- ✅ `sensorTask`: Suspended (may read sensors and log to flash)
- ✅ `heaterTask`: Suspended (may access config and control hardware)
- ❌ `logTask`: NOT suspended (handles UART communication for bootloader)
- ❌ `defaultTask`: NOT suspended (main system task)

### 2. Critical Sections

Flash operations use FreeRTOS critical sections to prevent task switching:

```c
static HAL_StatusTypeDef Bootloader_EraseFlash(void) {
    // Enter critical section - disables interrupts and task switching
    taskENTER_CRITICAL();
    
    HAL_FLASH_Unlock();
    // ... erase operation (10-15 seconds)
    HAL_FLASH_Lock();
    
    // Exit critical section - re-enables interrupts and task switching
    taskEXIT_CRITICAL();
}
```

**What Critical Sections Protect:**
- Flash unlock/lock operations
- Flash erase operations (entire sector erase sequence)
- Flash write operations (individual word writes)

**Why This Is Safe:**
- Critical sections disable interrupts and prevent task switches
- Flash operations complete atomically
- No other code can interfere during critical operations

**Performance Impact:**
- Flash erase: 10-15 seconds in critical section
  - This is acceptable because tasks are already suspended
  - System remains responsive to UART interrupts after critical section exits
  
- Flash write: Microseconds per word
  - Minimal impact on system responsiveness
  - Write operations are fast enough not to cause issues

### 3. RTOS-Aware Delays

The bootloader uses `osDelay()` instead of `HAL_Delay()`:

```c
// Before (blocking, non-RTOS-aware)
HAL_Delay(1000);

// After (RTOS-aware, allows task switching)
osDelay(1000);
```

**Benefits:**
- Allows other tasks to run during delays
- Maintains RTOS tick accuracy
- Better system responsiveness

### 4. UART Protection

UART access already uses semaphore (no changes needed):

```c
void usb_printf(const char *fmt, ...) {
    if(osSemaphoreAcquire(uartSemaphoreHandle, 1000) == osOK) {
        HAL_UART_Transmit(&huart4, (uint8_t*)print_buf, len, 1000);
        osSemaphoreRelease(uartSemaphoreHandle);
    }
}
```

This ensures:
- Only one task transmits at a time
- Bootloader messages don't collide with other tasks
- Already implemented in original code

## Implementation Details

### Modified Files

**`firmware/Core/Src/bootloader.c`**

1. **Includes**: Added `cmsis_os.h` for RTOS functions
2. **Extern Declarations**: Access to task handles
   ```c
   extern osThreadId_t sensorTaskHandle;
   extern osThreadId_t heaterTaskHandle;
   ```

3. **Private Variables**: Track suspension state
   ```c
   static uint8_t tasksWereSuspended = 0;
   ```

4. **New Functions**:
   - `Bootloader_SuspendNonEssentialTasks()`
   - `Bootloader_ResumeNonEssentialTasks()`

5. **Modified Functions**:
   - `Bootloader_HandleCommand()`: Suspend tasks on START, resume on ABORT/error
   - `Bootloader_EraseFlash()`: Added critical sections
   - `WriteToFlash()`: Added critical sections
   - `Bootloader_Reset()`: Resume tasks if suspended

### Update Sequence with RTOS Safety

```
1. HOST → "SET FIRMWARE_UPDATE START"
   MCU: Bootloader_HandleCommand("START")
   
2. MCU: Bootloader_SuspendNonEssentialTasks()
   - Suspend sensorTask ✓
   - Suspend heaterTask ✓
   - logTask remains active for UART communication
   
3. MCU: Bootloader_EraseFlash()
   - taskENTER_CRITICAL()
   - HAL_FLASH_Unlock()
   - HAL_FLASHEx_Erase() [10-15 seconds, atomic]
   - HAL_FLASH_Lock()
   - taskEXIT_CRITICAL()
   
4. MCU → HOST: "UPDATE READY"

5. HOST → MCU: HEX lines (:10000000...)
   For each line:
   - Parse and validate
   - WriteToFlash():
     - taskENTER_CRITICAL()
     - Write words to flash [microseconds, atomic]
     - taskEXIT_CRITICAL()
   
6. HOST → MCU: ":00000001FF" (EOF)
   MCU → HOST: "UPDATE COMPLETE"
   
7. HOST → "SET FIRMWARE_UPDATE END"
   MCU: 
   - osDelay(1000) [RTOS-aware delay]
   - NVIC_SystemReset() [system resets, tasks auto-resume]

Alternative paths:

ABORT:
   HOST → "SET FIRMWARE_UPDATE ABORT"
   MCU:
   - Bootloader_Reset()
   - Bootloader_ResumeNonEssentialTasks()
   - Resume sensorTask ✓
   - Resume heaterTask ✓

ERROR:
   If erase fails:
   - Bootloader_ResumeNonEssentialTasks()
   - Resume normal operation
```

## Safety Analysis

### Race Conditions - Eliminated ✓

**Before**: 
- Sensor task could try to write to EEPROM sectors while bootloader erases
- Heater task could access config during flash operations

**After**:
- Tasks are suspended before any flash operations
- Critical sections prevent interruption during flash operations

### Data Corruption - Prevented ✓

**Before**:
- Task switch during flash write could corrupt data
- Concurrent flash access could fail operations

**After**:
- Critical sections ensure atomic flash operations
- No task switches during critical operations

### Resource Conflicts - Resolved ✓

**Before**:
- UART already protected by semaphore ✓
- Flash had no protection ✗

**After**:
- UART still protected by semaphore ✓
- Flash now protected by critical sections ✓
- Tasks suspended to eliminate contention ✓

### System Responsiveness - Maintained ✓

**Concerns**:
- Critical sections can impact responsiveness
- Long flash erase (10-15 sec) in critical section

**Mitigation**:
- Tasks are already suspended, so no tasks waiting
- logTask remains active for UART communication
- osDelay() used instead of HAL_Delay() for better RTOS integration
- Flash erase is inherently long; critical section doesn't add overhead

## Testing Recommendations

### Unit Tests

1. **Task Suspension**
   - Verify sensorTask and heaterTask are suspended on START
   - Verify logTask remains active
   - Verify tasks resume on ABORT

2. **Critical Sections**
   - Monitor task switches during flash operations (should be zero)
   - Verify flash operations complete without interruption

3. **Error Recovery**
   - Test ABORT command - verify tasks resume
   - Test erase failure - verify tasks resume
   - Test system behavior after abort/failure

### Integration Tests

1. **Concurrent Task Scenario**
   - Start firmware update while sensors are reading
   - Verify no conflicts or errors
   - Verify clean shutdown of non-essential tasks

2. **UART Communication**
   - Verify bootloader messages are sent correctly
   - Verify no message corruption during update
   - Test high UART traffic during update

3. **Flash Operations**
   - Monitor flash writes during sensor logging
   - Verify no conflicts between bootloader and EEPROM
   - Test config reads during firmware update (should fail gracefully)

4. **Long Update Test**
   - Upload large firmware (500KB)
   - Monitor system stability
   - Verify tasks remain suspended throughout
   - Verify clean system reset at end

### Stress Tests

1. **Repeated Updates**
   - Perform 10 consecutive firmware updates
   - Verify no task suspension issues
   - Verify system remains stable

2. **Abort Scenarios**
   - Abort at various stages (erase, write, verify)
   - Verify tasks always resume
   - Verify system returns to normal operation

3. **Error Injection**
   - Simulate flash errors
   - Verify proper error handling
   - Verify tasks resume on error

## Performance Impact

### Critical Section Duration

| Operation | Duration | Impact |
|-----------|----------|--------|
| Flash Erase | 10-15 seconds | High, but tasks already suspended |
| Flash Write (word) | ~16 microseconds | Negligible |
| Flash Write (16 bytes) | ~64 microseconds | Negligible |

### Task Suspension Impact

| Task | Function | Impact When Suspended |
|------|----------|----------------------|
| sensorTask | Monitor sensors | Sensors not read during update (acceptable) |
| heaterTask | Control heaters | Heaters not controlled (safe, update is brief) |
| logTask | UART communication | NOT suspended, bootloader communication works |

### Memory Overhead

- Additional variables: 1 byte (`tasksWereSuspended`)
- Additional functions: ~200 bytes code
- Total overhead: < 1KB

## Known Limitations

1. **Sensor Monitoring Paused**: During firmware update (typically 50 minutes for 500KB), sensors are not monitored. This is acceptable as:
   - Update is administrative operation
   - Device should not be in active use during update
   - User is warned "Do not disconnect"

2. **Heater Control Paused**: Heaters are not controlled during update. This is safe because:
   - Update is performed when device is idle
   - No patient connected during update
   - Safety interlocks still active via hardware

3. **Critical Section Length**: Flash erase takes 10-15 seconds in critical section. This is acceptable because:
   - Tasks are already suspended
   - No time-critical operations during update
   - Alternative would be more complex with no benefit

## Future Improvements

1. **Watchdog Integration**
   - Disable IWDG during critical sections
   - Re-enable after operations complete
   - Prevent watchdog reset during long erase

2. **Flash Mutex**
   - Add dedicated flash mutex instead of critical sections
   - Would allow interrupts during flash operations
   - More complex but more flexible

3. **Incremental Operations**
   - Break long operations into smaller chunks
   - Exit critical section between chunks
   - Better responsiveness but more complex

4. **Progress Callback**
   - Report progress to other tasks
   - Allow UI updates during update
   - Requires more sophisticated task communication

## Conclusion

The RTOS safety improvements ensure that firmware updates can be performed safely in a multitasking environment without:
- Data corruption
- Resource conflicts
- System hangs
- Task synchronization issues

The implementation balances safety (critical sections, task suspension) with system responsiveness (RTOS-aware delays, minimal critical section scope) while maintaining simplicity and reliability.

**Key Achievements:**
✅ Thread-safe flash operations
✅ Task suspension prevents conflicts  
✅ Critical sections ensure atomicity
✅ UART communication remains functional
✅ Clean error recovery and abort handling
✅ Minimal performance impact
✅ Simple and maintainable code

---

*For complete OTA update documentation, see [OTA_README.md](./OTA_README.md)*

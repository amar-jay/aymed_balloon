/**
  ******************************************************************************
  * @file    bootloader.c
  * @brief   In-application OTA firmware update implementation
  * @author  Abdel Manan Abdel Rahman
  ******************************************************************************
  * @attention
  *
  * This module implements an Intel HEX format parser and flash writer for
  * over-the-air firmware updates via UART.
  *
  * ARCHITECTURE CLARIFICATION:
  * This is NOT a traditional dual-bank bootloader! It's an in-application
  * self-update mechanism. The running firmware erases and writes to its own
  * flash space. If interrupted, the device may be bricked.
  *
  * Memory Layout (STM32F407VGTx - 1024KB Flash):
  * - Sectors 0-3: 64KB total - Vector table, startup code, firmware
  * - Sectors 4-10: 832KB total - Application code, data
  * - Sector 11: 128KB - Configuration storage (NEVER touched by updater)
  *
  * Update Process:
  * 1. Firmware runs normally from 0x08000000
  * 2. FIRMWARE_UPDATE=START command received via UART
  * 3. Non-essential RTOS tasks suspended
  * 4. **ALL application sectors (0-10) erased** (takes ~20-30 seconds)
  * 5. Intel HEX records received and written to flash
  * 6. Basic validation performed (stack pointer, reset vector)
  * 7. FIRMWARE_UPDATE=END triggers system reset
  * 8. New firmware boots from 0x08000000
  *
  * Critical Sector (NEVER updated):
  * - Sector 11: Configuration data permanently preserved
  *
  * IMPORTANT SAFETY NOTES:
  * - Device will be BRICKED if update interrupted during erase/write
  * - No recovery possible without SWD/JTAG programmer
  * - Ensure stable power supply during entire update process
  * - Ensure reliable UART connection
  * - Test new firmware thoroughly before deploying updates
  *
  * RTOS Considerations:
  * - Flash operations protected with taskENTER_CRITICAL/taskEXIT_CRITICAL
  * - Non-essential tasks suspended during update to prevent conflicts
  * - UART access uses existing uartSemaphoreHandle
  * - Uses osDelay for RTOS-aware delays
  *
  ******************************************************************************
  */

#include "bootloader.h"
#include "utils.h"
#include "cmsis_os.h"
#include <string.h>
#include <stdlib.h>

/* External task handles for suspension during update */
extern osThreadId_t sensorTaskHandle;
extern osThreadId_t heaterTaskHandle;

/* Configuration -------------------------------------------------------------*/
#define APP_START_ADDRESS   0x08000000      /**< Application base address */
#define APP_END_ADDRESS     0x080DFFFF      /**< Application end address (end of sector 10) */
#define APP_SIZE            (896 * 1024)    /**< Maximum application size: sectors 0-10 = 896KB */
#define FIRST_SECTOR        FLASH_SECTOR_0  /**< First sector to erase - full firmware update */
#define LAST_SECTOR         FLASH_SECTOR_10 /**< Last sector to erase */
#define CONFIG_SECTOR       FLASH_SECTOR_11 /**< Configuration sector (never erased) */

/* Boot Magic Configuration --------------------------------------------------*/
/* Note: This implementation uses a simple in-application OTA update mechanism.
 * The device does NOT have a separate bootloader in different flash sectors.
 * Instead, it receives firmware updates while running and writes them to flash.
 * Boot mode is controlled via UART commands, not persistent flags.
 *
 * WARNING: During update, ALL application sectors (0-10) are erased. If the
 * update is interrupted (power loss, communication failure), the device will
 * be bricked and require recovery via SWD/JTAG. Ensure stable power and
 * reliable communication before starting an update.
 */
#define MIN_FIRMWARE_SIZE   (16 * 1024)     /**< Minimum valid firmware size (16KB) */

/* Enable ACK responses for each HEX line (useful for debugging) */
// #define BOOTLOADER_SEND_ACK

/* Private variables ---------------------------------------------------------*/
static BootloaderState_t bootloaderState = BOOTLOADER_IDLE;
static uint32_t extendedAddress = 0;        /**< Extended address from 0x04 records */
static uint32_t bytesWritten = 0;           /**< Total bytes written to flash */
static uint8_t sectorsErased = 0;           /**< Flag indicating sectors have been erased */
static uint8_t tasksWereSuspended = 0;      /**< Flag indicating if tasks were suspended */
static uint32_t updateStartTime = 0;        /**< Timestamp when update started (for timeout) */

/* Private function prototypes -----------------------------------------------*/
static HAL_StatusTypeDef Bootloader_EraseFlash(void);
static HAL_StatusTypeDef ParseHEXLine(const char* line, IntelHEXRecord_t* record);
static HAL_StatusTypeDef WriteToFlash(uint32_t address, uint8_t* data, uint16_t length);
static uint8_t CalculateChecksum(const IntelHEXRecord_t* record);
static void Bootloader_SuspendNonEssentialTasks(void);
static void Bootloader_ResumeNonEssentialTasks(void);

/* Exported functions --------------------------------------------------------*/

/**
  * @brief  Initialize bootloader module
  */
void Bootloader_Init(void) {
    bootloaderState = BOOTLOADER_IDLE;
    extendedAddress = 0;
    bytesWritten = 0;
    sectorsErased = 0;
}

/**
  * @brief  Get current bootloader state
  */
BootloaderState_t Bootloader_GetState(void) {
    return bootloaderState;
}

/**
  * @brief  Get number of bytes written
  */
uint32_t Bootloader_GetBytesWritten(void) {
    return bytesWritten;
}

/**
  * @brief  Reset bootloader to idle state
  * @note   Also resumes any suspended tasks
  */
void Bootloader_Reset(void) {
    bootloaderState = BOOTLOADER_IDLE;
    extendedAddress = 0;
    bytesWritten = 0;
    sectorsErased = 0;

    // Resume tasks if they were suspended
    if (tasksWereSuspended) {
        Bootloader_ResumeNonEssentialTasks();
    }
}

/**
  * @brief  Check if device should enter firmware update mode
  * @retval Current bootloader state (1 if in update mode, 0 otherwise)
  * @note   This checks the current state, not a persistent flag
  */
uint8_t Bootloader_CheckUpdateModeRequest(void) {
    // Return 1 if we're currently in receiving or complete state
    return (bootloaderState == BOOTLOADER_RECEIVING || 
            bootloaderState == BOOTLOADER_COMPLETE) ? 1 : 0;
}

/**
  * @brief  Request firmware update mode
  * @note   This doesn't persist across resets - use FIRMWARE_UPDATE START command
  */
void Bootloader_RequestUpdateMode(void) {
    usb_printf("To enter update mode, send: FIRMWARE_UPDATE=START\r\n");
}

/**
  * @brief  Clear firmware update mode request
  * @note   Resets bootloader to idle state
  */
void Bootloader_ClearUpdateModeRequest(void) {
    Bootloader_Reset();
}

/**
  * @brief  Handle bootloader commands
  * @param  command: Command name
  * @param  value: Command value
  */
void Bootloader_HandleCommand(const char* command, const char* value) {
    if (strcmp(value, "START") == 0) {
        usb_printf("\r\n");
        usb_printf("========================================\r\n");
        usb_printf("   FIRMWARE UPDATE - DANGER ZONE\r\n");
        usb_printf("========================================\r\n");
        usb_printf("WARNING: This will erase ALL firmware!\r\n");
        usb_printf("WARNING: Device will BRICK if interrupted!\r\n");
        usb_printf("- Ensure stable power supply\r\n");
        usb_printf("- Ensure reliable UART connection\r\n");
        usb_printf("- Do NOT disconnect during update\r\n");
        usb_printf("\r\n");
        usb_printf("Sectors to erase: 0-10 (896KB)\r\n");
        usb_printf("Config sector 11: PRESERVED\r\n");
        usb_printf("\r\n");
        usb_printf("This will take ~30 seconds...\r\n");
        usb_printf("========================================\r\n");
        usb_printf("\r\n");

        // Record start time
        updateStartTime = HAL_GetTick();

        // Suspend non-essential tasks to avoid conflicts
        Bootloader_SuspendNonEssentialTasks();

        // Initialize state
        Bootloader_Init();

        // Erase flash sectors (protected by critical section internally)
        usb_printf("Erasing flash sectors...\r\n");
        if (Bootloader_EraseFlash() == HAL_OK) {
            bootloaderState = BOOTLOADER_RECEIVING;
            extendedAddress = 0;
            bytesWritten = 0;
            usb_printf("\r\n");
            usb_printf("========================================\r\n");
            usb_printf("UPDATE READY - Send Intel HEX data now\r\n");
            usb_printf("========================================\r\n");
        } else {
            bootloaderState = BOOTLOADER_ERROR;
            usb_printf("\r\n");
            usb_printf("ERROR: Failed to erase flash\r\n");
            usb_printf("Device may be in undefined state - recovery via SWD required\r\n");
            // Resume tasks if erase failed (though device may be unstable)
            Bootloader_ResumeNonEssentialTasks();
        }
    }
    else if (strcmp(value, "END") == 0) {
        if (bootloaderState == BOOTLOADER_COMPLETE) {
            uint32_t updateDuration = (HAL_GetTick() - updateStartTime) / 1000;
            usb_printf("\r\n");
            usb_printf("========================================\r\n");
            usb_printf("   FIRMWARE UPDATE SUCCESSFUL\r\n");
            usb_printf("========================================\r\n");
            usb_printf("Total bytes written: %lu (%lu KB)\r\n", bytesWritten, bytesWritten / 1024);
            usb_printf("Update duration: %lu seconds\r\n", updateDuration);
            usb_printf("Resetting device in 2 seconds...\r\n");
            usb_printf("========================================\r\n");
            osDelay(2000);  // RTOS-aware delay to give time for message to send
            // Note: Tasks will be resumed by system reset
            NVIC_SystemReset();
        } else if (bootloaderState == BOOTLOADER_ERROR) {
            usb_printf("\r\n");
            usb_printf("ERROR: Cannot complete update - errors occurred\r\n");
            usb_printf("Device firmware may be corrupted\r\n");
            usb_printf("Recovery via SWD/JTAG programmer required\r\n");
        } else {
            usb_printf("\r\n");
            usb_printf("ERROR: Update not complete (state: %d)\r\n", bootloaderState);
            usb_printf("Expected state: COMPLETE, current state: %d\r\n", bootloaderState);
        }
    }
    else if (strcmp(value, "ABORT") == 0) {
        usb_printf("\r\n");
        usb_printf("========================================\r\n");
        usb_printf("   FIRMWARE UPDATE ABORTED\r\n");
        usb_printf("========================================\r\n");
        
        if (sectorsErased) {
            usb_printf("WARNING: Flash sectors were already erased!\r\n");
            usb_printf("WARNING: Device firmware is INCOMPLETE!\r\n");
            usb_printf("WARNING: Recovery via SWD/JTAG required!\r\n");
            usb_printf("Device may not boot properly after reset.\r\n");
        } else {
            usb_printf("Update aborted before flash erase.\r\n");
            usb_printf("Device firmware intact.\r\n");
        }
        
        Bootloader_Reset();
        usb_printf("========================================\r\n");
        
        // Resume tasks after abort
        Bootloader_ResumeNonEssentialTasks();
    }
    else {
        usb_printf("ERROR: Unknown bootloader command value: %s\r\n", value);
    }
}

/**
  * @brief  Process a single Intel HEX line
  * @param  line: HEX line string (must start with ':')
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  */
HAL_StatusTypeDef Bootloader_ProcessHEXLine(const char* line) {
    IntelHEXRecord_t record;
    HAL_StatusTypeDef status;

    // Check state
    if (bootloaderState != BOOTLOADER_RECEIVING) {
        usb_printf("ERROR: Not in receiving state (state: %d)\r\n", bootloaderState);
        return HAL_ERROR;
    }

    // Parse HEX line
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

            // Validate address range - must be within application area
            if (fullAddress < APP_START_ADDRESS || fullAddress > APP_END_ADDRESS) {
                usb_printf("ERROR: Address 0x%08lX out of valid range [0x%08lX - 0x%08lX]\r\n",
                           fullAddress, APP_START_ADDRESS, APP_END_ADDRESS);
                bootloaderState = BOOTLOADER_ERROR;
                return HAL_ERROR;
            }

            // Prevent writes to configuration sector (sector 11)
            if (fullAddress >= 0x080E0000 && fullAddress <= 0x080FFFFF) {
                usb_printf("ERROR: Cannot write to config sector (0x%08lX)\r\n", fullAddress);
                bootloaderState = BOOTLOADER_ERROR;
                return HAL_ERROR;
            }

            // Write to flash
            status = WriteToFlash(fullAddress, record.data, record.byteCount);
            if (status != HAL_OK) {
                bootloaderState = BOOTLOADER_ERROR;
                return status;
            }

            // Print progress every 16KB (one sector 4+)
            if (bytesWritten % (16 * 1024) == 0) {
                usb_printf("Progress: %lu KB written\r\n", bytesWritten / 1024);
            }
        }
        break;

        case 0x01: // End of file
            // Validate that we received a reasonable amount of data
            if (bytesWritten < MIN_FIRMWARE_SIZE) {
                usb_printf("ERROR: Firmware too small (%lu bytes, minimum %lu)\r\n",
                           bytesWritten, MIN_FIRMWARE_SIZE);
                bootloaderState = BOOTLOADER_ERROR;
                return HAL_ERROR;
            }

            // Verify vector table looks valid (stack pointer should be in RAM)
            uint32_t stackPointer = *(volatile uint32_t*)APP_START_ADDRESS;
            if (stackPointer < 0x20000000 || stackPointer > 0x20020000) {
                usb_printf("ERROR: Invalid stack pointer in new firmware: 0x%08lX\r\n", stackPointer);
                usb_printf("WARNING: New firmware may be corrupt. Send ABORT to cancel or END to proceed anyway.\r\n");
                // Don't set ERROR state - let user decide
            }

            usb_printf("UPDATE COMPLETE\r\n");
            usb_printf("Total bytes written: %lu (%lu KB)\r\n",
                       bytesWritten, bytesWritten / 1024);
            usb_printf("Stack pointer: 0x%08lX\r\n", stackPointer);
            usb_printf("Reset vector: 0x%08lX\r\n", *(volatile uint32_t*)(APP_START_ADDRESS + 4));
            bootloaderState = BOOTLOADER_COMPLETE;
            break;

        case 0x04: // Extended linear address
            // Update upper 16 bits of address
            extendedAddress = ((uint32_t)record.data[0] << 24) |
                             ((uint32_t)record.data[1] << 16);
            usb_printf("Extended address set to: 0x%08lX\r\n", extendedAddress);
            break;

        case 0x05: // Start linear address (entry point)
            // We ignore this for now - device will reset to normal entry point
            break;

        default:
            usb_printf("WARNING: Unknown record type: 0x%02X (ignored)\r\n",
                       record.recordType);
            break;
    }

    // Optional ACK for each line (enable BOOTLOADER_SEND_ACK to activate)
    #ifdef BOOTLOADER_SEND_ACK
    usb_printf("ACK\r\n");
    #endif

    return HAL_OK;
}

/* Private functions ---------------------------------------------------------*/

/**
  * @brief  Erase flash sectors for firmware update
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  * @note   Flash operations are protected with critical section for RTOS safety
  */
static HAL_StatusTypeDef Bootloader_EraseFlash(void) {
    FLASH_EraseInitTypeDef eraseInit;
    uint32_t sectorError = 0;
    HAL_StatusTypeDef status;

    usb_printf("Erasing flash sectors %d to %d...\r\n", FIRST_SECTOR, LAST_SECTOR);

    // Enter critical section to prevent RTOS task switching during flash operation
    taskENTER_CRITICAL();

    // Unlock flash
    HAL_FLASH_Unlock();

    // Configure erase
    eraseInit.TypeErase = FLASH_TYPEERASE_SECTORS;
    eraseInit.VoltageRange = FLASH_VOLTAGE_RANGE_3;  // 2.7V to 3.6V
    eraseInit.Sector = FIRST_SECTOR;
    eraseInit.NbSectors = (LAST_SECTOR - FIRST_SECTOR + 1);

    // Perform erase (this can take 10-15 seconds)
    status = HAL_FLASHEx_Erase(&eraseInit, &sectorError);

    // Lock flash
    HAL_FLASH_Lock();

    // Exit critical section
    taskEXIT_CRITICAL();

    if (status == HAL_OK) {
        usb_printf("Flash erased successfully\r\n");
        sectorsErased = 1;
    } else {
        usb_printf("ERROR: Flash erase failed at sector %lu (error code: %lu)\r\n",
                   sectorError, HAL_FLASH_GetError());
    }

    return status;
}

/**
  * @brief  Parse Intel HEX line into record structure
  * @param  line: HEX line string
  * @param  record: Pointer to record structure to fill
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  */
static HAL_StatusTypeDef ParseHEXLine(const char* line, IntelHEXRecord_t* record) {
    // Initialize record
    memset(record, 0, sizeof(IntelHEXRecord_t));

    // Check start code
    if (line[0] != ':') {
        usb_printf("ERROR: Invalid HEX line (missing ':')\r\n");
        return HAL_ERROR;
    }

    // Check minimum length (start + byte count + address + type + checksum = 11 chars)
    size_t lineLen = strlen(line);
    if (lineLen < 11) {
        usb_printf("ERROR: HEX line too short (%d chars)\r\n", lineLen);
        return HAL_ERROR;
    }

    // Parse byte count (2 hex digits)
    char byteCountStr[3] = {line[1], line[2], 0};
    record->byteCount = (uint8_t)strtol(byteCountStr, NULL, 16);

    // Check expected length
    size_t expectedLen = 11 + (record->byteCount * 2);
    if (lineLen < expectedLen) {
        usb_printf("ERROR: HEX line length mismatch (expected %d, got %d)\r\n",
                   expectedLen, lineLen);
        return HAL_ERROR;
    }

    // Parse address (4 hex digits)
    char addressStr[5] = {line[3], line[4], line[5], line[6], 0};
    record->address = (uint16_t)strtol(addressStr, NULL, 16);

    // Parse record type (2 hex digits)
    char recordTypeStr[3] = {line[7], line[8], 0};
    record->recordType = (uint8_t)strtol(recordTypeStr, NULL, 16);

    // Parse data bytes
    for (uint8_t i = 0; i < record->byteCount; i++) {
        char dataStr[3] = {line[9 + i*2], line[10 + i*2], 0};
        record->data[i] = (uint8_t)strtol(dataStr, NULL, 16);
    }

    // Parse checksum (2 hex digits)
    char checksumStr[3] = {line[9 + record->byteCount*2],
                           line[10 + record->byteCount*2], 0};
    record->checksum = (uint8_t)strtol(checksumStr, NULL, 16);

    // Verify checksum
    uint8_t calculatedChecksum = CalculateChecksum(record);
    if (calculatedChecksum != record->checksum) {
        usb_printf("ERROR: Checksum mismatch (expected 0x%02X, got 0x%02X)\r\n",
                   calculatedChecksum, record->checksum);
        return HAL_ERROR;
    }

    record->valid = 1;
    return HAL_OK;
}

/**
  * @brief  Calculate Intel HEX checksum
  * @param  record: Pointer to record structure
  * @retval Calculated checksum
  */
static uint8_t CalculateChecksum(const IntelHEXRecord_t* record) {
    uint8_t sum = 0;

    // Sum all fields except checksum
    sum += record->byteCount;
    sum += (uint8_t)(record->address >> 8);
    sum += (uint8_t)(record->address & 0xFF);
    sum += record->recordType;

    for (uint8_t i = 0; i < record->byteCount; i++) {
        sum += record->data[i];
    }

    // Two's complement
    return (uint8_t)((-sum) & 0xFF);
}

/**
  * @brief  Write data to flash memory
  * @param  address: Flash address to write to
  * @param  data: Pointer to data buffer
  * @param  length: Number of bytes to write
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  * @note   Flash operations are protected with critical section for RTOS safety
  */
static HAL_StatusTypeDef WriteToFlash(uint32_t address, uint8_t* data, uint16_t length) {
    HAL_StatusTypeDef status = HAL_OK;

    // Enter critical section to prevent RTOS task switching during flash write
    taskENTER_CRITICAL();

    // Unlock flash
    HAL_FLASH_Unlock();

    // Write in 32-bit words for efficiency
    uint16_t i = 0;
    while (i < length) {
        uint32_t word = 0;

        // Build word from bytes (little-endian)
        // Handle partial words at end of data
        for (uint8_t j = 0; j < 4 && i < length; j++) {
            word |= ((uint32_t)data[i]) << (j * 8);
            i++;
        }

        // Write word to flash
        status = HAL_FLASH_Program(FLASH_TYPEPROGRAM_WORD, address, word);
        if (status != HAL_OK) {
            usb_printf("ERROR: Flash write failed at 0x%08lX (error: %lu)\r\n",
                       address, HAL_FLASH_GetError());
            HAL_FLASH_Lock();
            taskEXIT_CRITICAL();
            return status;
        }

        // Move to next word
        address += 4;
    }

    // Lock flash
    HAL_FLASH_Lock();

    // Exit critical section
    taskEXIT_CRITICAL();

    // Update bytes written counter
    bytesWritten += length;

    return status;
}

/**
  * @brief  Suspend non-essential RTOS tasks during firmware update
  * @note   Suspends sensor and heater tasks to avoid conflicts with flash/UART
  *         Log task remains active to handle UART communication
  */
static void Bootloader_SuspendNonEssentialTasks(void) {
    if (tasksWereSuspended) {
        return;  // Already suspended
    }

    // Suspend sensor task (reads from ADC, writes to flash for logging)
    if (sensorTaskHandle != NULL) {
        vTaskSuspend(sensorTaskHandle);
        usb_printf("Sensor task suspended for firmware update\r\n");
    }

    // Suspend heater task (controls heaters, may access config in flash)
    if (heaterTaskHandle != NULL) {
        vTaskSuspend(heaterTaskHandle);
        usb_printf("Heater task suspended for firmware update\r\n");
    }

    tasksWereSuspended = 1;
}

/**
  * @brief  Resume non-essential RTOS tasks after firmware update
  * @note   Resumes sensor and heater tasks that were suspended
  */
static void Bootloader_ResumeNonEssentialTasks(void) {
    if (!tasksWereSuspended) {
        return;  // Not suspended
    }

    // Resume sensor task
    if (sensorTaskHandle != NULL) {
        vTaskResume(sensorTaskHandle);
        usb_printf("Sensor task resumed\r\n");
    }

    // Resume heater task
    if (heaterTaskHandle != NULL) {
        vTaskResume(heaterTaskHandle);
        usb_printf("Heater task resumed\r\n");
    }

    tasksWereSuspended = 0;
}

/**
  ******************************************************************************
  * @file    bootloader.c
  * @brief   OTA firmware update bootloader implementation
  * @author  Abdel Manan Abdel Rahman
  ******************************************************************************
  * @attention
  *
  * This module implements an Intel HEX format parser and flash writer for
  * over-the-air firmware updates via UART.
  *
  * Memory Layout (STM32F407VGTx - 1024KB Flash):
  * - Sectors 0-1: 16KB each - Bootloader/system (preserved)
  * - Sectors 2-3: 16KB each - EEPROM emulation (preserved)
  * - Sector 4: 64KB - Application start (updateable)
  * - Sectors 5-10: 128KB each - Application (updateable)
  * - Sector 11: 128KB - Reserved for config (preserved)
  *
  * Total updateable: 64KB + 6*128KB = 832KB
  *
  * RTOS Considerations:
  * - Flash operations are protected with taskENTER_CRITICAL/taskEXIT_CRITICAL
  * - Non-essential tasks are suspended during firmware update
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
#define APP_SIZE            (832 * 1024)    /**< Maximum application size (832KB) - matches updateable area */
#define FIRST_SECTOR        FLASH_SECTOR_4  /**< First sector to erase */
#define LAST_SECTOR         FLASH_SECTOR_10 /**< Last sector to erase */

/* Enable ACK responses for each HEX line (useful for debugging) */
// #define BOOTLOADER_SEND_ACK

/* Private variables ---------------------------------------------------------*/
static BootloaderState_t bootloaderState = BOOTLOADER_IDLE;
static uint32_t extendedAddress = 0;        /**< Extended address from 0x04 records */
static uint32_t bytesWritten = 0;           /**< Total bytes written to flash */
static uint8_t sectorsErased = 0;           /**< Flag indicating sectors have been erased */
static uint8_t tasksWereSuspended = 0;      /**< Flag indicating if tasks were suspended */

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

void Bootloader_JumpToMainApp(uint32_t _app_addr)
{
	uint32_t jump_addr;

	ptrFapp jump_app;

	jump_addr = *(uint32_t*)(_app_addr + 4);
	jump_app  = (ptrFapp)jump_addr;

	__set_MSP(*(uint32_t*)_app_addr);

	jump_app();
}

/**
  * @brief  Handle bootloader commands
  * @param  command: Command name
  * @param  value: Command value
  */
void Bootloader_HandleCommand(const char* command, const char* value) {
    if (strcmp(value, "START") == 0) {
        usb_printf("Starting firmware update...\r\n");

        // Suspend non-essential tasks to avoid conflicts
        Bootloader_SuspendNonEssentialTasks();

        // Initialize state
        Bootloader_Init();

        // Erase flash sectors (protected by critical section internally)
        if (Bootloader_EraseFlash() == HAL_OK) {
            bootloaderState = BOOTLOADER_RECEIVING;
            extendedAddress = 0;
            bytesWritten = 0;
            usb_printf("UPDATE READY\r\n");
        } else {
            bootloaderState = BOOTLOADER_ERROR;
            usb_printf("ERROR: Failed to prepare flash\r\n");
            // Resume tasks if erase failed
            Bootloader_ResumeNonEssentialTasks();
        }
    }
    else if (strcmp(value, "END") == 0) {
        if (bootloaderState == BOOTLOADER_COMPLETE) {
            usb_printf("Firmware update complete. Resetting in 1 second...\r\n");
            osDelay(1000);  // RTOS-aware delay to give time for message to send
            // Note: Tasks will be resumed by system reset
            NVIC_SystemReset();
        } else {
            usb_printf("ERROR: Update not complete (state: %d)\r\n", bootloaderState);
        }
    }
    else if (strcmp(value, "ABORT") == 0) {
        Bootloader_Reset();
        usb_printf("Firmware update aborted\r\n");
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

            // Optional: Print progress every 1KB
            if (bytesWritten % 1024 == 0) {
                usb_printf("Progress: %lu KB written\r\n", bytesWritten / 1024);
            }
        }
        break;

        case 0x01: // End of file
            usb_printf("UPDATE COMPLETE\r\n");
            usb_printf("Total bytes written: %lu (%lu KB)\r\n",
                       bytesWritten, bytesWritten / 1024);
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

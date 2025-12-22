/**
  ******************************************************************************
  * @file    bootloader.h
  * @brief   OTA firmware update module header
  * @author  Abdel Manan Abdel Rahman
  ******************************************************************************
  * @attention
  *
  * This module implements an Intel HEX format parser and flash writer for
  * over-the-air firmware updates via UART.
  *
  * IMPORTANT: This is NOT a traditional bootloader architecture. The firmware
  * updates itself while running. There is NO separate bootloader in protected
  * flash sectors. This is an in-application OTA updater.
  *
  * Update Flow:
  * 1. Device runs normally from 0x08000000 (sectors 0-10)
  * 2. User sends: FIRMWARE_UPDATE=START (via UART)
  * 3. Firmware erases **ALL** sectors 0-10 (~30 seconds)
  * 4. User sends Intel HEX lines (new firmware data)
  * 5. Firmware writes to flash and validates each write
  * 6. Firmware validates vector table (stack pointer, reset vector)
  * 7. User sends: FIRMWARE_UPDATE=END
  * 8. Device performs system reset
  * 9. New firmware boots from 0x08000000
  *
  * WARNING: If update is interrupted during/after erase, device WILL BE BRICKED.
  * Recovery requires SWD/JTAG programmer. Ensure:
  * - Stable power supply throughout update
  * - Reliable UART connection  
  * - Complete firmware HEX file ready before starting
  *
  * Usage:
  * 1. Initialize: Bootloader_Init()
  * 2. Send command: FIRMWARE_UPDATE=START
  * 3. Send HEX lines: :10010000...
  * 4. End update: FIRMWARE_UPDATE=END
  *
  ******************************************************************************
  */

#ifndef INC_BOOTLOADER_H_
#define INC_BOOTLOADER_H_

#ifdef __cplusplus
extern "C" {
#endif

#include "stm32f4xx_hal.h"

/**
  * @brief Bootloader state machine states
  */
typedef enum {
    BOOTLOADER_IDLE = 0,        /**< Idle state, ready to start update */
    BOOTLOADER_RECEIVING,       /**< Receiving and writing HEX data */
    BOOTLOADER_ERROR,           /**< Error occurred during update */
    BOOTLOADER_COMPLETE         /**< Update completed successfully */
} BootloaderState_t;

/**
  * @brief Intel HEX record structure
  *
  * Format: :LLAAAATTDDDD...CC
  * LL = byte count, AAAA = address, TT = record type,
  * DD = data bytes, CC = checksum
  */
typedef struct {
    uint8_t byteCount;          /**< Number of data bytes in this record */
    uint16_t address;           /**< 16-bit address offset */
    uint8_t recordType;         /**< Record type (00=data, 01=EOF, 04=ext addr) */
    uint8_t data[256];          /**< Data bytes (max 255) */
    uint8_t checksum;           /**< Checksum byte from HEX line */
    uint8_t valid;              /**< 1 if record is valid, 0 otherwise */
} IntelHEXRecord_t;

/* Exported functions --------------------------------------------------------*/

/**
  * @brief  Initialize bootloader module
  * @note   Call this before starting an update
  * @retval None
  */
void Bootloader_Init(void);

/**
  * @brief  Handle bootloader commands
  * @param  command: Command name (e.g., "FIRMWARE_UPDATE")
  * @param  value: Command value (e.g., "START", "END", "ABORT")
  * @note   START: Erases flash and prepares for update
  *         END: Completes update and resets device
  *         ABORT: Cancels update and returns to idle
  * @retval None
  */
void Bootloader_HandleCommand(const char* command, const char* value);

/**
  * @brief  Process a single Intel HEX line
  * @param  line: HEX line string (must start with ':')
  * @note   Parses the HEX line, validates checksum, and writes to flash
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  */
HAL_StatusTypeDef Bootloader_ProcessHEXLine(const char* line);

/**
  * @brief  Reset bootloader to idle state
  * @note   Clears all state variables but does not erase flash
  * @retval None
  */
void Bootloader_Reset(void);

/**
  * @brief  Get current bootloader state
  * @retval Current state (BootloaderState_t)
  */
BootloaderState_t Bootloader_GetState(void);

/**
  * @brief  Get number of bytes written so far
  * @retval Number of bytes written to flash
  */
uint32_t Bootloader_GetBytesWritten(void);

/**
  * @brief  Check if device is currently in firmware update mode
  * @note   Checks current bootloader state (RECEIVING or COMPLETE)
  * @note   This does NOT check persistent storage - update mode is not preserved across resets
  * @retval 1 if currently in update mode, 0 otherwise
  */
uint8_t Bootloader_CheckUpdateModeRequest(void);

/**
  * @brief  Display instructions for entering firmware update mode
  * @note   Update mode is entered via FIRMWARE_UPDATE=START command, not persistent flags
  * @note   This function only prints helpful instructions to the user
  * @retval None
  */
void Bootloader_RequestUpdateMode(void);

/**
  * @brief  Exit firmware update mode and return to idle state
  * @note   Resets bootloader state machine and resumes suspended RTOS tasks
  * @note   Does not affect any persistent storage
  * @retval None
  */
void Bootloader_ClearUpdateModeRequest(void);

#ifdef __cplusplus
}
#endif

#endif /* INC_BOOTLOADER_H_ */

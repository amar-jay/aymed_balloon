/**
  ******************************************************************************
  * @file    bootloader.h
  * @brief   OTA firmware update bootloader header
  * @author  Abdel Manan Abdel Rahman
  ******************************************************************************
  * @attention
  *
  * This module implements an Intel HEX format parser and flash writer for
  * over-the-air firmware updates via UART.
  *
  * Usage:
  * 1. Initialize: Bootloader_Init()
  * 2. Send command: Bootloader_HandleCommand("FIRMWARE_UPDATE", "START")
  * 3. Send HEX lines: Bootloader_ProcessHEXLine(":10010000...")
  * 4. End update: Bootloader_HandleCommand("FIRMWARE_UPDATE", "END")
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
    BOOTLOADER_READY,           /**< Flash erased, ready to receive data */
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

#ifdef __cplusplus
}
#endif

#endif /* INC_BOOTLOADER_H_ */

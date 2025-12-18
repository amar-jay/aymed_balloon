/**
  ******************************************************************************
  * @file    partition.h
  * @brief   A/B partition management for OTA updates
  * @author  Aymed Balloon Team
  ******************************************************************************
  * @attention
  *
  * This module implements A/B partitioning to enable safe OTA firmware updates.
  * The firmware can run from either partition A or B, and updates are written
  * to the inactive partition to prevent corruption of running code.
  *
  * Memory Layout:
  * - Sector 0-1: Bootloader/Initial code (32KB)
  * - Sector 2: Boot metadata (16KB)
  * - Sector 3: EEPROM/Config (16KB)
  * - Sectors 4-6: Application Partition A (320KB)
  * - Sectors 7-9: Application Partition B (384KB)
  * - Sectors 10-11: Config storage (256KB)
  *
  ******************************************************************************
  */

#ifndef __PARTITION_H
#define __PARTITION_H

#ifdef __cplusplus
extern "C" {
#endif

#include "stm32f4xx_hal.h"
#include <stdint.h>

/* Partition Configuration ---------------------------------------------------*/
#define PARTITION_A_START_ADDR   0x08010000  /**< Partition A start (Sector 4) */
#define PARTITION_A_SIZE         (320 * 1024) /**< Partition A size: 64KB + 2*128KB */
#define PARTITION_A_FIRST_SECTOR FLASH_SECTOR_4
#define PARTITION_A_LAST_SECTOR  FLASH_SECTOR_6

#define PARTITION_B_START_ADDR   0x08060000  /**< Partition B start (Sector 7) */
#define PARTITION_B_SIZE         (384 * 1024) /**< Partition B size: 3*128KB */
#define PARTITION_B_FIRST_SECTOR FLASH_SECTOR_7
#define PARTITION_B_LAST_SECTOR  FLASH_SECTOR_9

#define BOOT_METADATA_ADDR       0x08008000  /**< Boot metadata location (Sector 2) */
#define BOOT_METADATA_MAGIC      0xDEADBEEF  /**< Magic number for valid metadata */

/* Partition Types -----------------------------------------------------------*/
typedef enum {
    PARTITION_A = 0,
    PARTITION_B = 1,
    PARTITION_UNKNOWN = 0xFF
} Partition_t;

/**
  * @brief Boot metadata structure
  * 
  * Stored in Sector 2 at address 0x08008000
  * Contains information about which partition to boot from
  * and metadata for each partition
  */
typedef struct {
    uint32_t magic;                 /**< Magic number (0xDEADBEEF) for validation */
    uint8_t active_partition;       /**< Active partition: 0=A, 1=B */
    uint8_t boot_count_a;           /**< Boot attempt counter for partition A */
    uint8_t boot_count_b;           /**< Boot attempt counter for partition B */
    uint8_t reserved;               /**< Reserved for alignment */
    
    /* Partition A metadata */
    uint32_t partition_a_version;   /**< Version number of firmware in partition A */
    uint32_t partition_a_crc;       /**< CRC32 of firmware in partition A */
    uint32_t partition_a_size;      /**< Size of firmware in partition A */
    uint8_t partition_a_valid;      /**< 1=valid, 0=invalid */
    uint8_t reserved_a[3];          /**< Reserved for alignment */
    
    /* Partition B metadata */
    uint32_t partition_b_version;   /**< Version number of firmware in partition B */
    uint32_t partition_b_crc;       /**< CRC32 of firmware in partition B */
    uint32_t partition_b_size;      /**< Size of firmware in partition B */
    uint8_t partition_b_valid;      /**< 1=valid, 0=invalid */
    uint8_t reserved_b[3];          /**< Reserved for alignment */
} BootMetadata_t;

/* Exported functions --------------------------------------------------------*/

/**
  * @brief  Initialize partition management
  * @note   Reads boot metadata and determines current partition
  * @retval None
  */
void Partition_Init(void);

/**
  * @brief  Get current running partition
  * @retval Current partition (PARTITION_A, PARTITION_B, or PARTITION_UNKNOWN)
  */
Partition_t Partition_GetCurrent(void);

/**
  * @brief  Get inactive partition (for OTA updates)
  * @retval Inactive partition (opposite of current)
  */
Partition_t Partition_GetInactive(void);

/**
  * @brief  Read boot metadata from flash
  * @param  metadata: Pointer to BootMetadata_t structure to fill
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  */
HAL_StatusTypeDef Partition_ReadMetadata(BootMetadata_t* metadata);

/**
  * @brief  Write boot metadata to flash
  * @param  metadata: Pointer to BootMetadata_t structure to write
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  */
HAL_StatusTypeDef Partition_WriteMetadata(const BootMetadata_t* metadata);

/**
  * @brief  Mark partition as valid with version info
  * @param  partition: Partition to mark valid
  * @param  version: Firmware version
  * @param  size: Firmware size in bytes
  * @param  crc: CRC32 of firmware (optional, set to 0 if not used)
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  */
HAL_StatusTypeDef Partition_MarkValid(Partition_t partition, uint32_t version, 
                                       uint32_t size, uint32_t crc);

/**
  * @brief  Mark partition as invalid
  * @param  partition: Partition to mark invalid
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  */
HAL_StatusTypeDef Partition_MarkInvalid(Partition_t partition);

/**
  * @brief  Set active partition (will boot from this partition on next reset)
  * @param  partition: Partition to set as active
  * @retval HAL_OK if successful, HAL_ERROR otherwise
  */
HAL_StatusTypeDef Partition_SetActive(Partition_t partition);

/**
  * @brief  Get start address of partition
  * @param  partition: Partition to query
  * @retval Start address of partition, or 0 if invalid
  */
uint32_t Partition_GetStartAddress(Partition_t partition);

/**
  * @brief  Get size of partition
  * @param  partition: Partition to query
  * @retval Size of partition in bytes, or 0 if invalid
  */
uint32_t Partition_GetSize(Partition_t partition);

/**
  * @brief  Check if firmware exists at partition address
  * @param  partition: Partition to check
  * @retval 1 if firmware exists (valid stack pointer), 0 otherwise
  */
uint8_t Partition_CheckFirmwareExists(Partition_t partition);

/**
  * @brief  Jump to application in specified partition
  * @param  partition: Partition to jump to
  * @note   This function does not return if jump is successful
  * @retval None
  */
void Partition_JumpToApplication(Partition_t partition);

/**
  * @brief  Perform boot selection logic
  * @note   Checks active partition, validates it, and jumps if valid
  *         If active is invalid, tries alternate partition
  *         If both invalid, returns to allow firmware update
  * @retval 0 if jumped successfully (doesn't return), 
  *         1 if should stay in bootloader mode
  */
uint8_t Partition_BootSelect(void);

#ifdef __cplusplus
}
#endif

#endif /* __PARTITION_H */

/************************ (C) COPYRIGHT Aymed Balloon Team *****END OF FILE****/

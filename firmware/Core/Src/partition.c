/**
  ******************************************************************************
  * @file    partition.c
  * @brief   A/B partition management implementation
  * @author  Aymed Balloon Team
  ******************************************************************************
  */

#include "partition.h"
#include "utils.h"
#include <string.h>

/* Private variables ---------------------------------------------------------*/
static Partition_t currentPartition = PARTITION_UNKNOWN;
static BootMetadata_t cachedMetadata;
static uint8_t metadataLoaded = 0;

/* Private function prototypes -----------------------------------------------*/
static uint32_t GetPartitionAddress(uint32_t address);

/* Exported functions --------------------------------------------------------*/

/**
  * @brief  Initialize partition management
  */
void Partition_Init(void) {
    // Read metadata from flash
    if (Partition_ReadMetadata(&cachedMetadata) == HAL_OK) {
        metadataLoaded = 1;
    } else {
        // Metadata is invalid, initialize with defaults
        memset(&cachedMetadata, 0xFF, sizeof(BootMetadata_t));
        cachedMetadata.magic = BOOT_METADATA_MAGIC;
        cachedMetadata.active_partition = PARTITION_A;
        cachedMetadata.boot_count_a = 0;
        cachedMetadata.boot_count_b = 0;
        cachedMetadata.partition_a_valid = 0;
        cachedMetadata.partition_b_valid = 0;
        cachedMetadata.partition_a_version = 0;
        cachedMetadata.partition_b_version = 0;
        cachedMetadata.partition_a_size = 0;
        cachedMetadata.partition_b_size = 0;
        cachedMetadata.partition_a_crc = 0;
        cachedMetadata.partition_b_crc = 0;
        
        // Write initial metadata
        Partition_WriteMetadata(&cachedMetadata);
        metadataLoaded = 1;
    }
    
    // Determine which partition we're currently running from
    // Use the address of this function to determine current code location
    uint32_t pc = (uint32_t)Partition_Init;
    
    if (pc >= PARTITION_A_START_ADDR && pc < (PARTITION_A_START_ADDR + PARTITION_A_SIZE)) {
        currentPartition = PARTITION_A;
    } else if (pc >= PARTITION_B_START_ADDR && pc < (PARTITION_B_START_ADDR + PARTITION_B_SIZE)) {
        currentPartition = PARTITION_B;
    } else {
        // Running from bootloader region (0x08000000 - 0x08010000)
        // Keep as UNKNOWN to indicate we're in bootloader mode
        currentPartition = PARTITION_UNKNOWN;
    }
}

/**
  * @brief  Get current running partition
  */
Partition_t Partition_GetCurrent(void) {
    return currentPartition;
}

/**
  * @brief  Get inactive partition
  */
Partition_t Partition_GetInactive(void) {
    if (currentPartition == PARTITION_A) {
        return PARTITION_B;
    } else if (currentPartition == PARTITION_B) {
        return PARTITION_A;
    }
    // If unknown, default to partition B as inactive
    return PARTITION_B;
}

/**
  * @brief  Read boot metadata from flash
  */
HAL_StatusTypeDef Partition_ReadMetadata(BootMetadata_t* metadata) {
    if (metadata == NULL) {
        return HAL_ERROR;
    }
    
    // Read metadata from flash
    BootMetadata_t* flashMetadata = (BootMetadata_t*)BOOT_METADATA_ADDR;
    
    // Validate magic number
    if (flashMetadata->magic != BOOT_METADATA_MAGIC) {
        return HAL_ERROR;
    }
    
    // Copy metadata
    memcpy(metadata, flashMetadata, sizeof(BootMetadata_t));
    
    return HAL_OK;
}

/**
  * @brief  Write boot metadata to flash
  */
HAL_StatusTypeDef Partition_WriteMetadata(const BootMetadata_t* metadata) {
    HAL_StatusTypeDef status;
    FLASH_EraseInitTypeDef eraseInit;
    uint32_t sectorError = 0;
    
    if (metadata == NULL) {
        return HAL_ERROR;
    }
    
    // Unlock flash
    HAL_FLASH_Unlock();
    
    // Erase metadata sector (Sector 2)
    eraseInit.TypeErase = FLASH_TYPEERASE_SECTORS;
    eraseInit.VoltageRange = FLASH_VOLTAGE_RANGE_3;
    eraseInit.Sector = FLASH_SECTOR_2;
    eraseInit.NbSectors = 1;
    
    status = HAL_FLASHEx_Erase(&eraseInit, &sectorError);
    if (status != HAL_OK) {
        HAL_FLASH_Lock();
        return status;
    }
    
    // Write metadata word by word
    uint32_t* dataPtr = (uint32_t*)metadata;
    uint32_t address = BOOT_METADATA_ADDR;
    uint32_t wordCount = (sizeof(BootMetadata_t) + 3) / 4;  // Round up to words
    
    for (uint32_t i = 0; i < wordCount; i++) {
        status = HAL_FLASH_Program(FLASH_TYPEPROGRAM_WORD, address, dataPtr[i]);
        if (status != HAL_OK) {
            HAL_FLASH_Lock();
            return status;
        }
        address += 4;
    }
    
    // Lock flash
    HAL_FLASH_Lock();
    
    // Update cached metadata
    memcpy(&cachedMetadata, metadata, sizeof(BootMetadata_t));
    metadataLoaded = 1;
    
    return HAL_OK;
}

/**
  * @brief  Mark partition as valid
  */
HAL_StatusTypeDef Partition_MarkValid(Partition_t partition, uint32_t version, 
                                       uint32_t size, uint32_t crc) {
    BootMetadata_t metadata;
    
    // Read current metadata
    if (!metadataLoaded) {
        if (Partition_ReadMetadata(&metadata) != HAL_OK) {
            // Initialize with defaults if read fails
            memset(&metadata, 0xFF, sizeof(BootMetadata_t));
            metadata.magic = BOOT_METADATA_MAGIC;
            metadata.active_partition = PARTITION_A;
            metadata.boot_count_a = 0;
            metadata.boot_count_b = 0;
            metadata.partition_a_valid = 0;
            metadata.partition_b_valid = 0;
        }
    } else {
        memcpy(&metadata, &cachedMetadata, sizeof(BootMetadata_t));
    }
    
    // Update partition metadata
    if (partition == PARTITION_A) {
        metadata.partition_a_valid = 1;
        metadata.partition_a_version = version;
        metadata.partition_a_size = size;
        metadata.partition_a_crc = crc;
        metadata.boot_count_a = 0;  // Reset boot counter
    } else if (partition == PARTITION_B) {
        metadata.partition_b_valid = 1;
        metadata.partition_b_version = version;
        metadata.partition_b_size = size;
        metadata.partition_b_crc = crc;
        metadata.boot_count_b = 0;  // Reset boot counter
    } else {
        return HAL_ERROR;
    }
    
    // Write metadata back
    return Partition_WriteMetadata(&metadata);
}

/**
  * @brief  Mark partition as invalid
  */
HAL_StatusTypeDef Partition_MarkInvalid(Partition_t partition) {
    BootMetadata_t metadata;
    
    // Read current metadata
    if (!metadataLoaded) {
        if (Partition_ReadMetadata(&metadata) != HAL_OK) {
            return HAL_ERROR;
        }
    } else {
        memcpy(&metadata, &cachedMetadata, sizeof(BootMetadata_t));
    }
    
    // Mark partition as invalid
    if (partition == PARTITION_A) {
        metadata.partition_a_valid = 0;
    } else if (partition == PARTITION_B) {
        metadata.partition_b_valid = 0;
    } else {
        return HAL_ERROR;
    }
    
    // Write metadata back
    return Partition_WriteMetadata(&metadata);
}

/**
  * @brief  Set active partition
  */
HAL_StatusTypeDef Partition_SetActive(Partition_t partition) {
    BootMetadata_t metadata;
    
    // Read current metadata
    if (!metadataLoaded) {
        if (Partition_ReadMetadata(&metadata) != HAL_OK) {
            return HAL_ERROR;
        }
    } else {
        memcpy(&metadata, &cachedMetadata, sizeof(BootMetadata_t));
    }
    
    // Set active partition
    if (partition == PARTITION_A || partition == PARTITION_B) {
        metadata.active_partition = partition;
    } else {
        return HAL_ERROR;
    }
    
    // Write metadata back
    return Partition_WriteMetadata(&metadata);
}

/**
  * @brief  Get start address of partition
  */
uint32_t Partition_GetStartAddress(Partition_t partition) {
    switch (partition) {
        case PARTITION_A:
            return PARTITION_A_START_ADDR;
        case PARTITION_B:
            return PARTITION_B_START_ADDR;
        default:
            return 0;
    }
}

/**
  * @brief  Get size of partition
  */
uint32_t Partition_GetSize(Partition_t partition) {
    switch (partition) {
        case PARTITION_A:
            return PARTITION_A_SIZE;
        case PARTITION_B:
            return PARTITION_B_SIZE;
        default:
            return 0;
    }
}

/**
  * @brief  Check if firmware exists at partition
  */
uint8_t Partition_CheckFirmwareExists(Partition_t partition) {
    uint32_t address = Partition_GetStartAddress(partition);
    
    if (address == 0) {
        return 0;
    }
    
    // Check if address is within valid flash range
    if (address < 0x08000000 || address >= 0x08100000) {
        return 0;
    }
    
    // Check if stack pointer is valid (should point to RAM)
    // Use volatile to prevent compiler optimization
    volatile uint32_t* stackPointerAddr = (volatile uint32_t*)address;
    uint32_t stackPointer = *stackPointerAddr;
    
    // STM32F407 RAM is at 0x20000000 - 0x20020000 (128KB)
    // Stack pointer should be within this range
    if (stackPointer >= 0x20000000 && stackPointer <= 0x20020000) {
        // Also check that reset vector looks valid (should be odd for Thumb mode and in flash)
        volatile uint32_t* resetVectorAddr = (volatile uint32_t*)(address + 4);
        uint32_t resetVector = *resetVectorAddr;
        
        // Reset vector should be in flash and have LSB set (Thumb mode)
        if ((resetVector & 0x1) && (resetVector >= 0x08000000) && (resetVector < 0x08100000)) {
            return 1;
        }
    }
    
    return 0;
}

/**
  * @brief  Jump to application in partition
  */
void Partition_JumpToApplication(Partition_t partition) {
    uint32_t appAddress = Partition_GetStartAddress(partition);
    
    if (appAddress == 0) {
        return;
    }
    
    // Check if firmware exists
    if (!Partition_CheckFirmwareExists(partition)) {
        return;
    }
    
    // Get stack pointer and reset handler address
    uint32_t stackPointer = *((uint32_t*)appAddress);
    uint32_t resetHandler = *((uint32_t*)(appAddress + 4));
    
    // Disable interrupts
    __disable_irq();
    
    // Deinitialize peripherals (optional, but recommended)
    HAL_DeInit();
    
    // Set vector table offset
    SCB->VTOR = appAddress;
    
    // Set stack pointer
    __set_MSP(stackPointer);
    
    // Jump to reset handler
    void (*jumpToApp)(void) = (void (*)(void))resetHandler;
    jumpToApp();
    
    // Should never reach here
    while(1);
}

/**
  * @brief  Perform boot selection logic
  */
uint8_t Partition_BootSelect(void) {
    BootMetadata_t metadata;
    Partition_t targetPartition;
    
    // Read metadata
    if (Partition_ReadMetadata(&metadata) != HAL_OK) {
        // Metadata invalid, stay in bootloader mode
        return 1;
    }
    
    // Get active partition from metadata
    targetPartition = (Partition_t)metadata.active_partition;
    
    // Validate target partition
    if (targetPartition != PARTITION_A && targetPartition != PARTITION_B) {
        // Invalid partition, default to A
        targetPartition = PARTITION_A;
    }
    
    // Check if target partition is valid
    uint8_t targetValid = (targetPartition == PARTITION_A) ? 
                          metadata.partition_a_valid : metadata.partition_b_valid;
    
    if (targetValid && Partition_CheckFirmwareExists(targetPartition)) {
        // Target partition is valid, jump to it
        Partition_JumpToApplication(targetPartition);
        // Should not return
        return 0;
    }
    
    // Target partition is invalid, try alternate
    Partition_t alternatePartition = (targetPartition == PARTITION_A) ? 
                                     PARTITION_B : PARTITION_A;
    uint8_t alternateValid = (alternatePartition == PARTITION_A) ? 
                             metadata.partition_a_valid : metadata.partition_b_valid;
    
    if (alternateValid && Partition_CheckFirmwareExists(alternatePartition)) {
        // Alternate partition is valid, jump to it
        Partition_JumpToApplication(alternatePartition);
        // Should not return
        return 0;
    }
    
    // Both partitions invalid, stay in bootloader mode
    return 1;
}

/************************ (C) COPYRIGHT Aymed Balloon Team *****END OF FILE****/

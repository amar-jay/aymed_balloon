/**
  ******************************************************************************
  * @file    boot_init.c
  * @brief   Boot partition management functions
  * @author  Aymed Balloon Team
  ******************************************************************************
  * @attention
  *
  * This file provides functions for boot-time partition checking.
  * These should be called explicitly from main() or startup code.
  *
  * For a true bootloader implementation, this logic would be in a
  * separate binary in sectors 0-1. This implementation keeps everything
  * in one binary for simplicity.
  *
  ******************************************************************************
  */

#include "partition.h"
#include "stm32f4xx_hal.h"

/**
  * @brief  Perform boot-time partition check
  * @note   Call this early in main() to check if we should jump to another partition
  *         This function will not return if a valid alternate partition is found
  * @retval 0 if no jump needed, 1 if jumped (doesn't return)
  */
uint8_t Boot_CheckAndJumpToPartition(void) {
    // Get current partition
    Partition_t current = Partition_GetCurrent();
    
    // If we're in bootloader region (UNKNOWN), try to boot to a valid partition
    if (current == PARTITION_UNKNOWN) {
        // Attempt to boot to appropriate partition based on metadata
        // This will not return if successful
        uint8_t result = Partition_BootSelect();
        
        // If we're still here, boot selection failed or no valid partition found
        // Continue in bootloader mode to allow firmware update
        return 0;
    }
    
    // We're already in a partition, no need to jump
    return 0;
}

/************************ (C) COPYRIGHT Aymed Balloon Team *****END OF FILE****/

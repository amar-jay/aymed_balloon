/**
  ******************************************************************************
  * @file    boot_init.c
  * @brief   Early boot initialization with partition checking
  * @author  Aymed Balloon Team
  ******************************************************************************
  * @attention
  *
  * This file contains the earliest boot code that runs before main().
  * It checks boot metadata and can jump to an alternate partition if needed.
  *
  * This is a simplified approach that works within the same binary.
  * For a true bootloader, this would be a separate binary in sectors 0-1.
  *
  ******************************************************************************
  */

#include "partition.h"
#include "stm32f4xx_hal.h"

/**
  * @brief  Early boot check - called before main()
  * @note   This function is weakly defined so it can be overridden
  *         It should be called early in the startup sequence
  * @retval None
  */
void __attribute__((constructor(101))) Boot_EarlyInit(void) {
    // This constructor runs before main() but after HAL initialization
    // Priority 101 ensures it runs early
    
    // Initialize partition system  
    Partition_Init();
    
    // Get current partition
    Partition_t current = Partition_GetCurrent();
    
    // If we're at the start of flash (sectors 0-3), we can perform boot selection
    // This would typically be in a dedicated bootloader, but for now we handle it here
    uint32_t pc = (uint32_t)Boot_EarlyInit;
    
    // If running from bootloader region (< 0x08010000), perform boot selection
    if (pc < PARTITION_A_START_ADDR) {
        // Attempt to boot to appropriate partition
        // This will not return if successful
        Partition_BootSelect();
        
        // If we're still here, boot selection failed
        // Continue to main() which will handle firmware update mode
    }
}

/************************ (C) COPYRIGHT Aymed Balloon Team *****END OF FILE****/

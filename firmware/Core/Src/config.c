/*
 * config.c
 *
 *  Created on: Nov 22, 2025
 *      Author: ASUS
 */
 #include "config.h"
#include "stm32f4xx_hal.h" // Replaces flash.h
#include "cmsis_os.h"
#include "utils.h"
#include "config.h"
#include "utils.h"


#include <string.h> // For memcpy

// --------------------------------------- FLASH DEFINITIONS -----------------------------------------
// STM32F407VG Sector 11 starts at 0x080E0000 and ends at 0x080FFFFF
#define CONFIG_FLASH_SECTOR       FLASH_SECTOR_11
#define CONFIG_FLASH_ADDR         0x080E0000 
#define CONFIG_MAGIC_VAL          0xA5

// Global variables
BalloonConfig_t balloonConfig;
extern osMutexId_t configMutexHandle;

// --------------------------------------- HELPER FUNCTIONS ------------------------------------------

/*
 * Erases the config sector and writes the current balloonConfig struct to it.
 * Note: This blocks interrupts briefly during flash operations.
 */
static HAL_StatusTypeDef Internal_SaveToFlash(void) {
    HAL_StatusTypeDef status;
    FLASH_EraseInitTypeDef EraseInitStruct;
    uint32_t SectorError;

    HAL_FLASH_Unlock();

    // 1. Erase the Sector
    EraseInitStruct.TypeErase    = FLASH_TYPEERASE_SECTORS;
    EraseInitStruct.VoltageRange = FLASH_VOLTAGE_RANGE_3; // 2.7V to 3.6V
    EraseInitStruct.Sector       = CONFIG_FLASH_SECTOR;
    EraseInitStruct.NbSectors    = 1;

    status = HAL_FLASHEx_Erase(&EraseInitStruct, &SectorError);
    
    if (status != HAL_OK) {
        HAL_FLASH_Lock();
        return status;
    }

    // 2. Write the struct byte by byte (or word by word)
    uint8_t *data = (uint8_t *)&balloonConfig;
    for (uint32_t i = 0; i < sizeof(BalloonConfig_t); i++) {
        status = HAL_FLASH_Program(FLASH_TYPEPROGRAM_BYTE, CONFIG_FLASH_ADDR + i, data[i]);
        if (status != HAL_OK) {
            HAL_FLASH_Lock();
            return status;
        }
    }

    HAL_FLASH_Lock();
    return HAL_OK;
}

// --------------------------------------- SYSTEM CONFIG ---------------------------------------------

void BalloonConfig_Init(void) {
    if(osMutexAcquire(configMutexHandle, osWaitForever) == osOK) {
        
        // Point a pointer to the flash address
        BalloonConfig_t *flashConfig = (BalloonConfig_t *)CONFIG_FLASH_ADDR;

        // Check if our magic "first_boot" flag matches in Flash
        // Note: We access Flash directly like memory
        if (flashConfig->first_boot != CONFIG_MAGIC_VAL) {
            
            // --- SET DEFAULTS ---
            balloonConfig.optime                = 10;
            balloonConfig.cotime                = 5;
            balloonConfig.top_temp_threshold    = 110;
            balloonConfig.bottom_temp_threshold = 110;
            balloonConfig.top_temp_offset       = 0;
            balloonConfig.bottom_temp_offset    = 0;
            balloonConfig.menu_reset_delay      = 15;
            balloonConfig.time_calibration      = 100;
            balloonConfig.max_temp_error        = 150;
            balloonConfig.vcc_voltage_error     = 24;
            balloonConfig.power_temp_error      = 40;
            balloonConfig.power_vcc_error       = 28;
            balloonConfig.sys_error             = 0;
            balloonConfig.voltage_calibration   = 125;
            balloonConfig.heater_error_enable   = 5;
            balloonConfig.cooling_delay         = 75;
            balloonConfig.first_boot            = CONFIG_MAGIC_VAL; // 0xA5
            balloonConfig.use_internal_adc      = 1;

            BalloonConfig_SaveAll(); 
        } else {
            BalloonConfig_Load(); // Load data from Flash to RAM
            
            // Validate Loaded Data
            if (!BalloonConfig_Validate()) {
                usb_printf("ERROR: Flash integrity check failed, using defaults\r\n");
                // BalloonConfig_ForceReset(); // I dont think there is a need to force restart when obviously the user can `GET RESET`.
            }
        }
        osMutexRelease(configMutexHandle);
    }
}

void BalloonConfig_Load(void) {
    // Direct memory copy from Flash Address to RAM Struct
    // This is much faster than reading variables one by one
    // BalloonConfig_Init();
    memcpy(&balloonConfig, (void*)CONFIG_FLASH_ADDR, sizeof(BalloonConfig_t));
}

void BalloonConfig_SaveAll(void) {
    if (Internal_SaveToFlash() != HAL_OK) {
        usb_printf("ERROR: Failed to save configs\r\n");
    }
}

/**
NOTE: This function updates a single variable in RAM and then commits the entire struct to Flash.
This is because Flash memory requires erasing entire sectors before writing, so we must rewrite
the whole struct anyway. Be cautious about calling this function too frequently.
*/
void BalloonConfig_Update(uint16_t varID, uint16_t value) {
    // 1. Update the RAM copy
    switch (varID) {
        case VAR_OPTIME:                balloonConfig.optime = (uint8_t)value; break;
        case VAR_COTIME:                balloonConfig.cotime = (uint8_t)value; break;
        case VAR_TOP_TEMP_THRESHOLD:    balloonConfig.top_temp_threshold = (uint8_t)value; break;
        case VAR_BOTTOM_TEMP_THRESHOLD: balloonConfig.bottom_temp_threshold = (uint8_t)value; break;
        case VAR_TOP_TEMP_OFFSET:       balloonConfig.top_temp_offset = (uint8_t)value; break;
        case VAR_BOTTOM_TEMP_OFFSET:    balloonConfig.bottom_temp_offset = (uint8_t)value; break;
        case VAR_MENU_RESET_DELAY:      balloonConfig.menu_reset_delay = (uint8_t)value; break;
        case VAR_TIME_CALIBRATION:      balloonConfig.time_calibration = (uint8_t)value; break;
        case VAR_MAX_TEMP_ERROR:        balloonConfig.max_temp_error = (uint16_t)value; break;
        case VAR_VCC_VOLTAGE_ERROR:     balloonConfig.vcc_voltage_error = (uint8_t)value; break;
        case VAR_POWER_TEMP_ERROR:      balloonConfig.power_temp_error = (uint8_t)value; break;
        case VAR_POWER_VCC_ERROR:       balloonConfig.power_vcc_error = (uint8_t)value; break;
        case VAR_SYS_ERROR:             balloonConfig.sys_error = (uint8_t)value; break;
        case VAR_VOLTAGE_CALIBRATION:   balloonConfig.voltage_calibration = (uint8_t)value; break;
        case VAR_HEATER_ERROR_ENABLE:   balloonConfig.heater_error_enable = (uint8_t)value; break;
        case VAR_COOLING_DELAY:         balloonConfig.cooling_delay = (uint8_t)value; break;
        case VAR_FIRST_BOOT:            balloonConfig.first_boot = (uint8_t)value; break;
        case VAR_USE_INTERNAL_ADC:      balloonConfig.use_internal_adc = (uint8_t)value; break;
        default: return; // Unknown varID, do nothing
    }

    // 2. Commit the entire struct to Flash
    // NOTE: This erases the sector every time. Do not call this in a fast loop.
    BalloonConfig_SaveAll();
}

void BalloonConfig_ForceReset(void) {
    // To force reset, we just need to invalidate the first_boot byte in Flash
    // However, since we can't write 0 without erasing, we just Init defaults in RAM and Save.
    
    balloonConfig.first_boot = 0x00; // Invalid logic for RAM
    // Actually, simpler to just recursive call Init logic effectively:
    
    // Manually set invalid, then re-init will catch it
    // But since we are already in code, let's just reset RAM defaults manually:
    
    // Re-trigger the default logic
    // We erase the flash sector to 0xFF or 0x00 to force the check to fail next boot
    HAL_FLASH_Unlock();
    FLASH_EraseInitTypeDef EraseInitStruct;
    uint32_t SectorError;
    EraseInitStruct.TypeErase    = FLASH_TYPEERASE_SECTORS;
    EraseInitStruct.VoltageRange = FLASH_VOLTAGE_RANGE_3;
    EraseInitStruct.Sector       = CONFIG_FLASH_SECTOR;
    EraseInitStruct.NbSectors    = 1;
    HAL_FLASHEx_Erase(&EraseInitStruct, &SectorError);
    HAL_FLASH_Lock();

    BalloonConfig_Init(); // This will see empty flash and reload defaults
}


uint8_t BalloonConfig_Validate(void) {
    // Check if values are within reasonable ranges
    if (balloonConfig.optime < 1 || balloonConfig.optime > 100) return 0;
    if (balloonConfig.cotime < 1 || balloonConfig.cotime > 100) return 0;
    if (balloonConfig.top_temp_threshold < 50 || balloonConfig.top_temp_threshold > 200) return 0;
    if (balloonConfig.bottom_temp_threshold < 50 || balloonConfig.bottom_temp_threshold > 200) return 0;
    if (balloonConfig.top_temp_offset > 500) return 0; // assuming offset is small
    if (balloonConfig.bottom_temp_offset > 500) return 0;
    if (balloonConfig.menu_reset_delay < 1 || balloonConfig.menu_reset_delay > 60) return 0;
    if (balloonConfig.time_calibration < 50 || balloonConfig.time_calibration > 150) return 0;
    if (balloonConfig.max_temp_error < 100 || balloonConfig.max_temp_error > 350) return 0;
    if (balloonConfig.vcc_voltage_error < 10 || balloonConfig.vcc_voltage_error > 50) return 0;
    if (balloonConfig.power_temp_error < 20 || balloonConfig.power_temp_error > 100) return 0;
    if (balloonConfig.power_vcc_error > 50) return 0; // Add check
    if (balloonConfig.sys_error > 255) return 0; // Add check (though uint8_t max is 255, redundant but safe)
    if (balloonConfig.voltage_calibration < 100 || balloonConfig.voltage_calibration > 150) return 0;
    if (balloonConfig.heater_error_enable > 50) return 0;
    if (balloonConfig.cooling_delay < 10 || balloonConfig.cooling_delay > 200) return 0;
    if (balloonConfig.use_internal_adc > 1) return 0;
    return 1; // valid
}

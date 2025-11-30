/*
 * config.c
 *
 *  Created on: Nov 22, 2025
 *      Author: ASUS
 */

#include "config.h"
#include "flash.h"
#include "cmsis_os.h"
#include "utils.h"

// Global variables
BalloonConfig_t balloonConfig;

extern osMutexId_t configMutexHandle;


// The virtual address table for EEPROM emulation. Must match NB_OF_VAR in flash.h and config variables in config.h
// definition of VirtAddVarTab for NB_OF_VAR = 18
// Used for EEPROM emulation variable identification
uint16_t VirtAddVarTab[NB_OF_VAR] = {
    0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000A,
    0x000B, 0x000C, 0x000D, 0x000E, 0x000F, 0x0010, 0x0011, 0x0012
};

// --------------------------------------- SYSTEM CONFIG ---------------------------------------------

void BalloonConfig_Init(void) {
    EE_Init();
    if(osSemaphoreAcquire(configMutexHandle, osWaitForever) == osOK) {
        uint16_t val;
        // Try reading first_boot flag
        if (EE_ReadVariable(VAR_FIRST_BOOT, &val) != EE_OK || val != 0xA5) {
            // EEPROM uninitialized or corrupted → store defaults
            balloonConfig.optime               = 10;
            balloonConfig.cotime               = 5;
            balloonConfig.top_temp_threshold   = 110;
            balloonConfig.bottom_temp_threshold= 110;
            balloonConfig.top_temp_offset      = 0;
            balloonConfig.bottom_temp_offset   = 0;
            balloonConfig.menu_reset_delay     = 15;
            balloonConfig.time_calibration     = 100;
            balloonConfig.max_temp_error       = 150;
            balloonConfig.vcc_voltage_error    = 24;
            balloonConfig.power_temp_error     = 40;
            balloonConfig.power_vcc_error      = 0;
            balloonConfig.sys_error            = 0;
            balloonConfig.voltage_calibration  = 125;
            balloonConfig.heater_error_enable  = 5;
            balloonConfig.cooling_delay        = 75;
            balloonConfig.first_boot           = 0xA5;
            balloonConfig.use_internal_adc     = 0;

            BalloonConfig_SaveAll(); // write defaults to flash
        } else {
            BalloonConfig_Load(); // load saved data
            // Validate EEPROM integrity
            if (!BalloonConfig_Validate()) {
                usb_printf("Flash integrity check failed, using defaults\r\n");
                BalloonConfig_ForceReset();
            }
        }
        osSemaphoreRelease(configMutexHandle);
    } else {
        usb_printf("ERROR: Mutex acquire failed in BalloonConfig_Init\r\n");
    }
}

void BalloonConfig_Load(void) {
    uint16_t val;
    EE_ReadVariable(VAR_OPTIME, &val);                balloonConfig.optime = val;
    EE_ReadVariable(VAR_COTIME, &val);                balloonConfig.cotime = val;
    EE_ReadVariable(VAR_TOP_TEMP_THRESHOLD, &val);    balloonConfig.top_temp_threshold = val;
    EE_ReadVariable(VAR_BOTTOM_TEMP_THRESHOLD, &val); balloonConfig.bottom_temp_threshold = val;
    EE_ReadVariable(VAR_TOP_TEMP_OFFSET, &val);       balloonConfig.top_temp_offset = val;
    EE_ReadVariable(VAR_BOTTOM_TEMP_OFFSET, &val);    balloonConfig.bottom_temp_offset = val;
    EE_ReadVariable(VAR_MENU_RESET_DELAY, &val);      balloonConfig.menu_reset_delay = val;
    EE_ReadVariable(VAR_TIME_CALIBRATION, &val);      balloonConfig.time_calibration = val;
    EE_ReadVariable(VAR_MAX_TEMP_ERROR, &val);        balloonConfig.max_temp_error = val;
    EE_ReadVariable(VAR_VCC_VOLTAGE_ERROR, &val);     balloonConfig.vcc_voltage_error = val;
    EE_ReadVariable(VAR_POWER_TEMP_ERROR, &val);      balloonConfig.power_temp_error = val;
    EE_ReadVariable(VAR_POWER_VCC_ERROR, &val);       balloonConfig.power_vcc_error = val;
    EE_ReadVariable(VAR_SYS_ERROR, &val);             balloonConfig.sys_error = val;
    EE_ReadVariable(VAR_VOLTAGE_CALIBRATION, &val);   balloonConfig.voltage_calibration = val;
    EE_ReadVariable(VAR_HEATER_ERROR_ENABLE, &val);   balloonConfig.heater_error_enable = val;
    EE_ReadVariable(VAR_COOLING_DELAY, &val);         balloonConfig.cooling_delay = val;
    EE_ReadVariable(VAR_FIRST_BOOT, &val);            balloonConfig.first_boot = val;
		EE_ReadVariable(VAR_USE_INTERNAL_ADC, &val);      balloonConfig.use_internal_adc = val;
}

void BalloonConfig_SaveAll(void) {
	uint8_t allOk = 1;
	if (EE_WriteVariable(VAR_OPTIME, balloonConfig.optime) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_TOP_TEMP_THRESHOLD, balloonConfig.top_temp_threshold) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_BOTTOM_TEMP_THRESHOLD, balloonConfig.bottom_temp_threshold) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_TOP_TEMP_OFFSET, balloonConfig.top_temp_offset) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_BOTTOM_TEMP_OFFSET, balloonConfig.bottom_temp_offset) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_MENU_RESET_DELAY, balloonConfig.menu_reset_delay) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_TIME_CALIBRATION, balloonConfig.time_calibration) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_MAX_TEMP_ERROR, balloonConfig.max_temp_error) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_VCC_VOLTAGE_ERROR, balloonConfig.vcc_voltage_error) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_POWER_TEMP_ERROR, balloonConfig.power_temp_error) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_POWER_VCC_ERROR, balloonConfig.power_vcc_error) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_SYS_ERROR, balloonConfig.sys_error) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_VOLTAGE_CALIBRATION, balloonConfig.voltage_calibration) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_HEATER_ERROR_ENABLE, balloonConfig.heater_error_enable) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_COOLING_DELAY, balloonConfig.cooling_delay) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_FIRST_BOOT, balloonConfig.first_boot) != EE_OK) allOk=0;
	if (EE_WriteVariable(VAR_USE_INTERNAL_ADC, balloonConfig.use_internal_adc) == EE_OK) allOk=0;

	if (!allOk) usb_printf("ERROR: Failed to save all config variables to flash\r\n");
}

void BalloonConfig_Update(uint16_t varID, uint8_t value) {
    if (EE_WriteVariable(varID, value) != EE_OK) {
        usb_printf("ERROR: Failed to update varID 0x%04X\r\n", varID);
    }

    // Update RAM copy as well
    switch (varID) {
        case VAR_OPTIME: balloonConfig.optime = value; break;
        case VAR_COTIME: balloonConfig.cotime = value; break;
        case VAR_TOP_TEMP_THRESHOLD: balloonConfig.top_temp_threshold = value; break;
        case VAR_BOTTOM_TEMP_THRESHOLD: balloonConfig.bottom_temp_threshold = value; break;
        case VAR_TOP_TEMP_OFFSET: balloonConfig.top_temp_offset = value; break;
        case VAR_BOTTOM_TEMP_OFFSET: balloonConfig.bottom_temp_offset = value; break;
        case VAR_MENU_RESET_DELAY: balloonConfig.menu_reset_delay = value; break;
        case VAR_TIME_CALIBRATION: balloonConfig.time_calibration = value; break;
        case VAR_MAX_TEMP_ERROR: balloonConfig.max_temp_error = value; break;
        case VAR_VCC_VOLTAGE_ERROR: balloonConfig.vcc_voltage_error = value; break;
        case VAR_POWER_TEMP_ERROR: balloonConfig.power_temp_error = value; break;
        case VAR_POWER_VCC_ERROR: balloonConfig.power_vcc_error = value; break;
        case VAR_SYS_ERROR: balloonConfig.sys_error = value; break;
        case VAR_VOLTAGE_CALIBRATION: balloonConfig.voltage_calibration = value; break;
        case VAR_HEATER_ERROR_ENABLE: balloonConfig.heater_error_enable = value; break;
        case VAR_COOLING_DELAY: balloonConfig.cooling_delay = value; break;
        case VAR_FIRST_BOOT: balloonConfig.first_boot = value; break;
				case VAR_USE_INTERNAL_ADC: balloonConfig.use_internal_adc = value; break;
				default: break; // Unknown varID
    }
}

void BalloonConfig_ForceReset(void) {
    EE_WriteVariable(VAR_FIRST_BOOT, 0x00); // Set to 0x00 to force default branch
    BalloonConfig_Init();
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
    if (balloonConfig.max_temp_error < 100 || balloonConfig.max_temp_error > 250) return 0;
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

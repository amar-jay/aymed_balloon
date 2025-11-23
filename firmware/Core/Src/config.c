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

// --------------------------------------- SYSTEM CONFIG ---------------------------------------------

void BalloonConfig_Init(void) {
    EE_Init();
    if(osSemaphoreAcquire(configMutexHandle, osWaitForever) == osOK) {
		uint16_t val;
		// Try reading first_boot flag. if not write only on first boot
		if (EE_ReadVariable(VAR_FIRST_BOOT, &val) != EE_OK || val != 0xA5) {
			if (val != 0xA5){
				// EEPROM uninitialized → store defaults
				balloonConfig.optime               = 10;
				balloonConfig.cotime               = 5;
				balloonConfig.top_temp_threshold   = 110;
				balloonConfig.bottom_temp_threshold= 110;
				balloonConfig.temp1_offset         = 220;
				balloonConfig.temp2_offset         = 220;
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

				BalloonConfig_SaveAll(); // write defaults
			} else {
				BalloonConfig_Load(); // load saved data
			}
	} else {
		usb_printf("ERROR: EEPROM Read Failed - Using Defaults\r\n");
	}
    osSemaphoreRelease(configMutexHandle);
  }
}

void BalloonConfig_Load(void) {
    uint16_t val;
    EE_ReadVariable(VAR_OPTIME, &val);                balloonConfig.optime = val;
    EE_ReadVariable(VAR_COTIME, &val);                balloonConfig.cotime = val;
    EE_ReadVariable(VAR_TOP_TEMP_THRESHOLD, &val);    balloonConfig.top_temp_threshold = val;
    EE_ReadVariable(VAR_BOTTOM_TEMP_THRESHOLD, &val); balloonConfig.bottom_temp_threshold = val;
    EE_ReadVariable(VAR_TEMP1_OFFSET, &val);          balloonConfig.temp1_offset = val;
    EE_ReadVariable(VAR_TEMP2_OFFSET, &val);          balloonConfig.temp2_offset = val;
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
}

void BalloonConfig_SaveAll(void) {
    EE_WriteVariable(VAR_OPTIME, balloonConfig.optime);
    EE_WriteVariable(VAR_COTIME, balloonConfig.cotime);
    EE_WriteVariable(VAR_TOP_TEMP_THRESHOLD, balloonConfig.top_temp_threshold);
    EE_WriteVariable(VAR_BOTTOM_TEMP_THRESHOLD, balloonConfig.bottom_temp_threshold);
    EE_WriteVariable(VAR_TEMP1_OFFSET, balloonConfig.temp1_offset);
    EE_WriteVariable(VAR_TEMP2_OFFSET, balloonConfig.temp2_offset);
    EE_WriteVariable(VAR_MENU_RESET_DELAY, balloonConfig.menu_reset_delay);
    EE_WriteVariable(VAR_TIME_CALIBRATION, balloonConfig.time_calibration);
    EE_WriteVariable(VAR_MAX_TEMP_ERROR, balloonConfig.max_temp_error);
    EE_WriteVariable(VAR_VCC_VOLTAGE_ERROR, balloonConfig.vcc_voltage_error);
    EE_WriteVariable(VAR_POWER_TEMP_ERROR, balloonConfig.power_temp_error);
    EE_WriteVariable(VAR_POWER_VCC_ERROR, balloonConfig.power_vcc_error);
    EE_WriteVariable(VAR_SYS_ERROR, balloonConfig.sys_error);
    EE_WriteVariable(VAR_VOLTAGE_CALIBRATION, balloonConfig.voltage_calibration);
    EE_WriteVariable(VAR_HEATER_ERROR_ENABLE, balloonConfig.heater_error_enable);
    EE_WriteVariable(VAR_COOLING_DELAY, balloonConfig.cooling_delay);
    EE_WriteVariable(VAR_FIRST_BOOT, balloonConfig.first_boot);
}

void BalloonConfig_Update(uint16_t varID, uint8_t value) {
    EE_WriteVariable(varID, value);

    // Update RAM copy as well
    switch (varID) {
        case VAR_OPTIME: balloonConfig.optime = value; break;
        case VAR_COTIME: balloonConfig.cotime = value; break;
        case VAR_TOP_TEMP_THRESHOLD: balloonConfig.top_temp_threshold = value; break;
        case VAR_BOTTOM_TEMP_THRESHOLD: balloonConfig.bottom_temp_threshold = value; break;
        case VAR_TEMP1_OFFSET: balloonConfig.temp1_offset = value; break;
        case VAR_TEMP2_OFFSET: balloonConfig.temp2_offset = value; break;
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
    }
}

void BalloonConfig_ForceReset(void) {
	EE_WriteVariable(VAR_FIRST_BOOT, 0xA5);
	BalloonConfig_Init();
}

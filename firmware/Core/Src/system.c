/*
 * system.c
 *
 *  Created on: Nov 6, 2025
 *      Author: ASUS
 */
#include <math.h>
#include <stdarg.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>
#include "system.h"
#include "main.h"
#include "flash.h"
#include "ads1115.h"
#include "utils.h"


#include "cmsis_os.h"

// Global variables
SystemConfig_t sysConfig;
SystemState_t state;

extern UART_HandleTypeDef huart2;
extern ADC_HandleTypeDef hadc1;

extern osSemaphoreId_t uartSemaphoreHandle;
extern osMutexId_t configMutexHandle;
extern osMutexId_t stateMutexHandle;

extern I2C_HandleTypeDef hi2c1;


double ComputeTemperature(int16_t adc_value)
{
    // Convert ADC reading to voltage
    double v_out = (adc_value / ADC_MAX) * V_SUPPLY;

    // Compute NTC resistance from bridge equation
    double r_ntc = R_FIXED * (V_SUPPLY - 2 * v_out) / (V_SUPPLY + 2 * v_out);

    // Protect against invalid results
    if (r_ntc <= 0)
        return -273.15;  // invalid reading

    // Compute temperature using Beta formula
    double temp_k = 1.0 / ((1.0 / T0) + (1.0 / BETA) * log(r_ntc / R0));
    double temp_c = temp_k - 273.15;

    return temp_c;
}


// Buzzer Control
void BuzzerBeep(uint16_t duration_ms, uint16_t count) {
  for(uint16_t i = 0; i < count; i++) {
    HAL_GPIO_WritePin(BUZZER_GPIO_Port, BUZZER_Pin, GPIO_PIN_SET);
    osDelay(duration_ms);
    HAL_GPIO_WritePin(BUZZER_GPIO_Port, BUZZER_Pin, GPIO_PIN_RESET);
    if(i < count - 1) osDelay(100);
  }
}

void PrintError(ErrorCode_t code) {
    switch (code) {
        case ERR_NONE:
            break;
        case ERR_TOP_HEATER_NTC:
            usb_printf("Error: Top heater NTC sensor fault.\r\n");
            break;
        case ERR_BOTTOM_HEATER_NTC:
            usb_printf("Error: Bottom heater NTC sensor fault.\r\n");
            break;
        case ERR_POWER_SUPPLY_NTC:
            usb_printf("Error: Power supply NTC sensor fault.\r\n");
            break;
        case ERR_POWER_SUPPLY_HIGH_TEMP:
            usb_printf("Error: Power supply temperature too high.\r\n");
            break;
        case ERR_LOW_VOLTAGE:
            usb_printf("Error: Input voltage too low.\r\n");
            break;
        case ERR_HIGH_VOLTAGE:
            usb_printf("Error: Input voltage too high.\r\n");
            break;
        case ERR_TOP_HEATER_HIGH_TEMP:
            usb_printf("Error: Top heater temperature too high.\r\n");
            break;
        case ERR_BOTTOM_HEATER_HIGH_TEMP:
            usb_printf("Error: Bottom heater temperature too high.\r\n");
            break;
        case ERR_TOP_HEATER_HEATING:
            usb_printf("Error: Top heater failed to heat properly.\r\n");
            break;
        case ERR_BOTTOM_HEATER_HEATING:
            usb_printf("Error: Bottom heater failed to heat properly.\r\n");
            break;
        case ERR_PEDAL_LOCKED:
            usb_printf("Error: Pedal is locked or not responding.\r\n");
            break;
        default:
            usb_printf("Unknown error code.\r\n");
            break;
    }
}


typedef struct {
    int opTime;
    int coTime;
    int topTempThreshold;
    int bottomTempThreshold;
    int temp1Offset;
    int temp2Offset;
    int menuResetDelay;
    int timeCalibration;
    int maxTempError;
    int vccVoltageError;
    int powerTempError;
    int powerVccErrorEnabled;
    int sysErrorEnabled;
    int voltageCalibration;
    int heaterErrorEnable;
    int coolingDelay;
} SystemConfig;




// --------------------------------------- SYSTEM CONFIG ---------------------------------------------

void SystemConfig_Init(void) {
    EE_Init();
    if(osSemaphoreAcquire(configMutexHandle, osWaitForever) == osOK) {
		uint16_t val;
		// Try reading first_boot flag. if not write only on first boot
		if (EE_ReadVariable(VAR_FIRST_BOOT, &val) != EE_OK || val != 0xA5) {
			if (val != 0xA5){
				// EEPROM uninitialized → store defaults
				sysConfig.optime               = 10;
				sysConfig.cotime               = 5;
				sysConfig.top_temp_threshold   = 110;
				sysConfig.bottom_temp_threshold= 110;
				sysConfig.temp1_offset         = 220;
				sysConfig.temp2_offset         = 220;
				sysConfig.menu_reset_delay     = 15;
				sysConfig.time_calibration     = 100;
				sysConfig.max_temp_error       = 150;
				sysConfig.vcc_voltage_error    = 24;
				sysConfig.power_temp_error     = 40;
				sysConfig.power_vcc_error      = 0;
				sysConfig.sys_error            = 0;
				sysConfig.voltage_calibration  = 125;
				sysConfig.heater_error_enable  = 5;
				sysConfig.cooling_delay        = 75;
				sysConfig.first_boot           = 0xA5;

				SystemConfig_SaveAll(); // write defaults
			} else {
				SystemConfig_Load(); // load saved data
			}
	} else {
		usb_printf("something real wrong with this shit!");
	}
    osSemaphoreRelease(configMutexHandle);
  }
}

void SystemConfig_Load(void) {
    uint16_t val;
    EE_ReadVariable(VAR_OPTIME, &val);                sysConfig.optime = val;
    EE_ReadVariable(VAR_COTIME, &val);                sysConfig.cotime = val;
    EE_ReadVariable(VAR_TOP_TEMP_THRESHOLD, &val);    sysConfig.top_temp_threshold = val;
    EE_ReadVariable(VAR_BOTTOM_TEMP_THRESHOLD, &val); sysConfig.bottom_temp_threshold = val;
    EE_ReadVariable(VAR_TEMP1_OFFSET, &val);          sysConfig.temp1_offset = val;
    EE_ReadVariable(VAR_TEMP2_OFFSET, &val);          sysConfig.temp2_offset = val;
    EE_ReadVariable(VAR_MENU_RESET_DELAY, &val);      sysConfig.menu_reset_delay = val;
    EE_ReadVariable(VAR_TIME_CALIBRATION, &val);      sysConfig.time_calibration = val;
    EE_ReadVariable(VAR_MAX_TEMP_ERROR, &val);        sysConfig.max_temp_error = val;
    EE_ReadVariable(VAR_VCC_VOLTAGE_ERROR, &val);     sysConfig.vcc_voltage_error = val;
    EE_ReadVariable(VAR_POWER_TEMP_ERROR, &val);      sysConfig.power_temp_error = val;
    EE_ReadVariable(VAR_POWER_VCC_ERROR, &val);       sysConfig.power_vcc_error = val;
    EE_ReadVariable(VAR_SYS_ERROR, &val);             sysConfig.sys_error = val;
    EE_ReadVariable(VAR_VOLTAGE_CALIBRATION, &val);   sysConfig.voltage_calibration = val;
    EE_ReadVariable(VAR_HEATER_ERROR_ENABLE, &val);   sysConfig.heater_error_enable = val;
    EE_ReadVariable(VAR_COOLING_DELAY, &val);         sysConfig.cooling_delay = val;
    EE_ReadVariable(VAR_FIRST_BOOT, &val);            sysConfig.first_boot = val;
}

void SystemConfig_SaveAll(void) {
    EE_WriteVariable(VAR_OPTIME, sysConfig.optime);
    EE_WriteVariable(VAR_COTIME, sysConfig.cotime);
    EE_WriteVariable(VAR_TOP_TEMP_THRESHOLD, sysConfig.top_temp_threshold);
    EE_WriteVariable(VAR_BOTTOM_TEMP_THRESHOLD, sysConfig.bottom_temp_threshold);
    EE_WriteVariable(VAR_TEMP1_OFFSET, sysConfig.temp1_offset);
    EE_WriteVariable(VAR_TEMP2_OFFSET, sysConfig.temp2_offset);
    EE_WriteVariable(VAR_MENU_RESET_DELAY, sysConfig.menu_reset_delay);
    EE_WriteVariable(VAR_TIME_CALIBRATION, sysConfig.time_calibration);
    EE_WriteVariable(VAR_MAX_TEMP_ERROR, sysConfig.max_temp_error);
    EE_WriteVariable(VAR_VCC_VOLTAGE_ERROR, sysConfig.vcc_voltage_error);
    EE_WriteVariable(VAR_POWER_TEMP_ERROR, sysConfig.power_temp_error);
    EE_WriteVariable(VAR_POWER_VCC_ERROR, sysConfig.power_vcc_error);
    EE_WriteVariable(VAR_SYS_ERROR, sysConfig.sys_error);
    EE_WriteVariable(VAR_VOLTAGE_CALIBRATION, sysConfig.voltage_calibration);
    EE_WriteVariable(VAR_HEATER_ERROR_ENABLE, sysConfig.heater_error_enable);
    EE_WriteVariable(VAR_COOLING_DELAY, sysConfig.cooling_delay);
    EE_WriteVariable(VAR_FIRST_BOOT, sysConfig.first_boot);
}

void SystemConfig_Update(uint16_t varID, uint8_t value) {
    EE_WriteVariable(varID, value);

    // Update RAM copy as well
    switch (varID) {
        case VAR_OPTIME: sysConfig.optime = value; break;
        case VAR_COTIME: sysConfig.cotime = value; break;
        case VAR_TOP_TEMP_THRESHOLD: sysConfig.top_temp_threshold = value; break;
        case VAR_BOTTOM_TEMP_THRESHOLD: sysConfig.bottom_temp_threshold = value; break;
        case VAR_TEMP1_OFFSET: sysConfig.temp1_offset = value; break;
        case VAR_TEMP2_OFFSET: sysConfig.temp2_offset = value; break;
        case VAR_MENU_RESET_DELAY: sysConfig.menu_reset_delay = value; break;
        case VAR_TIME_CALIBRATION: sysConfig.time_calibration = value; break;
        case VAR_MAX_TEMP_ERROR: sysConfig.max_temp_error = value; break;
        case VAR_VCC_VOLTAGE_ERROR: sysConfig.vcc_voltage_error = value; break;
        case VAR_POWER_TEMP_ERROR: sysConfig.power_temp_error = value; break;
        case VAR_POWER_VCC_ERROR: sysConfig.power_vcc_error = value; break;
        case VAR_SYS_ERROR: sysConfig.sys_error = value; break;
        case VAR_VOLTAGE_CALIBRATION: sysConfig.voltage_calibration = value; break;
        case VAR_HEATER_ERROR_ENABLE: sysConfig.heater_error_enable = value; break;
        case VAR_COOLING_DELAY: sysConfig.cooling_delay = value; break;
        case VAR_FIRST_BOOT: sysConfig.first_boot = value; break;
    }
}

void SystemConfig_ForceReset(void) {
	EE_WriteVariable(VAR_FIRST_BOOT, 0xA5);
	SystemConfig_Init();
}

// -------------------------------------------
void ControlTempreture(void) {
	float value;
	char msg[64];
	osMutexAcquire(stateMutexHandle, osWaitForever);
	  if (ads1115_read_P0NG(&state.ads1115, &value) == HAL_OK) {
		  state.temp1 = ComputeTemperature(value);
		  snprintf(msg, sizeof(msg), "Current Temperature of A0: %d\r\n", state.temp1);
		  usb_printf(msg);
	  }
	  osMutexRelease(stateMutexHandle);
	  osDelay(10);

	  osMutexAcquire(stateMutexHandle, osWaitForever);
	  if (ads1115_read_P1NG(&state.ads1115, &value) == HAL_OK) {
		  state.temp2 = ComputeTemperature(value);
		  snprintf(msg, sizeof(msg), "Current Temperature of A1: %d\r\n", state.temp2);
		  usb_printf(msg);
	  }
	  osMutexRelease(stateMutexHandle);
	  osDelay(10);

	  osMutexAcquire(stateMutexHandle, osWaitForever);
	  if (ads1115_read_P2NG(&state.ads1115, &value) == HAL_OK) {
		  state.temp3 = ComputeTemperature(value);
		  snprintf(msg, sizeof(msg), "Current Temperature of A2: %d\r\n", state.temp3);
		  usb_printf(msg);
	  }
	  osMutexRelease(stateMutexHandle);
	  osDelay(10);

	  osMutexAcquire(stateMutexHandle, osWaitForever);
	  if (ads1115_read_P3NG(&state.ads1115, &value) == HAL_OK) {
		  state.vcc = ComputeTemperature(value);
		  snprintf(msg, sizeof(msg), "Current Temperature of A3: %d\r\n", state.vcc);
		  usb_printf(msg);
	  }
	  osMutexRelease(stateMutexHandle);
	  osDelay(10);
}
void ControlHeater(void){
	osMutexAcquire(stateMutexHandle, osWaitForever);
	osMutexAcquire(configMutexHandle, osWaitForever);

	bool heaters_enable = (state.op_state != OP_STANDBY && state.error == ERR_NONE);

	// Top heater control
	if(state.temp1 < sysConfig.top_temp_threshold && heaters_enable) {
	  HAL_GPIO_WritePin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin, GPIO_PIN_SET);
	  HAL_GPIO_WritePin(TOP_HEATER2_GPIO_Port, TOP_HEATER2_Pin, GPIO_PIN_SET);
	} else {
	  HAL_GPIO_WritePin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin, GPIO_PIN_RESET);
	  HAL_GPIO_WritePin(TOP_HEATER2_GPIO_Port, TOP_HEATER2_Pin, GPIO_PIN_RESET);
	}

	// Bottom heater control
	if(state.temp2 < sysConfig.bottom_temp_threshold && heaters_enable) {
	  HAL_GPIO_WritePin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin, GPIO_PIN_SET);
	  HAL_GPIO_WritePin(BOTTOM_HEATER2_GPIO_Port, BOTTOM_HEATER2_Pin, GPIO_PIN_SET);
	} else {
	  HAL_GPIO_WritePin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin, GPIO_PIN_RESET);
	  HAL_GPIO_WritePin(BOTTOM_HEATER2_GPIO_Port, BOTTOM_HEATER2_Pin, GPIO_PIN_RESET);
	}

	osMutexRelease(configMutexHandle);
	osMutexRelease(stateMutexHandle);
}


void ControlError(void) {
    osMutexAcquire(stateMutexHandle, osWaitForever);
    osMutexAcquire(configMutexHandle, osWaitForever);


    // remove later


    if(state.error == ERR_NONE) {
      // Temperature sensor errors
      if(state.temp1 < 1) state.error = ERR_TOP_HEATER_NTC;
      else if(state.temp2 < 1) state.error = ERR_BOTTOM_HEATER_NTC;
      else if(state.temp3 < 1) state.error = ERR_POWER_SUPPLY_NTC;

      // Temperature limit errors
      else if(state.temp1 > sysConfig.max_temp_error) state.error = ERR_TOP_HEATER_HIGH_TEMP;
      else if(state.temp2 > sysConfig.max_temp_error) state.error = ERR_BOTTOM_HEATER_HIGH_TEMP;
      else if(state.temp3 >= sysConfig.power_temp_error) state.error = ERR_POWER_SUPPLY_HIGH_TEMP;

      // Voltage errors
      else if(sysConfig.power_vcc_error == 0 && state.vcc < sysConfig.vcc_voltage_error - 1) {
        state.error = ERR_LOW_VOLTAGE;
      }
      else if(sysConfig.power_vcc_error == 0 && state.vcc > sysConfig.vcc_voltage_error) {
        state.error = ERR_HIGH_VOLTAGE;
      }

      // Heater differential error
      else if(state.temp2 > state.temp1 + sysConfig.heater_error_enable) {
        state.error = ERR_TOP_HEATER_HEATING;
      }
      else if(state.temp1 > state.temp2 + sysConfig.heater_error_enable) {
        state.error = ERR_BOTTOM_HEATER_HEATING;
      }

      // If error detected and system error checking is enabled
      if(state.error != ERR_NONE && sysConfig.sys_error == 0) {
        BuzzerBeep(750, 1);
        state.menu_active = true;
        state.menu_state = MENU_SYSTEM_ERROR;
        state.op_state = OP_STANDBY;
        PrintError(state.error);
      }
    }
    osMutexRelease(configMutexHandle);
    osMutexRelease(stateMutexHandle);
}

// --------------------------- UART Serial Ops -----------------------------------------
// UART Printf Implementation
uint8_t rx_line[RX_BUFFER_SIZE];
uint8_t rx_index = 0;
void usb_scanf(UART_HandleTypeDef* huart, uint8_t* rx_char)
{
    if (huart->Instance == USART2) {
        if (*rx_char == '\n' || *rx_char == '\r') {
            rx_line[rx_index] = '\0';  // terminate string

            // parse command
            process_command((char *)rx_line, &sysConfig);

            // reset buffer
            rx_index = 0;
        } else if (rx_index < RX_BUFFER_SIZE - 1) {
            rx_line[rx_index++] = *rx_char;
        }

        // restart interrupt reception
        HAL_UART_Receive_IT(huart, rx_char, 1);
        HAL_UART_Receive_IT(huart, rx_char, 1);
    }
}


void BalloonSystemInit(void) {
	 state.ads1115 = ads1115_hal_init(&hi2c1, ADS1115_DEFAULT_CONFIG());
	 SystemConfig_Init();
}

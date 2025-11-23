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
#include "config.h"
#include "stm32f4xx_hal_uart.h"


#include "cmsis_os.h"

// Global variables
extern BalloonConfig_t balloonConfig; // Will be used later. is this right? since it is defined in config.c
BalloonState_t balloonState;

extern UART_HandleTypeDef huart4;
extern ADC_HandleTypeDef hadc1;

extern osSemaphoreId_t uartSemaphoreHandle;
extern osMutexId_t configMutexHandle;
extern osMutexId_t stateMutexHandle;

extern I2C_HandleTypeDef hi2c1;


#define NTC_A 0.001129148
#define NTC_B 0.000234125
#define NTC_C 0.0000000876741

#define V_SUPPLY_MV 3300.0
#define R_FIXED 10000.0   // 10k series resistor

static inline double compute_ntc_temperature(float v_out_mv)
{
    if (v_out_mv <= 0.0 || v_out_mv >= V_SUPPLY_MV) {
        return -999.0; // invalid reading
    }

    // Convert voltage to resistance
    // Vout = Vsupply * Rntc / (Rfixed + Rntc)  <-- assuming Rntc is bottom resistor
    // OR
    // Vout = Vsupply * Rfixed / (Rfixed + Rntc) <-- assuming Rfixed is bottom resistor
    
    // Based on previous code: r_ntc = R_FIXED * (V_SUPPLY - 2 * v_out) / (V_SUPPLY + 2 * v_out);
    // That was for a bridge.
    // The new code: R_ntc = R_FIXED * (ADC_MAX / adc_raw - 1.0);
    // This implies a simple divider where ADC_MAX/adc_raw = Vsupply/Vout
    // So Vsupply/Vout = (Rfixed + Rntc) / Rntc  (if Rntc is bottom) -> Rfixed/Rntc + 1 -> Rntc = Rfixed / (Vsupply/Vout - 1)
    // The user's formula: R_ntc = R_FIXED * (Vsupply/Vout - 1.0)
    // This implies Vsupply/Vout = Rntc/Rfixed + 1 -> Vsupply/Vout = (Rntc + Rfixed)/Rfixed -> Vout = Vsupply * Rfixed / (Rntc + Rfixed)
    // So Rfixed is the bottom resistor (across which we measure Vout).
    
    double R_ntc = R_FIXED * (V_SUPPLY_MV / v_out_mv - 1.0);

    double lnR = log(R_ntc);

    // Steinhart–Hart equation
    double inv_T = NTC_A + NTC_B * lnR + NTC_C * lnR * lnR * lnR;
    double temp_K = 1.0 / inv_T;

    // Convert to Celsius
    return temp_K - 273.15;
}

double ComputeTopHeaterTemperature(float mv)
{
    double baseTempC = compute_ntc_temperature(mv);

    double offset = 0;
    if (osMutexAcquire(configMutexHandle, osWaitForever) == osOK) {
        offset = balloonConfig.temp1_offset;
        osMutexRelease(configMutexHandle);
    }

    return baseTempC - offset;
}

double ComputeBottomHeaterTemperature(float mv)
{
    double baseTempC = compute_ntc_temperature(mv);

    double offset = 0;
    if (osMutexAcquire(configMutexHandle, osWaitForever) == osOK) {
        offset = balloonConfig.temp2_offset;
        osMutexRelease(configMutexHandle);
    }

    return baseTempC - offset;
}

double ComputePowerSupplyTemperature(float mv)
{
    double baseTempC = compute_ntc_temperature(mv);

    // Your calibration constant
    return baseTempC - 275.15;
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
            usb_printf("ERROR: Top heater NTC sensor fault.\r\n");
            break;
        case ERR_BOTTOM_HEATER_NTC:
            usb_printf("ERROR: Bottom heater NTC sensor fault.\r\n");
            break;
        case ERR_POWER_SUPPLY_NTC:
            usb_printf("ERROR: Power supply NTC sensor fault.\r\n");
            break;
        case ERR_POWER_SUPPLY_HIGH_TEMP:
            usb_printf("ERROR: Power supply temperature too high.\r\n");
            break;
        case ERR_LOW_VOLTAGE:
            usb_printf("ERROR: Input voltage too low.\r\n");
            break;
        case ERR_HIGH_VOLTAGE:
            usb_printf("ERROR: Input voltage too high.\r\n");
            break;
        case ERR_TOP_HEATER_HIGH_TEMP:
            usb_printf("ERROR: Top heater temperature too high.\r\n");
            break;
        case ERR_BOTTOM_HEATER_HIGH_TEMP:
            usb_printf("ERROR: Bottom heater temperature too high.\r\n");
            break;
        case ERR_TOP_HEATER_HEATING:
            usb_printf("ERROR: Top heater failed to heat properly.\r\n");
            break;
        case ERR_BOTTOM_HEATER_HEATING:
            usb_printf("ERROR: Bottom heater failed to heat properly.\r\n");
            break;
        case ERR_PEDAL_LOCKED:
            usb_printf("ERROR: Pedal is locked or not responding.\r\n");
            break;
        default:
            usb_printf("Unknown error code.\r\n");
            break;
    }
}


// -------------------------------------------
void MonitorSensors(void) {
	float value;
	char msg[64];
	osMutexAcquire(stateMutexHandle, 100);
	  if (ads1115_read_P0NG(&balloonState.ads1115, &value) == HAL_OK) {
		  balloonState.temp1 = (int16_t)ComputeTopHeaterTemperature(value);
		  snprintf(msg, sizeof(msg), "Current Temperature of A0: %d\r\n", balloonState.temp1);
		  usb_printf(msg);
	  }
	  osMutexRelease(stateMutexHandle);
	  osDelay(10);

	  osMutexAcquire(stateMutexHandle, 100);
	  if (ads1115_read_P1NG(&balloonState.ads1115, &value) == HAL_OK) {
		  balloonState.temp2 = (int16_t)ComputeBottomHeaterTemperature(value);
		  snprintf(msg, sizeof(msg), "Current Temperature of A1: %d\r\n", balloonState.temp2);
		  usb_printf(msg);
	  }
	  osMutexRelease(stateMutexHandle);
	  osDelay(10);

	  osMutexAcquire(stateMutexHandle, 100);
	  if (ads1115_read_P2NG(&balloonState.ads1115, &value) == HAL_OK) {
		  balloonState.temp3 = (int16_t)ComputePowerSupplyTemperature(value);
		  snprintf(msg, sizeof(msg), "Current Temperature of A2: %d\r\n", balloonState.temp3);
		  usb_printf(msg);
	  }
	  osMutexRelease(stateMutexHandle);
	  osDelay(10);

	  osMutexAcquire(stateMutexHandle, 100);
	  if (ads1115_read_P3NG(&balloonState.ads1115, &value) == HAL_OK) {
		  balloonState.vcc = (uint16_t)value; 
		  snprintf(msg, sizeof(msg), "Current Value of A3: %d\r\n", balloonState.vcc);
		  usb_printf(msg);
	  }
	  osMutexRelease(stateMutexHandle);
	  osDelay(10);

      // monitor proximity sensor (gpio)
      if (osMutexAcquire(stateMutexHandle, 100) == osOK) {
        balloonState.proximity = HAL_GPIO_ReadPin(PROXIMITY_SENSOR_GPIO_Port, PROXIMITY_SENSOR_Pin);
        osMutexRelease(stateMutexHandle);
        osDelay(10);
      }

      // pedal state
      if (osMutexAcquire(stateMutexHandle, 100) == osOK) {
        balloonState.pedal = HAL_GPIO_ReadPin(PEDAL_SWITCH_GPIO_Port, PEDAL_SWITCH_Pin);
        osMutexRelease(stateMutexHandle);
        osDelay(10);
      }
}


void ControlHeater(void){
	osMutexAcquire(stateMutexHandle, osWaitForever);
	osMutexAcquire(configMutexHandle, osWaitForever);

	bool heaters_enable = (balloonState.op_state != OP_STANDBY && balloonState.error == ERR_NONE);

	// Top heater control
	if(balloonState.temp1 < balloonConfig.top_temp_threshold && heaters_enable) {
	  HAL_GPIO_WritePin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin, GPIO_PIN_SET);
	  HAL_GPIO_WritePin(TOP_HEATER2_GPIO_Port, TOP_HEATER2_Pin, GPIO_PIN_SET);
	} else {
	  HAL_GPIO_WritePin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin, GPIO_PIN_RESET);
	  HAL_GPIO_WritePin(TOP_HEATER2_GPIO_Port, TOP_HEATER2_Pin, GPIO_PIN_RESET);
	}

	// Bottom heater control
	if(balloonState.temp2 < balloonConfig.bottom_temp_threshold && heaters_enable) {
	  HAL_GPIO_WritePin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin, GPIO_PIN_SET);
	  HAL_GPIO_WritePin(BOTTOM_HEATER2_GPIO_Port, BOTTOM_HEATER2_Pin, GPIO_PIN_SET);
	} else {
	  HAL_GPIO_WritePin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin, GPIO_PIN_RESET);
	  HAL_GPIO_WritePin(BOTTOM_HEATER2_GPIO_Port, BOTTOM_HEATER2_Pin, GPIO_PIN_RESET);
	}

	osMutexRelease(configMutexHandle);
	osMutexRelease(stateMutexHandle);
}


void MonitorError(void) {
    osMutexAcquire(stateMutexHandle, 100);
    osMutexAcquire(configMutexHandle, 100);


    if(balloonState.error == ERR_NONE) {
      // Temperature sensor errors
      if(balloonState.temp1 < 1) balloonState.error = ERR_TOP_HEATER_NTC;
      else if(balloonState.temp2 < 1) balloonState.error = ERR_BOTTOM_HEATER_NTC;
      else if(balloonState.temp3 < 1) balloonState.error = ERR_POWER_SUPPLY_NTC;

      // Temperature limit errors
      else if(balloonState.temp1 > balloonConfig.max_temp_error) balloonState.error = ERR_TOP_HEATER_HIGH_TEMP;
      else if(balloonState.temp2 > balloonConfig.max_temp_error) balloonState.error = ERR_BOTTOM_HEATER_HIGH_TEMP;
      else if(balloonState.temp3 >= balloonConfig.power_temp_error) balloonState.error = ERR_POWER_SUPPLY_HIGH_TEMP;

      // Voltage errors
      else if(balloonConfig.power_vcc_error == 0 && balloonState.vcc < balloonConfig.vcc_voltage_error - 1) {
        balloonState.error = ERR_LOW_VOLTAGE;
      }
      else if(balloonConfig.power_vcc_error == 0 && balloonState.vcc > balloonConfig.vcc_voltage_error) {
        balloonState.error = ERR_HIGH_VOLTAGE;
      }

      // Heater differential error
      else if(balloonState.temp2 > balloonState.temp1 + balloonConfig.heater_error_enable) {
        balloonState.error = ERR_TOP_HEATER_HEATING;
      }
      else if(balloonState.temp1 > balloonState.temp2 + balloonConfig.heater_error_enable) {
        balloonState.error = ERR_BOTTOM_HEATER_HEATING;
      }

      // If error detected and system error checking is enabled
      if(balloonState.error != ERR_NONE && balloonConfig.sys_error == 0) {
        balloonState.menu_active = true;
        balloonState.menu_state = MENU_SYSTEM_ERROR;
        balloonState.op_state = OP_STANDBY;
        PrintError(balloonState.error);
        BuzzerBeep(750, 1);
      }
    }
    osMutexRelease(configMutexHandle);
    osMutexRelease(stateMutexHandle);
}


// --------------------------- UART Serial Ops -----------------------------------------
// UART Printf Implementation

uint8_t rx_line[RX_BUFFER_SIZE];
uint8_t rx_index = 0;
uint8_t rx_byte = 0;   // the only RX byte variable

// Build line buffer and process commands
void LogCallbackHandler()
{
	  while (HAL_UART_Receive(&huart4, &rx_byte, 1, 10) == HAL_OK)
	  {
			if (rx_byte == '\n' || rx_byte == '\r')
			{
				osDelay(10);
				rx_line[rx_index] = '\0';  // terminate string
		        process_command((char *)rx_line, &balloonConfig, &balloonState);
				rx_index = 0;               // reset buffer
			}
			else if (rx_index < RX_BUFFER_SIZE - 1)
			{
				rx_line[rx_index++] = rx_byte;
			}
	  }
}


// Initialize the system and start RX interrupt
void BalloonSystemInit(void)
{
//    balloonState.ads1115 = ads1115_hal_init(&hi2c1, ADS1115_DEFAULT_CONFIG());
    BalloonConfig_Init();
}


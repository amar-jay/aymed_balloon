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
extern ADC_HandleTypeDef hadc2;

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

    // Convert voltage to NTC resistance
    // Circuit topology (voltage divider):
    //   VCC (3.3V)
    //       |
    //   R_NTC - top resistor (temperature dependent)
    //       |
    //       +--- Vout (measured voltage)
    //       |
    //   R_FIXED (10kΩ) - bottom resistor
    //       |
    //      GND
    //
    // Voltage divider formula: Vout = Vsupply * R_FIXED / (R_NTC + R_FIXED)
    // Solving for R_NTC:
    //   Vout * (R_NTC + R_FIXED) = Vsupply * R_FIXED
    //   Vout * R_NTC + Vout * R_FIXED = Vsupply * R_FIXED
    //   Vout * R_NTC = Vsupply * R_FIXED - Vout * R_FIXED
    //   Vout * R_NTC = R_FIXED * (Vsupply - Vout)
    //   R_NTC = R_FIXED * (Vsupply - Vout) / Vout
    //   R_NTC = R_FIXED * (Vsupply/Vout - 1)
    
    double R_ntc = R_FIXED * (V_SUPPLY_MV / v_out_mv - 1.0);

    double lnR = log(R_ntc);

    // Steinhart–Hart equation: 1/T = A + B*ln(R) + C*(ln(R))^3
    // where T is in Kelvin
    double inv_T = NTC_A + NTC_B * lnR + NTC_C * lnR * lnR * lnR;
    double temp_K = 1.0 / inv_T;

    // Convert to Celsius
    return temp_K - 273.15;
}

// Internal ADC read function
float ReadInternalADC(uint32_t channel) {
    ADC_ChannelConfTypeDef sConfig = {0};
    sConfig.Channel = channel;
    sConfig.Rank = 1;
    sConfig.SamplingTime = ADC_SAMPLETIME_15CYCLES; // longer for accuracy

    if (HAL_ADC_ConfigChannel(&hadc2, &sConfig) != HAL_OK) {
        return -1.0f;
    }

    HAL_ADC_Start(&hadc2);
    if (HAL_ADC_PollForConversion(&hadc2, 100) == HAL_OK) {
        uint32_t raw = HAL_ADC_GetValue(&hadc2);
        return (raw * 3.3f) / 4096.0f * 1000.0f; // convert to mV
    }
    return -1.0f;
}

static ADS1115_HandleTypeDef ads1115_instance;

double ComputeTopHeaterTemperature(float mv)
{
    double baseTempC = compute_ntc_temperature(mv);

    double offset = 0;
    if (osMutexAcquire(configMutexHandle, osWaitForever) == osOK) {
        offset = balloonConfig.top_temp_offset;
        osMutexRelease(configMutexHandle);
    }

    return baseTempC - offset;
}

double ComputeBottomHeaterTemperature(float mv)
{
    double baseTempC = compute_ntc_temperature(mv);

    double offset = 0;
    if (osMutexAcquire(configMutexHandle, osWaitForever) == osOK) {
        offset = balloonConfig.bottom_temp_offset;
        osMutexRelease(configMutexHandle);
    }

    return baseTempC - offset;
}

double ComputePowerSupplyTemperature(float mv)
{
    double baseTempC = compute_ntc_temperature(mv);

    // Power supply sensor doesn't need calibration offset (monitoring only)
    // Heater sensors use offsets to compensate for thermal coupling to heating elements
    return baseTempC;
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

    // --- Local variables to store all results BEFORE taking mutex ---
    int16_t temp1 = 0;
    int16_t temp2 = 0;
    int16_t temp3 = 0;
    uint16_t vcc  = 0;
    uint8_t  proximity = 0;
    uint8_t  pedal     = 0;
    uint8_t  cooling_fan     = 0;
    uint8_t  pressure_valve     = 0;

    uint8_t use_internal = 0;
    if (osMutexAcquire(configMutexHandle, 100) == osOK) {
        use_internal = balloonConfig.use_internal_adc;
        osMutexRelease(configMutexHandle);
    }

    // --- Sensor reads: prefer internal ADC if enabled, else ADS1115 ---
    // Temp1
    if (use_internal) {
        float mv = ReadInternalADC(ADC_CHANNEL_14);
        if (mv > 0) temp1 = (int16_t)ComputeTopHeaterTemperature(mv);
        else temp1 = 0; // invalid
    } else if (balloonState.ads1115 == NULL) {
        temp1 = 0; // invalid
    } else if (ads1115_read_P0NG(balloonState.ads1115, &value) == HAL_OK) {
        temp1 = (int16_t)ComputeTopHeaterTemperature(value);
    } else {
        temp1 = 0; // invalid
    }

    // Temp2
    if (use_internal) {
        float mv = ReadInternalADC(ADC_CHANNEL_15);
        if (mv > 0) temp2 = (int16_t)ComputeBottomHeaterTemperature(mv);
        else temp2 = 0; // invalid
    } else if (balloonState.ads1115 == NULL) {
        temp2 = 0; // invalid
    } else if (ads1115_read_P1NG(balloonState.ads1115, &value) == HAL_OK) {
        temp2 = (int16_t)ComputeBottomHeaterTemperature(value);
    } else {
        temp2 = 0; // invalid
    }

    // Temp3
    if (use_internal) {
        float mv = ReadInternalADC(ADC_CHANNEL_8);
        if (mv > 0) temp3 = (int16_t)ComputePowerSupplyTemperature(mv);
        else temp3 = 0; // invalid
    } else if (balloonState.ads1115 == NULL) {
        temp3 = 0; // invalid
    } else if (ads1115_read_P2NG(balloonState.ads1115, &value) == HAL_OK) {
        temp3 = (int16_t)ComputePowerSupplyTemperature(value);
    } else {
        temp3 = 0; // invalid
    }

    // VCC
    if (use_internal) {
        float mv = ReadInternalADC(ADC_CHANNEL_9);
        if (mv > 0) vcc = (uint16_t)(mv / 3.3 * 100); // rough conversion
        else vcc = 0;
    } else if (balloonState.ads1115 == NULL) {
        vcc = 0; // invalid
    } else if (ads1115_read_P3NG(balloonState.ads1115, &value) == HAL_OK) {
        vcc = (uint16_t)value;
    } else {
        vcc = 0;
    }

    // --- GPIO reads (also no mutex needed yet) ---
    proximity = HAL_GPIO_ReadPin(PROXIMITY_SENSOR_GPIO_Port, PROXIMITY_SENSOR_Pin);
    pedal     = HAL_GPIO_ReadPin(PEDAL_SWITCH_GPIO_Port,  PEDAL_SWITCH_Pin);
		pressure_valve = HAL_GPIO_ReadPin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin);
		cooling_fan   = HAL_GPIO_ReadPin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin);

    // --- NOW do a SINGLE SHORT mutex-protected update ---
    osMutexAcquire(stateMutexHandle, osWaitForever);

    balloonState.temp1 = temp1;
    balloonState.temp2 = temp2;
    balloonState.temp3 = temp3;
    balloonState.vcc   = vcc;
    balloonState.proximity = proximity;
    balloonState.pedal     = pedal;
		balloonState.cooling_fan = cooling_fan;
		balloonState.pressure_valve = pressure_valve;

    osMutexRelease(stateMutexHandle);

    // --- Printing outside the lock ---
    usb_printf("DEBUG: T1:%d T2:%d T3:%d V:%d Prox:%d Ped:%d CF:%d PV:%d\r\n",
             temp1, temp2, temp3, vcc, proximity, pedal, cooling_fan, pressure_valve);
    osDelay(10);
}


void ControlHeater(void){
	osMutexAcquire(stateMutexHandle, osWaitForever);
	osMutexAcquire(configMutexHandle, osWaitForever);

	// Heaters should only be active in STANDBY and READY states, not during WELDING/COOLING
	bool heaters_enable = ((balloonState.op_state == OP_STANDBY || balloonState.op_state == OP_READY) && 
	                        balloonState.error == ERR_NONE);

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

	// Cooling fan control is handled by the state machine during COOLING state
	// Here we only handle it for temperature-based cooling
	if(balloonState.op_state != OP_COOLING) {
		// If either heater temperature is above threshold, enable cooling fan
		if((balloonState.temp1 > balloonConfig.top_temp_threshold) ||
		   (balloonState.temp2 > balloonConfig.bottom_temp_threshold)) {
		  HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, GPIO_PIN_SET);
		} else {
		  HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, GPIO_PIN_RESET);
		}
	}
	// Note: During OP_COOLING, the cooling fan is controlled by HandleOperationStateMachine()

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

// Operation State Machine - handles pedal-based welding operation
void HandleOperationStateMachine(void) {
    static uint32_t operation_start_time = 0;
    static uint8_t pedal_lock_counter = 0;
    static uint8_t last_pedal_state = 1;  // 1 = released
    
    osMutexAcquire(stateMutexHandle, osWaitForever);
    osMutexAcquire(configMutexHandle, osWaitForever);
    
    uint32_t current_time = HAL_GetTick();
    uint8_t pedal = balloonState.pedal;
    uint8_t proximity = balloonState.proximity;
    
    switch(balloonState.op_state) {
        case OP_STANDBY:
            // Blink standby indicator
            balloonState.standby_blink++;
            if(balloonState.standby_blink > 20) {
                balloonState.standby_blink = 0;
            }
            
            // Check for pedal press to enter READY state
            if(pedal == 0 && last_pedal_state == 1) {  // Pedal pressed (falling edge)
                balloonState.op_state = OP_READY;
                balloonState.standby_blink = 0;
                BuzzerBeep(100, 8);  // 8 short beeps
                usb_printf("STATE: READY\r\n");
            }
            break;
            
        case OP_READY:
            // Monitor pedal for pressure valve control
            if(pedal == 0) {  // Pedal pressed
                HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin, GPIO_PIN_SET);
                pedal_lock_counter++;
                
                // Check for pedal lock error (pressed too long without proximity)
                if(pedal_lock_counter > 25 && proximity == 1) {
                    balloonState.error = ERR_PEDAL_LOCKED;
                    balloonState.op_state = OP_STANDBY;
                    usb_printf("ERROR: Pedal locked\r\n");
                    BuzzerBeep(100, 24);  // Long error beep
                    pedal_lock_counter = 0;
                }
                
                // Start welding if proximity sensor detects material
                if(proximity == 0) {  // Proximity active (material detected)
                    balloonState.op_state = OP_WELDING;
                    balloonState.prtime = 0;
                    operation_start_time = current_time;
                    BuzzerBeep(100, 1);  // Single beep to start welding
                    usb_printf("STATE: WELDING (optime=%d seconds)\r\n", balloonConfig.optime);
                }
            } else {  // Pedal released
                HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin, GPIO_PIN_RESET);
                pedal_lock_counter = 0;
            }
            
            // Return to standby if menu button or specific condition
            // (Menu button handling would be integrated here if available)
            break;
            
        case OP_WELDING:
            // Keep pressure valve active during welding
            HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin, GPIO_PIN_SET);
            
            // Update operation time counter
            uint32_t elapsed = (current_time - operation_start_time) / 1000;  // Convert to seconds
            balloonState.prtime = (uint8_t)(elapsed > 255 ? 255 : elapsed);
            
            // Check if operation time has elapsed
            if(balloonState.prtime >= balloonConfig.optime) {
                HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin, GPIO_PIN_RESET);
                balloonState.op_state = OP_COOLING;
                balloonState.cltime = 0;
                operation_start_time = current_time;
                BuzzerBeep(250, 1);  // Beep to indicate cooling start
                usb_printf("STATE: COOLING (cotime=%d seconds)\r\n", balloonConfig.cotime);
            }
            break;
            
        case OP_COOLING:
            // Activate cooling fan
            HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, GPIO_PIN_SET);
            
            // Update cooling time counter
            elapsed = (current_time - operation_start_time) / 1000;  // Convert to seconds
            balloonState.cltime = (uint8_t)(elapsed > 255 ? 255 : elapsed);
            
            // Check if cooling time has elapsed
            if(balloonState.cltime >= balloonConfig.cotime) {
                HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, GPIO_PIN_RESET);
                balloonState.op_state = OP_READY;
                balloonState.cltime = 0;
                usb_printf("STATE: READY (cooling complete)\r\n");
                
                // Check if pedal is still pressed (error condition)
                if(pedal == 0) {
                    usb_printf("ERROR: Pedal locked after cooling\r\n");
                    BuzzerBeep(100, 24);  // Long error beep
                    while(balloonState.pedal == 0) {
                        osDelay(10);  // Wait for pedal release
                    }
                }
            }
            break;
    }
    
    last_pedal_state = pedal;
    
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
    BalloonConfig_Init();
    if (balloonConfig.use_internal_adc == 0) {
        ads1115_instance = ads1115_hal_init(&hi2c1, ADS1115_DEFAULT_CONFIG());
        balloonState.ads1115 = &ads1115_instance;
    } else {
        balloonState.ads1115 = NULL;
    }
}


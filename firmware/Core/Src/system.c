/*
 * system.c
 *
 *  Created on: Nov 6, 2025
 *      Author: ASUS
 */
#include "system.h"
#include "ads1115.h"
#include "config.h"
#include "flash.h"
#include "main.h"
#include "stm32f4xx_hal_uart.h"
#include "utils.h"
#include <math.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "cmsis_os.h"

// Global variables
extern BalloonConfig_t balloonConfig; // Will be used later. is this right?
                                      // since it is defined in config.c
BalloonState_t balloonState;

extern UART_HandleTypeDef huart4;
extern ADC_HandleTypeDef hadc2;

extern osMutexId_t configMutexHandle;
extern osMutexId_t stateMutexHandle;

extern I2C_HandleTypeDef hi2c1;

#define NTC_A 0.001129148
#define NTC_B 0.000234125
#define NTC_C 0.0000000876741

#define V_SUPPLY_MV 3300.0
#define R_FIXED 10000.0 // 10k series resistor

static inline double compute_ntc_temperature(float v_out_mv) {
  if (v_out_mv <= 0.0 || v_out_mv >= V_SUPPLY_MV) {
    return -999.0; // invalid reading
  }

  // Convert voltage to resistance
  // Vout = Vsupply * Rntc / (Rfixed + Rntc)  <-- assuming Rntc is bottom
  // resistor OR Vout = Vsupply * Rfixed / (Rfixed + Rntc) <-- assuming Rfixed
  // is bottom resistor

  // Based on previous code: r_ntc = R_FIXED * (V_SUPPLY - 2 * v_out) /
  // (V_SUPPLY + 2 * v_out); That was for a bridge. The new code: R_ntc =
  // R_FIXED * (ADC_MAX / adc_raw - 1.0); This implies a simple divider where
  // ADC_MAX/adc_raw = Vsupply/Vout So Vsupply/Vout = (Rfixed + Rntc) / Rntc (if
  // Rntc is bottom) -> Rfixed/Rntc + 1 -> Rntc = Rfixed / (Vsupply/Vout - 1)
  // The user's formula: R_ntc = R_FIXED * (Vsupply/Vout - 1.0)
  // This implies Vsupply/Vout = Rntc/Rfixed + 1 -> Vsupply/Vout = (Rntc +
  // Rfixed)/Rfixed -> Vout = Vsupply * Rfixed / (Rntc + Rfixed) So Rfixed is
  // the bottom resistor (across which we measure Vout).

  double R_ntc = R_FIXED * (V_SUPPLY_MV / v_out_mv - 1.0);

  double lnR = log(R_ntc);

  // Steinhart–Hart equation
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
    return (HAL_ADC_GetValue(&hadc2) * 3.3f) / 4096.0f *
           1000.0f; // convert to mV
  }
  return -1.0f;
}

double ComputeTopHeaterTemperature(float mv) {
  double baseTempC = compute_ntc_temperature(mv);

  double offset = 0;
  if (osMutexAcquire(configMutexHandle, osWaitForever) == osOK) {
    offset = balloonConfig.top_temp_offset;

    osMutexRelease(configMutexHandle);
  }

  return baseTempC < offset ? 25 : baseTempC - offset;
}

double ComputeBottomHeaterTemperature(float mv) {
  double baseTempC = compute_ntc_temperature(mv);

  double offset = 0;
  if (osMutexAcquire(configMutexHandle, osWaitForever) == osOK) {
    offset = balloonConfig.bottom_temp_offset;

    osMutexRelease(configMutexHandle);
  }

  return baseTempC < offset ? 25 : baseTempC - offset;
}

double ComputePowerSupplyTemperature(float mv) {
  double baseTempC = compute_ntc_temperature(mv);

  // Your calibration constant
  return baseTempC - 275.15;
}

// Non-blocking Buzzer Control
typedef struct {
  uint32_t start_time;
  uint16_t duration_ms;
  uint16_t count;
  uint16_t current_count;
  bool active;
  bool pin_state;
} BuzzerControl_t;

static BuzzerControl_t buzzer = {0};

void BuzzerBeep(uint16_t duration_ms, uint16_t count) {
  buzzer.duration_ms = duration_ms;
  buzzer.count = count;
  buzzer.current_count = 0;
  buzzer.active = true;
  buzzer.start_time = HAL_GetTick(); // Start immediately
  buzzer.pin_state = true;
  HAL_GPIO_WritePin(BUZZER_GPIO_Port, BUZZER_Pin, GPIO_PIN_SET);
}

void BuzzerUpdate(void) {
  if (!buzzer.active)
    return;

  uint32_t now = HAL_GetTick();
  uint32_t elapsed = now - buzzer.start_time;

  if (buzzer.pin_state) {
    if (elapsed >= buzzer.duration_ms) {
      HAL_GPIO_WritePin(BUZZER_GPIO_Port, BUZZER_Pin, GPIO_PIN_RESET);
      buzzer.pin_state = false;
      buzzer.start_time = now;
      buzzer.current_count++;
    }
  } else {
    // Wait for 100ms gap between beeps (fixed gap)
    if (elapsed >= 100) {
      if (buzzer.current_count < buzzer.count) {
        HAL_GPIO_WritePin(BUZZER_GPIO_Port, BUZZER_Pin, GPIO_PIN_SET);
        buzzer.pin_state = true;
        buzzer.start_time = now;
      } else {
        buzzer.active = false;
        HAL_GPIO_WritePin(BUZZER_GPIO_Port, BUZZER_Pin, GPIO_PIN_RESET);
      }
    }
  }
}

// -------------------------------------------
void MonitorSensors(void) {

  // --- Local variables to store all results BEFORE taking mutex ---
  float value;
  float mv;

  int16_t temp1 = 0;
  int16_t temp2 = 0;
  int16_t temp3 = 0;

  uint16_t vcc = 0;
  uint8_t proximity = 0;
  uint8_t pedal = 0;
  uint8_t cooling_fan = 0;
  uint8_t pressure_valve = 0;

  uint8_t use_internal = 0;
  if (osMutexAcquire(configMutexHandle, 100) == osOK) {
    // usb_printf("MS DEBUG: Internal ADC: %d\r\n",
    // balloonConfig.use_internal_adc);
    use_internal = balloonConfig.use_internal_adc;
    osMutexRelease(configMutexHandle);
  }

  // --- Sensor reads: prefer internal ADC if enabled, else ADS1115 ---
  static uint32_t last_i2c_error = 0;
  uint8_t i2c_error_occurred = 0;

  // Temp1
  if (use_internal) {
    mv = ReadInternalADC(ADC_CHANNEL_14);
    if (mv > 0)
      temp1 = (int16_t)ComputeTopHeaterTemperature(mv);
    else
      temp1 = 0; // invalid
  } else if (balloonState.ads1115 == NULL) {
    temp1 = 0; // invalid
  } else if (ads1115_read_P0NG(balloonState.ads1115, &value) == HAL_OK) {
    temp1 = (int16_t)ComputeTopHeaterTemperature(value);
  } else {
    temp1 = 0;
    i2c_error_occurred = 1;
  }

  // Temp2
  if (use_internal) {
    mv = ReadInternalADC(ADC_CHANNEL_15);
    if (mv > 0)
      temp2 = (int16_t)ComputeBottomHeaterTemperature(mv);
    else
      temp2 = 0; // invalid
  } else if (balloonState.ads1115 == NULL) {
    temp2 = 0; // invalid
  } else if (ads1115_read_P1NG(balloonState.ads1115, &value) == HAL_OK) {
    temp2 = (int16_t)ComputeBottomHeaterTemperature(value);
  } else {
    temp2 = 0;
    i2c_error_occurred = 1;
  }

  // Temp3
  if (use_internal) {
    mv = ReadInternalADC(ADC_CHANNEL_8);
    if (mv > 0)
      temp3 = (int16_t)ComputePowerSupplyTemperature(mv);
    else
      temp3 = 0; // invalid
  } else if (balloonState.ads1115 == NULL) {
    temp3 = 0; // invalid
  } else if (ads1115_read_P2NG(balloonState.ads1115, &value) == HAL_OK) {
    temp3 = (int16_t)ComputePowerSupplyTemperature(value);
  } else {
    temp3 = 0;
    i2c_error_occurred = 1;
  }

  // VCC
  if (use_internal) {
    mv = ReadInternalADC(ADC_CHANNEL_9);
    if (mv > 0)
      vcc = (uint16_t)(mv / 3.3 * 100); // rough conversion
    else
      vcc = 0;
  } else if (balloonState.ads1115 == NULL) {
    vcc = 0; // invalid
  } else if (ads1115_read_P3NG(balloonState.ads1115, &value) == HAL_OK) {
    vcc = (uint16_t)value;
  } else {
    vcc = 0;
    i2c_error_occurred = 1;
  }

  if (!use_internal && i2c_error_occurred &&
      (HAL_GetTick() - last_i2c_error > 2000)) {
    usb_printf("ERROR: I2C/Sensor Read Fault\r\n");
    last_i2c_error = HAL_GetTick();
  }

  // --- GPIO reads (also no mutex needed yet) ---
  proximity =
      !HAL_GPIO_ReadPin(PROXIMITY_SENSOR_GPIO_Port, PROXIMITY_SENSOR_Pin);
  pedal = HAL_GPIO_ReadPin(PEDAL_SWITCH_GPIO_Port, PEDAL_SWITCH_Pin);
  pressure_valve =
      HAL_GPIO_ReadPin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin);
  cooling_fan = HAL_GPIO_ReadPin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin);

  // --- NOW do a SINGLE SHORT mutex-protected update ---
  osMutexAcquire(stateMutexHandle, osWaitForever);

  balloonState.temp1 = temp1 > 0 ? temp1 : 0;
  balloonState.temp2 = temp2 > 0 ? temp2 : 0;
  balloonState.temp3 = temp3 > 0 ? temp3 : 0;
  balloonState.vcc =
      vcc; // convert to volts. not recommended but who cares! haha!
  balloonState.proximity = proximity;
  balloonState.pedal = pedal;
  balloonState.cooling_fan = cooling_fan;
  balloonState.pressure_valve = pressure_valve;

  osMutexRelease(stateMutexHandle);

  osDelay(10);
}

void ControlHeater(void) {
  if (osMutexAcquire(stateMutexHandle, 100) != osOK) {
    return; // Skip if cannot acquire
  }

  if (osMutexAcquire(configMutexHandle, 100) != osOK) {
    osMutexRelease(stateMutexHandle);
    return; // Skip if cannot acquire
  }

  bool heaters_enable =
      (balloonState.op_state != OP_STANDBY && balloonState.error == ERR_NONE);

  // Top heater control
  if (balloonState.temp1 < balloonConfig.top_temp_threshold && heaters_enable) {
    HAL_GPIO_WritePin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin, GPIO_PIN_SET);
    HAL_GPIO_WritePin(TOP_HEATER2_GPIO_Port, TOP_HEATER2_Pin, GPIO_PIN_SET);
  } else {
    HAL_GPIO_WritePin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin, GPIO_PIN_RESET);
    HAL_GPIO_WritePin(TOP_HEATER2_GPIO_Port, TOP_HEATER2_Pin, GPIO_PIN_RESET);
  }

  // Bottom heater control
  if (balloonState.temp2 < balloonConfig.bottom_temp_threshold &&
      heaters_enable) {
    HAL_GPIO_WritePin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin,
                      GPIO_PIN_SET);
    HAL_GPIO_WritePin(BOTTOM_HEATER2_GPIO_Port, BOTTOM_HEATER2_Pin,
                      GPIO_PIN_SET);
  } else {
    HAL_GPIO_WritePin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin,
                      GPIO_PIN_RESET);
    HAL_GPIO_WritePin(BOTTOM_HEATER2_GPIO_Port, BOTTOM_HEATER2_Pin,
                      GPIO_PIN_RESET);
  }

  // If either of the heater's temperatures is above threshold, enable cooling
  // fan
  if ((balloonState.temp1 > balloonConfig.top_temp_threshold) ||
      (balloonState.temp2 > balloonConfig.bottom_temp_threshold)) {
    HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, GPIO_PIN_SET);
  } else {
    HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, GPIO_PIN_RESET);
  }

  osMutexRelease(configMutexHandle);
  osMutexRelease(stateMutexHandle);
}

static ErrorCode_t prev_error = ERR_NONE;
static uint32_t last_error_print_time = 0;

void MonitorError(void) {
  // Acquire mutexes with error handling
  if (osMutexAcquire(stateMutexHandle, 100) != osOK) {
    return; // Cannot acquire, skip this iteration
  }

  if (osMutexAcquire(configMutexHandle, 100) != osOK) {
    osMutexRelease(stateMutexHandle); // Release first mutex
    return;                           // Cannot acquire, skip this iteration
  }

  // Always reset error to re-evaluate
  ErrorCode_t detected_error = ERR_NONE;

  // Temperature sensor errors
  if (balloonState.temp1 < 1)
    detected_error = ERR_TOP_HEATER_NTC;
  else if (balloonState.temp2 < 1)
    detected_error = ERR_BOTTOM_HEATER_NTC;
  // else if(balloonState.temp3 < 1) detected_error = ERR_POWER_SUPPLY_NTC;

  // Temperature limit errors
  //  else if (balloonState.temp1 > balloonConfig.max_temp_error)
  //    detected_error = ERR_TOP_HEATER_HIGH_TEMP;
  //  else if (balloonState.temp2 > balloonConfig.max_temp_error)
  //    detected_error = ERR_BOTTOM_HEATER_HIGH_TEMP;
  else if (balloonState.temp3 >= balloonConfig.power_temp_error)
    detected_error = ERR_POWER_SUPPLY_HIGH_TEMP;

  // Voltage errors
  //  else if (balloonConfig.power_vcc_error == 0) {
  //    detected_error = ERR_LOW_VOLTAGE;
  //  }
  else if (balloonConfig.power_vcc_error == 0 &&
           balloonState.vcc > 1000 * balloonConfig.vcc_voltage_error) {
    detected_error = ERR_HIGH_VOLTAGE;
  }

  // Heater differential error
  //  else if (balloonState.temp2 >
  //           balloonState.temp1 + balloonConfig.heater_error_enable) {
  //    detected_error = ERR_TOP_HEATER_HEATING;
  //  } else if (balloonState.temp1 >
  //             balloonState.temp2 + balloonConfig.heater_error_enable) {
  //    detected_error = ERR_BOTTOM_HEATER_HEATING;
  //  }

  // Update global state
  balloonState.error = detected_error;

  // If error detected and system error checking is enabled
  if (balloonState.error != ERR_NONE && balloonConfig.sys_error == 0) {

    balloonState.op_state = OP_STANDBY;
    ErrorCode_t err_to_report = balloonState.error;

    // Check if we need to report (Change in error OR timeout elapsed)
    if (err_to_report != prev_error ||
        (HAL_GetTick() - last_error_print_time > 5000)) {

      // Release mutexes BEFORE blocking operations (Printf + Beep)
      osMutexRelease(configMutexHandle);
      osMutexRelease(stateMutexHandle);

      print_error(err_to_report);
      BuzzerBeep(750, 1); // Blocks for ~850ms

      last_error_print_time = HAL_GetTick();
      prev_error = err_to_report;
      return; // Mutexes released, function done
    }
  } else {
    // No error currently
    prev_error = ERR_NONE;
  }

  osMutexRelease(configMutexHandle);
  osMutexRelease(stateMutexHandle);
}

static uint8_t last_pedal_state = 1; // 1 = released
static uint32_t operation_start_time = 0;
uint32_t elapsed; // Declare at function scope to avoid shadowing

void ManageOperation(void) {

  // SINGLE Quick Mutex Check
  if (osMutexAcquire(stateMutexHandle, 2) != osOK)
    return;

  // Copy state variables to local for decision making
  OperationState_t current_op_state = balloonState.op_state;
  ErrorCode_t current_error = balloonState.error;
  uint8_t pedal = balloonState.pedal;
  uint8_t proximity = balloonState.proximity;

  // We can release now if we are just reading/checking, but we need to update
  // state so keep it held briefly actually for atomic updates we need it.

  if (osMutexAcquire(configMutexHandle, 2) != osOK) {
    osMutexRelease(stateMutexHandle);
    return;
  }

  // System Error Handling - FORCE STANDBY
  if (current_error != ERR_NONE && balloonConfig.sys_error == 0) {
    HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin,
                      GPIO_PIN_RESET);
    HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, GPIO_PIN_RESET);

    // Reset potentially conflicting state
    balloonState.op_state = OP_STANDBY;

    osMutexRelease(configMutexHandle);
    osMutexRelease(stateMutexHandle);
    return;
  }

  uint32_t current_time = HAL_GetTick();

  switch (current_op_state) {
  case OP_STANDBY:
    balloonState.standby_blink++;
    if (balloonState.standby_blink > 50) { // Slower blink
      balloonState.standby_blink = 0;
    }

    // Check for pedal press (falling edge logic needs history)
    // Since function is called periodically, we just check current state vs
    // last state HOWEVER, `last_pedal_state` is static so we can strictly use
    // it.
    if (pedal == 0 && last_pedal_state == 1 && current_error == ERR_NONE) {
      balloonState.op_state = OP_READY;
      balloonState.standby_blink = 0;
      BuzzerBeep(100, 8); // Non-blocking
      usb_printf("STATE: READY\r\n");
    }
    break;

  case OP_READY:
    if (pedal == 0) { // Pedal Pressed
      HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin,
                        GPIO_PIN_SET);
      balloonState.pedal_lock_cnt++;

      // Lockout error
      if (balloonState.pedal_lock_cnt > 200 &&
          proximity == 1) { // ~200 * 10ms = 2s
        balloonState.error = ERR_PEDAL_LOCKED;
        balloonState.op_state = OP_STANDBY;
        usb_printf("ERROR: Pedal locked. Cathater undetected!.\r\n");
        BuzzerBeep(100, 24); // Long error beep
        balloonState.pedal_lock_cnt = 0;
      }

      // Start welding if proximity sensor detects material
      if (proximity == 0) { // Proximity active (material detected)
        balloonState.op_state = OP_WELDING;
        balloonState.prtime = 0;
        operation_start_time = current_time;
        BuzzerBeep(100, 1); // Single beep to start welding
        usb_printf("STATE: WELDING (optime=%d seconds)\r\n",
                   balloonConfig.optime);
      }
    } else { // Pedal released
      HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin,
                        GPIO_PIN_RESET);
      balloonState.pedal_lock_cnt = 0;
    }

    // Return to standby if menu button or specific condition
    // (Menu button handling would be integrated here if available)
    break;

  case OP_WELDING:
    // Keep pressure valve active during welding
    HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin,
                      GPIO_PIN_SET);

    // Update operation time counter
    elapsed =
        (current_time - operation_start_time) / 1000; // Convert to seconds
    balloonState.prtime = (uint8_t)(elapsed > 255 ? 255 : elapsed);

    // Check if operation time has elapsed
    if (balloonState.prtime >= balloonConfig.optime) {
      HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin,
                        GPIO_PIN_RESET);
      balloonState.op_state = OP_COOLING;
      balloonState.cltime = 0;
      operation_start_time = current_time;
      BuzzerBeep(250, 1); // Beep to indicate cooling start
      usb_printf("STATE: COOLING (cotime=%d seconds)\r\n",
                 balloonConfig.cotime);
    }
    break;

  case OP_COOLING:
    // Activate cooling fan
    HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, GPIO_PIN_SET);

    // Update cooling time counter
    elapsed =
        (current_time - operation_start_time) / 1000; // Convert to seconds
    balloonState.cltime = (uint8_t)(elapsed > 255 ? 255 : elapsed);

    // Check if cooling time has elapsed
    if (balloonState.cltime >= balloonConfig.cotime) {
      HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, GPIO_PIN_RESET);

      // Check pedal logic for safety
      if (pedal == 0) {
        // Instead of blocking, we transition to a temporary ERROR waiting state
        // or just stay here? Or better: trigger error and go to standby which
        // handles cleanup
        balloonState.error = ERR_PEDAL_LOCKED;
        usb_printf("ERROR: Pedal locked after cooling\r\n");
        BuzzerBeep(100, 24);
        balloonState.op_state =
            OP_STANDBY; // Standby will refuse to start until pedal release
      } else {
        balloonState.op_state = OP_READY;
        usb_printf("STATE: READY (cooling complete)\r\n");
      }
      balloonState.cltime = 0;
    }
    break;
  }

  // Update history
  last_pedal_state = pedal;

  osMutexRelease(configMutexHandle);
  osMutexRelease(stateMutexHandle);
}

// --------------------------- UART Serial Ops
// ----------------------------------------- UART Printf Implementation

uint8_t rx_line[RX_BUFFER_SIZE];
uint8_t rx_index = 0;
uint8_t rx_byte = 0; // the only RX byte variable

// Build line buffer and process commands
void LogCallbackHandler() {
  while (HAL_UART_Receive(&huart4, &rx_byte, 1, 100) == HAL_OK) {
    if (rx_byte == '\n' || rx_byte == '\r') {
//      osDelay(100);
      rx_line[rx_index] = '\0'; // terminate string
      process_command((char *)rx_line, &balloonConfig, &balloonState);
      rx_index = 0; // reset buffer
    } else if (rx_index < RX_BUFFER_SIZE - 1) {
      rx_line[rx_index++] = rx_byte;
    }
  }
  //   usb_printf("LCH DEBUG\r\n");
}

// Initialize the system and start RX interrupt
static ADS1115_HandleTypeDef ads1115_instance;
void BalloonSystemInit(void) {
  BalloonConfig_Init();
  if (balloonConfig.use_internal_adc == 0) {
    ads1115_instance = ads1115_hal_init(&hi2c1, ADS1115_DEFAULT_CONFIG());
    balloonState.ads1115 = &ads1115_instance;
  } else {
    balloonState.ads1115 = NULL;
  }
}

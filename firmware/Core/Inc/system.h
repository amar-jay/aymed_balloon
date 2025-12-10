
#ifndef INC_BALLOON_SYSTEM_H_
#define INC_BALLOON_SYSTEM_H_

#include "ads1115.h"
#include "config.h"
#include "flash.h"
#include <stdbool.h>

// config variables within flash

// Error Codes
typedef enum {
  ERR_NONE = 0,
  ERR_TOP_HEATER_NTC = 1,
  ERR_BOTTOM_HEATER_NTC = 2,
  ERR_POWER_SUPPLY_NTC = 3,
  ERR_POWER_SUPPLY_HIGH_TEMP = 4,
  ERR_LOW_VOLTAGE = 5,
  ERR_HIGH_VOLTAGE = 6,
  ERR_TOP_HEATER_HIGH_TEMP = 7,
  ERR_BOTTOM_HEATER_HIGH_TEMP = 8,
  ERR_TOP_HEATER_HEATING = 9,
  ERR_BOTTOM_HEATER_HEATING = 10,
  ERR_PEDAL_LOCKED = 11
} ErrorCode_t;

// Operation States
typedef enum {
  OP_STANDBY = 0,
  OP_READY = 1,
  OP_WELDING = 2,
  OP_COOLING = 3
} OperationState_t;

// NTC Constants
#define NTC1 0.001129148
#define NTC2 0.000234125
#define NTC3 0.0000000876741

// Whestone bridge variables for tempreture sensor for better accuracy.
#define ADC_MAX 52800.0
#define V_SUPPLY 3.3
#define R_FIXED 10000.0 // 10kΩ
#define R0 10000.0      // NTC resistance at 25°C
#define BETA 3950.0
#define T0 298.15 // 25°C in Kelvin

// System State Structure
typedef struct {
  OperationState_t
      op_state; // Current operation state (standby, ready, welding, cooling)
  // MenuState_t menu_state;
  ErrorCode_t error; // Current error code
  uint8_t prtime;    // current pressure time
  uint8_t cltime;    // current cooling time
  int16_t temp1;     // Top heater temperature
  int16_t temp2;     // Bottom heater temperature
  int16_t temp3;     // Power supply temperature
  uint16_t vcc;      // Supply voltage
  bool proximity;    // Proximity sensor state
  // bool menu_active;
  bool pedal;          // Pedal state (Input)
  bool cooling_fan;    // Cooling fan state (Output)
  bool pressure_valve; // Pressure valve state (Output)

  uint8_t pedal_lock_cnt; // Pedal lock counter
  uint8_t standby_blink;  // Standby blink counter

  ADS1115_HandleTypeDef *ads1115;
} BalloonState_t;

/** Compute temperature in °C from ADC value (bridge output)
 * this uses a whestone bridge for better accuracy.
 * TODO: if more accuracy is needed, a 3-point Steinhart–Hart calibration can be
 * done later
 */
// void UART_Printf(const char *fmt, ...);
// void UART_Scanf(UART_HandleTypeDef *huart, uint8_t* rx_char);
void MonitorSensors(void);
void ControlHeater(void);
void MonitorError(void);
void ManageOperation(void);
void BuzzerUpdate(void);

void BalloonSystemInit(void);

void LogCallbackHandler();
#endif

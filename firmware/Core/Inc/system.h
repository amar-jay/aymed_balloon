
#ifndef INC_BALLOON_SYSTEM_H_
#define INC_BALLOON_SYSTEM_H_

#include <stdbool.h>
#include "ads1115.h"
#include "flash.h"
#include "config.h"

// Firmware version
#define VERSION_MAJOR 1
#define VERSION_MINOR 0
#define VERSION_PATCH 0

//config variables within flash


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

// Menu States
typedef enum {
  MENU_MAIN = 0,
  MENU_HEATER_TEMP = 1,
  MENU_FACTORY_SETTINGS = 2,
  MENU_SYSTEM_ERROR = 3,
  MENU_SYSTEM_SETTINGS4 = 4,
  MENU_SYSTEM_SETTINGS = 6,
  MENU_SYSTEM_SETTINGS2 = 7
} MenuState_t;

// Operation States
typedef enum {
  OP_STANDBY = 0,
  OP_READY = 1,
  OP_WELDING = 2,
  OP_COOLING = 3
} OperationState_t;

// Menu Selection State
typedef enum {
  SEL_NONE = 0,
  SEL_OPTIME = 1,
  SEL_COTIME = 2,
  SEL_TOP_TEMP = 1,
  SEL_BOT_TEMP = 2,
  SEL_TEMP_RESET = 3
} SelectionState_t;

// System State Structure
typedef struct {
  OperationState_t op_state;
  MenuState_t menu_state;
  SelectionState_t selection;
  ErrorCode_t error;
  uint8_t prtime;
  uint8_t cltime;
  int16_t temp1;
  int16_t temp2;
  int16_t temp3;
  uint16_t vcc;
  bool proximity;
  bool menu_active;
  bool pedal;
  bool cooling_fan;
  bool pressure_valve;
//  uint8_t pedal_lock_cnt;
  uint8_t standby_blink;
  uint32_t menu_timeout;

  ADS1115_HandleTypeDef *ads1115;
} BalloonState_t;

/** Compute temperature in °C from ADC value (bridge output)
* this uses a whestone bridge for better accuracy.
* TODO: if more accuracy is needed, a 3-point Steinhart–Hart calibration can be done later
*/
//void UART_Printf(const char *fmt, ...);
//void UART_Scanf(UART_HandleTypeDef *huart, uint8_t* rx_char);
void MonitorSensors(void);
void ControlHeater(void);
void MonitorError(void);
void HandleOperationStateMachine(void);

void BalloonSystemInit(void);

void LogCallbackHandler();
#endif

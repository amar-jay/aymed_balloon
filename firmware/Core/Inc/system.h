
#ifndef INC_BALLOON_SYSTEM_H_
#define INC_BALLOON_SYSTEM_H_

#include <stdbool.h>
#include "ads1115.h"
#include "flash.h"

//config variables within flash
#define VAR_OPTIME                0x0001
#define VAR_COTIME                0x0002
#define VAR_TOP_TEMP_THRESHOLD    0x0003
#define VAR_BOTTOM_TEMP_THRESHOLD 0x0004
#define VAR_TEMP1_OFFSET          0x0005
#define VAR_TEMP2_OFFSET          0x0006
#define VAR_MENU_RESET_DELAY      0x0007
#define VAR_TIME_CALIBRATION      0x0008
#define VAR_MAX_TEMP_ERROR        0x0009
#define VAR_VCC_VOLTAGE_ERROR     0x000A
#define VAR_POWER_TEMP_ERROR      0x000B
#define VAR_POWER_VCC_ERROR       0x000C
#define VAR_SYS_ERROR             0x000D
#define VAR_VOLTAGE_CALIBRATION   0x000E
#define VAR_HEATER_ERROR_ENABLE   0x000F
#define VAR_COOLING_DELAY         0x0010
#define VAR_FIRST_BOOT            0x0011

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

// NTC Constants
#define NTC1 0.001129148
#define NTC2 0.000234125
#define NTC3 0.0000000876741

// Whestone bridge variables for tempreture sensor for better accuracy.
#define ADC_MAX     52800.0
#define V_SUPPLY    3.3
#define R_FIXED     10000.0     // 10kΩ
#define R0          10000.0     // NTC resistance at 25°C
#define BETA        3950.0
#define T0          298.15      // 25°C in Kelvin


// System Configuration Structure
typedef struct {
  uint8_t optime;
  uint8_t cotime;
  uint8_t top_temp_threshold;
  uint8_t bottom_temp_threshold;
  uint8_t temp1_offset;
  uint8_t temp2_offset;
  uint8_t menu_reset_delay;
  uint8_t time_calibration;
  uint8_t max_temp_error;
  uint8_t vcc_voltage_error;
  uint8_t power_temp_error;
  uint8_t power_vcc_error;
  uint8_t sys_error;
  uint8_t voltage_calibration;
  uint8_t heater_error_enable;
  uint8_t cooling_delay;
  uint8_t first_boot;
} SystemConfig_t;

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
  bool menu_active;
  uint8_t pedal_lock_cnt;
  uint8_t standby_blink;
  uint32_t menu_timeout;

  ADS1115_HandleTypeDef ads1115;
} SystemState_t;

/** Compute temperature in °C from ADC value (bridge output)
* this uses a whestone bridge for better accuracy.
* TODO: if more accuracy is needed, a 3-point Steinhart–Hart calibration can be done later
*/
//void UART_Printf(const char *fmt, ...);
//void UART_Scanf(UART_HandleTypeDef *huart, uint8_t* rx_char);
double ComputeTemperature(int16_t adc_value);
void ControlHeater(void);
void ControlError(void);

void BalloonSystemInit(void);

void SystemConfig_SaveAll(void);
void SystemConfig_Init(void);
void SystemConfig_Load(void);
void SystemConfig_ForceReset(void);
#endif

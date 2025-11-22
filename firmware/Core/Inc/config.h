/*
 * config.h
 *
 *  Created on: Nov 22, 2025
 *      Author: ASUS
 */

#ifndef INC_CONFIG_H_
#define INC_CONFIG_H_

#include <stdint.h>

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
} BalloonConfig_t;

extern BalloonConfig_t balloonConfig;

void BalloonConfig_Init(void);
void BalloonConfig_ForceReset(void);
void BalloonConfig_Load(void);
void BalloonConfig_SaveAll(void);
void BalloonConfig_Update(uint16_t varID, uint8_t value);

#endif /* INC_CONFIG_H_ */

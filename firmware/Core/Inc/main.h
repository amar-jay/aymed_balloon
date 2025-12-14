/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.h
  * @brief          : Header for main.c file.
  *                   This file contains the common defines of the application.
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2025 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef __MAIN_H
#define __MAIN_H

#ifdef __cplusplus
extern "C" {
#endif

/* Includes ------------------------------------------------------------------*/
#include "stm32f4xx_hal.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include "utils.h"
/* USER CODE END Includes */

/* Exported types ------------------------------------------------------------*/
/* USER CODE BEGIN ET */

/* USER CODE END ET */

/* Exported constants --------------------------------------------------------*/
/* USER CODE BEGIN EC */

/* USER CODE END EC */

/* Exported macro ------------------------------------------------------------*/
/* USER CODE BEGIN EM */

/* USER CODE END EM */

/* Exported functions prototypes ---------------------------------------------*/
void Error_Handler(void);

/* USER CODE BEGIN EFP */

/* USER CODE END EFP */

/* Private defines -----------------------------------------------------------*/
#define PEDAL_SWITCH_Pin GPIO_PIN_0
#define PEDAL_SWITCH_GPIO_Port GPIOA
#define BUTTON_LEFT_Pin GPIO_PIN_1
#define BUTTON_LEFT_GPIO_Port GPIOA
#define BUTTON_RIGHT_Pin GPIO_PIN_2
#define BUTTON_RIGHT_GPIO_Port GPIOA
#define BUTTON_OK_Pin GPIO_PIN_3
#define BUTTON_OK_GPIO_Port GPIOA
#define PROXIMITY_SENSOR_Pin GPIO_PIN_4
#define PROXIMITY_SENSOR_GPIO_Port GPIOA
#define MCU_NTC1_Pin GPIO_PIN_4
#define MCU_NTC1_GPIO_Port GPIOC
#define MCU_NTC2_Pin GPIO_PIN_5
#define MCU_NTC2_GPIO_Port GPIOC
#define MCU_NTC3_Pin GPIO_PIN_0
#define MCU_NTC3_GPIO_Port GPIOB
#define POWER_VOLTAGE_Pin GPIO_PIN_1
#define POWER_VOLTAGE_GPIO_Port GPIOB
#define BUZZER_Pin GPIO_PIN_9
#define BUZZER_GPIO_Port GPIOD
#define BOTTOM_HEATER2_Pin GPIO_PIN_10
#define BOTTOM_HEATER2_GPIO_Port GPIOD
#define TOP_HEATER2_Pin GPIO_PIN_11
#define TOP_HEATER2_GPIO_Port GPIOD
#define BOTTOM_HEATER1_Pin GPIO_PIN_12
#define BOTTOM_HEATER1_GPIO_Port GPIOD
#define TOP_HEATER1_Pin GPIO_PIN_13
#define TOP_HEATER1_GPIO_Port GPIOD
#define COOLER_FAN_Pin GPIO_PIN_14
#define COOLER_FAN_GPIO_Port GPIOD
#define PRESSURE_VALVE_Pin GPIO_PIN_15
#define PRESSURE_VALVE_GPIO_Port GPIOD
#define ADS_I2C_SCL_Pin GPIO_PIN_6
#define ADS_I2C_SCL_GPIO_Port GPIOB
#define ADS_I2C_SDA_Pin GPIO_PIN_7
#define ADS_I2C_SDA_GPIO_Port GPIOB

/* USER CODE BEGIN Private defines */
#define RX_BUFFER_SIZE 64


#define VERSION_MAJOR 0
#define VERSION_MINOR 1
#define VERSION_PATCH 4
/* USER CODE END Private defines */

#ifdef __cplusplus
}
#endif

#endif /* __MAIN_H */

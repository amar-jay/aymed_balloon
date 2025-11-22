/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * File Name          : freertos.c
  * Description        : Code for freertos applications
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

/* Includes ------------------------------------------------------------------*/
#include "FreeRTOS.h"
#include "task.h"
#include "main.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include "cmsis_os.h"
#include "flash.h"
#include "utils.h"
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */
extern BalloonConfig_t balloonConfig;
extern BalloonState_t balloonState;
void StartLog(void *argument);
void StartSensor(void *argument);
void StartHeater(void *argument);

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */
int counter = 0;

void StartLog(void *argument){
  EE_Init();
  BalloonConfig_Init(); // Load config from EEPROM or set defaults

//  // Example: Update operation time if it's the default (just as a demo)
//  if (balloonConfig.optime == 10) {
//      usb_printf("Updating optime from 10 to 20...\r\n");
//      BalloonConfig_Update(VAR_OPTIME, 20); // Updates RAM and EEPROM
//  }

  for (;;) {

     // Print current configuration via UART using the new serialization
     print_config(&balloonConfig);
//	  print_state(&balloonState);
    osDelay(1000); // Print every 2 seconds
  }
}
void StartSensor(void *argument){for (;;) { osDelay(101);}};
void StartHeater(void *argument){for (;;) { osDelay(100);}};

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
/* USER CODE BEGIN Variables */

/* USER CODE END Variables */

/* Private function prototypes -----------------------------------------------*/
/* USER CODE BEGIN FunctionPrototypes */

/* USER CODE END FunctionPrototypes */

/* Private application code --------------------------------------------------*/
/* USER CODE BEGIN Application */

/* USER CODE END Application */


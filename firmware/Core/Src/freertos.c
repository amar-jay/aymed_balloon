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
#include "main.h"
#include "task.h"

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
// This is the UART thread (cooperative thread), it doesn't do alot but can
// preempt all other thread(heaters and sensors) when in session
// it is blocking. so make sure nothing blocking is within this thread. and
// operation last less than 500ms.
void StartLog(void *argument) {
  usb_printf("AYMED MEDIKAL TEKNOLOJI\r\n"
             "CATHETHER BALLOON SYSTEM\r\n"
             "developed by AMAR JAY (intern 2025)\r\n"
             "supervised by Ahmed W. Harb\r\n");
  usb_printf("please wait... booting system.\r\n");
  for (;;) {
    LogCallbackHandler();

    osDelay(1); //
  }
}

// this thread is preemptive by the StartLog thread but not by the heaters.
// since sensor reading are rather crucial to the understanding of the system.

void StartSensor(void *argument) {
  for (;;) {
    MonitorSensors();
    BuzzerUpdate();
    osDelay(10);
  }
}

void StartHeater(
    void *argument) { // The StartHeater thread is preemptible by the StartLog
  for (;;) {
    ControlHeater();
    osDelay(100);
    MonitorError();
    osDelay(100);
    ManageOperation();
  }
}

/* USER CODE END Application */

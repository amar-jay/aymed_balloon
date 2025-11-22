#include "utils.h"
#include "system.h"
#include "main.h"   // For CDC_Transmit_FS
#include <stdio.h>          // For vsnprintf
#include <stdarg.h>         // For va_list, va_start, va_end
#include <stdint.h>         // For uint8_t
#include <string.h>
#include "cmsis_os.h"
extern UART_HandleTypeDef huart4;
extern osSemaphoreId_t uartSemaphoreHandle;
extern osMutexId_t configMutexHandle;


void usb_printf(const char *fmt, ...)
{
    char buf[128];
    va_list args;
    va_start(args, fmt);
    int len = vsnprintf(buf, sizeof(buf), fmt, args);
    va_end(args);
    if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
      HAL_UART_Transmit(&huart4, (uint8_t*)buf, len, 1000);
      osSemaphoreRelease(uartSemaphoreHandle);
    }
//    CDC_Transmit_FS((uint8_t *)buf, len);
}






void print_config(SystemConfig_t* cfg) {
	char uartBuffer[1024];
    if(osSemaphoreAcquire(configMutexHandle, osWaitForever) == osOK) {
    snprintf(uartBuffer, sizeof(uartBuffer),
        "CONFIG: "
        "opTime=%d;"
        "coTime=%d;"
        "topTempThreshold=%d;"
        "bottomTempThreshold=%d;"
        "temp1Offset=%d;"
        "temp2Offset=%d;"
        "menuResetDelay=%d;"
        "timeCalibration=%d;"
        "maxTempError=%d;"
        "vccVoltageError=%d;"
        "powerTempError=%d;"
        "powerVccErrorEnabled=%d;"
        "sysErrorEnabled=%d;"
        "voltageCalibration=%d;"
        "heaterErrorEnable=%d;"
        "coolingDelay=%d;",
        cfg->optime,
        cfg->cotime,
        cfg->top_temp_threshold,
        cfg->bottom_temp_threshold,
        cfg->temp1_offset,
        cfg->temp2_offset,
        cfg->menu_reset_delay,
        cfg->time_calibration,
        cfg->max_temp_error,
        cfg->vcc_voltage_error,
        cfg->power_temp_error,
        cfg->power_vcc_error > 0,
        cfg->sys_error > 0,
        cfg->voltage_calibration,
        cfg->heater_error_enable,
        cfg->cooling_delay
    );
    }
    osSemaphoreRelease(configMutexHandle);
    if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
        HAL_UART_Transmit(&huart4, (uint8_t*)uartBuffer, strlen(uartBuffer), 1000);
        osSemaphoreRelease(uartSemaphoreHandle);
      }
}


// ---- process command ----

// GET NTC1
// SET 23 23
void process_command(const char *input, SystemConfig_t* config)
{

    if (strncmp(input, "SET", 3) == 0) {
    	int param1, param2;
        sscanf(input + 4, "%d %d", &param1, &param2);
        char msg[64];
//        SystemConfig_Update(param1, param2);
        sprintf(msg, "Parsed SET with %d, %d\r\n", param1,param2);
        if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
        	HAL_UART_Transmit(&huart4, (uint8_t *)msg, strlen(msg), HAL_MAX_DELAY);
        }
    }
    else if (strncmp(input, "GET", 3) == 0) {
    	char key[16];
    	sscanf(input + 4, "%s", key);
        char msg[64];
        // if its config print config
        if (strcmp(msg, "CONFIG") == 0) {
        	print_config(config);
        }
        sprintf(msg, "Parsed GET with key: %s\r\n", key);
        if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
        	HAL_UART_Transmit(&huart4, (uint8_t *)msg, strlen(msg), HAL_MAX_DELAY);
        }
    }
}

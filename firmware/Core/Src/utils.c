#include "../Types/minibuf.h"
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
extern osMutexId_t stateMutexHandle;


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


void print_config(BalloonConfig_t* cfg) {
    systemconfig_t mb_cfg;
    char uartBuffer[256];

    if(osSemaphoreAcquire(configMutexHandle, osWaitForever) == osOK) {
        // Map SystemConfig_t to systemconfig_t
        mb_cfg.opTime = cfg->optime;
        mb_cfg.coTime = cfg->cotime;
        mb_cfg.topTempThreshold = cfg->top_temp_threshold;
        mb_cfg.bottomTempThreshold = cfg->bottom_temp_threshold;
        mb_cfg.temp1Offset = (float)cfg->temp1_offset;
        mb_cfg.temp2Offset = (float)cfg->temp2_offset;
        mb_cfg.menuResetDelay = cfg->menu_reset_delay;
        mb_cfg.timeCalibration = (float)cfg->time_calibration;
        mb_cfg.maxTempError = (float)cfg->max_temp_error;
        mb_cfg.vccVoltageError = (float)cfg->vcc_voltage_error;
        mb_cfg.powerTempError = (float)cfg->power_temp_error;
        mb_cfg.powerVccErrorEnabled = cfg->power_vcc_error > 0;
        mb_cfg.sysErrorEnabled = cfg->sys_error > 0;
        mb_cfg.voltageCalibration = (float)cfg->voltage_calibration;
        mb_cfg.heaterErrorEnable = (float)cfg->heater_error_enable;
        mb_cfg.coolingDelay = cfg->cooling_delay;
        
        osSemaphoreRelease(configMutexHandle);
    }

    // Serialize
    if (mb_systemconfig_serialize(&mb_cfg, uartBuffer, sizeof(uartBuffer)) == MB_OK) {
        // Append newline for UART transmission
        strlcat(uartBuffer, "\r\n", sizeof(uartBuffer));
        
        if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
            HAL_UART_Transmit(&huart4, (uint8_t*)uartBuffer, strlen(uartBuffer), 1000);
            osSemaphoreRelease(uartSemaphoreHandle);
        }
    }
}

void print_state(BalloonState_t* state) {
    systemdata_t data;
    char uartBuffer[256];

    if(osSemaphoreAcquire(stateMutexHandle, osWaitForever) == osOK) {
        // Map state to systemdata_t
        data.topTemp = (float)state->temp1;
        data.bottomTemp = (float)state->temp2;
        data.powerSupplyTemp = (float)state->temp3;
        
        // Read heater states directly from GPIO
        data.topHeaterActive = (HAL_GPIO_ReadPin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin) == GPIO_PIN_SET);
        data.bottomHeaterActive = (HAL_GPIO_ReadPin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin) == GPIO_PIN_SET);

        data.pedalActive = state->pedal;
        data.proximityActive = state->proximity;
        data.menuActive = state->menu_active;
        data.powerSupplyVoltage = (float)state->vcc;

        osSemaphoreRelease(stateMutexHandle);
    }

    // Serialize
    if (mb_systemdata_serialize(&data, uartBuffer, sizeof(uartBuffer)) == MB_OK) {
        // Send via UART
        if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
            HAL_UART_Transmit(&huart4, (uint8_t*)uartBuffer, strlen(uartBuffer), 1000);
            HAL_UART_Transmit(&huart4, (uint8_t*)"\r\n", 2, 1000); // Add newline if needed by protocol? 
            // Minibuf usually doesn't add newline.
            osSemaphoreRelease(uartSemaphoreHandle);
        }
    }
}

void handle_commands(const char *key, const char *value, BalloonConfig_t* config, BalloonState_t* state)
{
    if (osSemaphoreAcquire(stateMutexHandle, 1000) == osOK) {
        if (strcmp(key, "MANUAL_PEDAL")) {
            if (strcmp(value, "ON") == 0) {
                state->pedal = 1;
            }
            else if (strcmp(value, "OFF") == 0) {
                state->pedal = 0;
            }
        } else if (strcmp(key, "MANUAL_PROXIMITY")) {
            if (strcmp(value, "ON") == 0) {
                state->proximity = 1;
            }
            else if (strcmp(value, "OFF") == 0) {
                state->proximity = 0;
            }
        }
        osSemaphoreRelease(stateMutexHandle);
    }
}


// ---- process command ----
// GET CONFIG
// SET MANUAL_PEDAL ON
void process_command(const char *input, BalloonConfig_t* config, BalloonState_t* state)
{

    if (strncmp(input, "SET", 3) == 0) {
    	char param1[32];
    	char param2[32];
        // Initialize buffers to avoid issues if sscanf fails
        memset(param1, 0, sizeof(param1));
        memset(param2, 0, sizeof(param2));
        
        if (sscanf(input + 4, "%31s %31s", param1, param2) == 2) {
            char msg[128];
            handle_commands(param1, param2, config, state);
            
            snprintf(msg, sizeof(msg), "Parsed SET with %s, %s\r\n", param1, param2);
            usb_printf(msg); // Use usb_printf for thread-safe printing
        } else {
             usb_printf("Error: Invalid SET command format\r\n");
        }
    }
    else if (strncmp(input, "GET", 3) == 0) {
    	char key[32];
        memset(key, 0, sizeof(key));
        
    	if (sscanf(input + 4, "%31s", key) == 1) {
            char msg[64];
            // if its config print config
            if (strcmp(key, "CONFIG") == 0) {
                print_config(config);
            }
            // if its state print state
            else if (strcmp(key, "STATE") == 0) {
                print_state(state);
            }
            
            snprintf(msg, sizeof(msg), "Parsed GET with key: %s\r\n", key);
            usb_printf(msg);
        } else {
            usb_printf("Error: Invalid GET command format\r\n");
        }
    }
}

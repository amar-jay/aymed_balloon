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


char print_buf[128];
void usb_printf(const char *fmt, ...)
{
    va_list args;
    va_start(args, fmt);
    int len = vsnprintf(print_buf, sizeof(print_buf), fmt, args);
    va_end(args);
    if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
      HAL_UART_Transmit(&huart4, (uint8_t*)print_buf, len, 1000);
      osSemaphoreRelease(uartSemaphoreHandle);
    }
}


char config_uart_buffer[256*2];
void print_config(BalloonConfig_t* cfg) {
    systemconfig_t mb_cfg;

    if(osSemaphoreAcquire(configMutexHandle, 100) == osOK) {
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

    // Prepend "CONFIG: " and serialize directly after prefix
    strcpy(config_uart_buffer, "CONFIG: ");  // prepend prefix
    size_t prefix_len = strlen(config_uart_buffer);

    if(mb_systemconfig_serialize(&mb_cfg, (uint8_t*)(config_uart_buffer + prefix_len),
                                 sizeof(config_uart_buffer) - prefix_len - 2) == MB_OK)
    {
        strlcat(config_uart_buffer, "\r\n", sizeof(config_uart_buffer));

        if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
            HAL_UART_Transmit(&huart4, (uint8_t*)config_uart_buffer, strlen(config_uart_buffer), 1000);
            osSemaphoreRelease(uartSemaphoreHandle);
        }

        // Clear buffer for next use
        config_uart_buffer[0] = '\0';
    } else {
        usb_printf("[DEBUG] Config serialization failed\r\n");
        osDelay(100);
    }
}


char status_uart_buffer[256];
void print_status(BalloonState_t* state) {
    systemdata_t data;

    // Safely copy state under mutex
    if(osSemaphoreAcquire(stateMutexHandle, 100) == osOK) {
        data.topTemp = (float)state->temp1;
        data.bottomTemp = (float)state->temp2;
        data.powerSupplyTemp = (float)state->temp3;

        data.topHeaterActive = (HAL_GPIO_ReadPin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin) == GPIO_PIN_SET);
        data.bottomHeaterActive = (HAL_GPIO_ReadPin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin) == GPIO_PIN_SET);

        data.pedalActive = state->pedal;
        data.proximityActive = state->proximity;
        data.menuActive = state->menu_active;
        data.powerSupplyVoltage = (float)state->vcc;

        osSemaphoreRelease(stateMutexHandle);
    }

    // Serialize directly into status_uart_buffer after the prefix
    strcpy(status_uart_buffer, "STATUS: "); // prepend prefix

    size_t prefix_len = strlen(status_uart_buffer);
    if (mb_systemdata_serialize(&data, (uint8_t*)(status_uart_buffer + prefix_len),
                                sizeof(status_uart_buffer) - prefix_len - 2) == MB_OK)
    {
        // Add CRLF
        strlcat(status_uart_buffer, "\r\n", sizeof(status_uart_buffer));

        // Send via UART under semaphore protection
        if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
            HAL_UART_Transmit(&huart4, (uint8_t*)status_uart_buffer, strlen(status_uart_buffer), 1000);
            osSemaphoreRelease(uartSemaphoreHandle);
        }
        status_uart_buffer[0] = '\0';
    } else {
        usb_printf("[DEBUG] State serialization failed\r\n");
        osDelay(100);
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

//            snprintf(msg, sizeof(msg), "Parsed SET with %s, %s\r\n", param1, param2);
//            usb_printf(msg); // Use usb_printf for thread-safe printing
        } else {
             usb_printf("ERROR: Invalid SET command format\r\n");
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
            else if (strcmp(key, "STATUS") == 0) {
                print_status(state);
            }

            else if (strcmp(key, "ERROR") == 0) {
                PrintError(state->error);
            }

//            snprintf(msg, sizeof(msg), "Parsed GET with key: %s\r\n", key);
//            usb_printf(msg);
        } else {
            usb_printf("ERROR: Invalid GET command format\r\n");
        }
    }
}


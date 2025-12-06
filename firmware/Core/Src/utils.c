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

    if(osMutexAcquire(configMutexHandle, 100) == osOK) {
        mb_cfg.opTime = cfg->optime;
        mb_cfg.coTime = cfg->cotime;
        mb_cfg.topTempThreshold = cfg->top_temp_threshold;
        mb_cfg.bottomTempThreshold = cfg->bottom_temp_threshold;
        mb_cfg.temp1Offset = (float)cfg->top_temp_offset;
        mb_cfg.temp2Offset = (float)cfg->bottom_temp_offset;
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
        mb_cfg.useInternalADC = cfg->use_internal_adc;

        osMutexRelease(configMutexHandle);
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
    if(osMutexAcquire(stateMutexHandle, 100) == osOK) {
        data.topTemp = (float)state->temp1;
        data.bottomTemp = (float)state->temp2;
        data.powerSupplyTemp = (float)state->temp3;

        data.topHeaterActive = (HAL_GPIO_ReadPin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin) == GPIO_PIN_SET);
        data.bottomHeaterActive = (HAL_GPIO_ReadPin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin) == GPIO_PIN_SET);
				data.coolingFanActive = (HAL_GPIO_ReadPin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin) == GPIO_PIN_SET);
				data.pressureValveActive = (HAL_GPIO_ReadPin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin) == GPIO_PIN_SET);

        data.pedalActive = state->pedal;
        data.proximityActive = state->proximity;
        data.menuActive = state->menu_active;
        data.powerSupplyVoltage = (float)state->vcc;

        osMutexRelease(stateMutexHandle);
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

void print_version() {
		systemversion_t mb_version;
		mb_version.major = VERSION_MAJOR;
		mb_version.minor = VERSION_MINOR;
		mb_version.patch = VERSION_PATCH;
		char version_uart_buffer[64];
		strcpy(version_uart_buffer, "VERSION: "); // prepend prefix

		size_t prefix_len = strlen(version_uart_buffer);
		if (mb_systemversion_serialize(&mb_version, (uint8_t*)(version_uart_buffer + prefix_len),
																sizeof(version_uart_buffer) - prefix_len - 2) == MB_OK)
		{
				// Add CRLF
				strlcat(version_uart_buffer, "\r\n", sizeof(version_uart_buffer));

				// Send via UART under semaphore protection
				if(osSemaphoreAcquire(uartSemaphoreHandle, osWaitForever) == osOK) {
						HAL_UART_Transmit(&huart4, (uint8_t*)version_uart_buffer, strlen(version_uart_buffer), 1000);
						osSemaphoreRelease(uartSemaphoreHandle);
				}
				version_uart_buffer[0] = '\0';
		} else {
				usb_printf("[DEBUG] Version serialization failed\r\n");
				osDelay(100);;
		}
}


void handle_commands(const char *key, const char *value, BalloonConfig_t* config, BalloonState_t* state)
{
    if (osMutexAcquire(stateMutexHandle, 1000) == osOK) {
        if (strcmp(key, "MANUAL_PEDAL") == 0) {
            if (strcmp(value, "ON") == 0) {
                state->pedal = 1;
            }
            else if (strcmp(value, "OFF") == 0) {
                state->pedal = 0;
            }
        } else if (strcmp(key, "MANUAL_PROXIMITY") == 0) {
            if (strcmp(value, "ON") == 0) {
                state->proximity = 1;
            }
            else if (strcmp(value, "OFF") == 0) {
                state->proximity = 0;
            }
        } 
				else if (strcmp(key, "MANUAL_PRESSURE") == 0) {
					GPIO_PinState newState;
					if (strcmp(value, "ON") == 0) {
						newState = GPIO_PIN_SET;
					} else if (strcmp(value, "OFF") == 0) {
						newState = GPIO_PIN_RESET;
					} else {
						newState = HAL_GPIO_ReadPin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin);
					}
					HAL_GPIO_WritePin(PRESSURE_VALVE_GPIO_Port, PRESSURE_VALVE_Pin, newState);
				}
				else if (strcmp(key, "MANUAL_COOLING") == 0) {
					GPIO_PinState newState;
					if (strcmp(value, "ON") == 0) {
						newState = GPIO_PIN_SET;
					} else if (strcmp(value, "OFF") == 0) {
						newState = GPIO_PIN_RESET;
					} else {
						newState = HAL_GPIO_ReadPin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin);
					}
					HAL_GPIO_WritePin(COOLER_FAN_GPIO_Port, COOLER_FAN_Pin, newState);
				}
				else if (strcmp(key, "MANUAL_TOP_HEATER") == 0) {
					GPIO_PinState newState;
					if (strcmp(value, "ON") == 0) {
						newState = GPIO_PIN_SET;
					} else if (strcmp(value, "OFF") == 0) {
						newState = GPIO_PIN_RESET;
					} else {
						newState = HAL_GPIO_ReadPin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin);
					}
					// Control both heater pins simultaneously for redundancy/parallel heating
					HAL_GPIO_WritePin(TOP_HEATER1_GPIO_Port, TOP_HEATER1_Pin, newState);
					HAL_GPIO_WritePin(TOP_HEATER2_GPIO_Port, TOP_HEATER2_Pin, newState);
				}
				else if (strcmp(key, "MANUAL_BOTTOM_HEATER") == 0) {
					GPIO_PinState newState;
					if (strcmp(value, "ON") == 0) {
						newState = GPIO_PIN_SET;
					} else if (strcmp(value, "OFF") == 0) {
						newState = GPIO_PIN_RESET;
					} else {
						newState = HAL_GPIO_ReadPin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin);
					}
					// Control both heater pins simultaneously for redundancy/parallel heating
					HAL_GPIO_WritePin(BOTTOM_HEATER1_GPIO_Port, BOTTOM_HEATER1_Pin, newState);
					HAL_GPIO_WritePin(BOTTOM_HEATER2_GPIO_Port, BOTTOM_HEATER2_Pin, newState);
				}
        osMutexRelease(stateMutexHandle);
    }
    if (osMutexAcquire(configMutexHandle, 1000) == osOK) {
			  // SET CONFIG_OPTIME
				if (strcmp(key, "CONFIG_OPTIME") == 0) {
					uint8_t optime = atoi(value);
					if (optime >= 1 && optime <= 100) {
						config->optime = optime;
						BalloonConfig_Update(VAR_OPTIME, optime);
					} else {
						usb_printf("ERROR: Invalid OPTIME value. Must be between 1 and 100.\r\n");
					}
				}
				// SET CONFIG_COTIME
				else if (strcmp(key, "CONFIG_COTIME") == 0) {
					uint8_t cotime = atoi(value);
					if (cotime >= 1 && cotime <= 100) {
						config->cotime = cotime;
						BalloonConfig_Update(VAR_COTIME, cotime);
					} else {
						usb_printf("ERROR: Invalid COTIME value. Must be between 1 and 100.\r\n");
					}
				}
				// SET CONFIG_TOP_TEMP_THRESHOLD
				else if (strcmp(key, "CONFIG_TOP_TEMP_THRESHOLD") == 0) {
					uint8_t top_temp = atoi(value);
					if (top_temp > 50 && top_temp < 200) {
						config->top_temp_threshold = top_temp;
						BalloonConfig_Update(VAR_TOP_TEMP_THRESHOLD, top_temp);
					} else {
						usb_printf("ERROR: Invalid TOP_TEMP_THRESHOLD value. Must be between 1 and 100.\r\n");
					}
				}
				// SET CONFIG_BOTTOM_TEMP_THRESHOLD
				else if (strcmp(key, "CONFIG_BOTTOM_TEMP_THRESHOLD") == 0) {
					uint8_t bottom_temp = atoi(value);
					if (bottom_temp > 50 && bottom_temp < 200) {
						config->bottom_temp_threshold = bottom_temp;
						BalloonConfig_Update(VAR_BOTTOM_TEMP_THRESHOLD, bottom_temp);
					} else {
						usb_printf("ERROR: Invalid BOTTOM_TEMP_THRESHOLD value. Must be between 1 and 100.\r\n");
					}
				}

				// SET CONFIG_TEMP1_OFFSET
				else if (strcmp(key, "CONFIG_TEMP1_OFFSET") == 0) {
					uint8_t top_temp_offset = atoi(value);
					if (top_temp_offset < 500) {
						config->top_temp_offset = top_temp_offset;
						BalloonConfig_Update(VAR_TOP_TEMP_OFFSET, top_temp_offset);
					} else {
						usb_printf("ERROR: Invalid TEMP1_OFFSET value. Must be less than 100.\r\n");
					}
				}

				// SET CONFIG_TEMP2_OFFSET
				else if (strcmp(key, "CONFIG_TEMP2_OFFSET") == 0) {
					uint8_t bottom_temp_offset = atoi(value);
					if (bottom_temp_offset < 500) {
						config->bottom_temp_offset = bottom_temp_offset;
						BalloonConfig_Update(VAR_BOTTOM_TEMP_OFFSET, bottom_temp_offset);
					} else {
						usb_printf("ERROR: Invalid TEMP2_OFFSET value. Must be less than 100.\r\n");
					}
				}

				// SET CONFIG_MAX_TEMP_ERROR
				else if (strcmp(key, "CONFIG_MAX_TEMP_ERROR") == 0) {
					uint8_t max_temp_error = atoi(value);
					if (max_temp_error <= 100) {
						config->max_temp_error = max_temp_error;
						BalloonConfig_Update(VAR_MAX_TEMP_ERROR, max_temp_error);
					} else {
						usb_printf("ERROR: Invalid MAX_TEMP_ERROR value. Must be between 0 and 100.\r\n");
					}
				}

				// SET RESET CONFIG
				if (strcmp(key, "RESET") == 0 && strcmp(value, "CONFIG") == 0) {
					BalloonConfig_ForceReset();
				}
				osMutexRelease(configMutexHandle);
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
        	// I DONT HAVE A FUCKING CLUE WHY IT WONT WORK WITHOUT THIS VARIABLE. DONT REMOVE IT!!!
            char msg[128];
            handle_commands(param1, param2, config, state);
        } else {
             usb_printf("ERROR: Invalid SET command format\r\n");
        }
    }
    else if (strncmp(input, "GET", 3) == 0) {
    	char key[32];
        memset(key, 0, sizeof(key));
        
    	if (sscanf(input + 4, "%31s", key) == 1) {
    		// I DONT HAVE A FUCKING CLUE WHY IT WONT WORK WITHOUT THIS VARIABLE. DONT REMOVE IT!!!
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

						else if (strcmp(key, "VERSION") == 0) {
							  print_version();
						}
						
						else if (strcmp(key, "OPSTATE") == 0) {
						    const char* state_names[] = {"STANDBY", "READY", "WELDING", "COOLING"};
						    usb_printf("Operation State: %s\r\n", state_names[state->op_state]);
						    if(state->op_state == OP_WELDING) {
						        usb_printf("  Welding Time: %d / %d seconds\r\n", state->prtime, balloonConfig.optime);
						    } else if(state->op_state == OP_COOLING) {
						        usb_printf("  Cooling Time: %d / %d seconds\r\n", state->cltime, balloonConfig.cotime);
						    }
						}
        } else {
            usb_printf("ERROR: Invalid GET command format\r\n");
        }
    }
}


/*
 * utils.h
 *
 *  Created on: Nov 19, 2025
 *      Author: ASUS
 */

#ifndef INC_UTILS_H_
#define INC_UTILS_H_
#include "system.h"
#include "config.h"

void usb_printf(const char *fmt, ...);
void process_command(const char *input, BalloonConfig_t* config, BalloonState_t* state);
void print_config(BalloonConfig_t* cfg);
#endif /* INC_UTILS_H_ */

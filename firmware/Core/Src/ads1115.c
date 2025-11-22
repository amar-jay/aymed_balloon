/* ads1115_hal.c - thin wrapper around platform ADC driver */
#include "ads1115.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>


float _get_pga_coefficients(uint16_t pga);

HAL_StatusTypeDef ads1115_set_config(ADS1115_HandleTypeDef *ads, uint16_t config) {
  uint8_t buf[2];
  buf[0] = (uint8_t)(config >> 8);
  buf[1] = (uint8_t)(config & 0xFF);

  if (HAL_I2C_Mem_Write(ads->i2c_handler,
                        (uint16_t)(ADS1115_DEFAULT_ADDRESS << 1),
                        ADS1115_CONFIG_REG, 1, buf, 2, HAL_MAX_DELAY) != HAL_OK)
    return HAL_ERROR;
  ads->config = config;
  return HAL_OK;
}

uint16_t ads1115_get_config(ADS1115_HandleTypeDef *ads) {
  uint8_t buf[2];

  if (HAL_I2C_Mem_Read(ads->i2c_handler,
                       (uint16_t)((ADS1115_DEFAULT_ADDRESS << 1) | 0x1),
                       ADS1115_CONFIG_REG, 1, buf, 2, HAL_MAX_DELAY) != HAL_OK)
    return HAL_ERROR;

  ads->config = (buf[0] << 8) | buf[1];
  return ads->config;
}

// set to the conversion register
HAL_StatusTypeDef ads1115_set_conv(ADS1115_HandleTypeDef *ads, uint16_t conv) {
  uint8_t buf[2];
  buf[0] = (uint8_t)(conv >> 8);
  buf[1] = (uint8_t)(conv & 0xFF);

  if (HAL_I2C_Mem_Write(ads->i2c_handler,
                        (uint16_t)(ADS1115_DEFAULT_ADDRESS << 1),
                        ADS1115_CONV_REG, 1, buf, 2, HAL_MAX_DELAY) != HAL_OK)
    return HAL_ERROR;
  return HAL_OK;
}

// fetch from the conversion register
HAL_StatusTypeDef ads1115_get_conv(ADS1115_HandleTypeDef *ads, uint16_t *conv) {
  uint8_t buf[2];

  if (HAL_I2C_Mem_Read(ads->i2c_handler,
                       (uint16_t)((ADS1115_DEFAULT_ADDRESS << 1) | 0x1),
                       ADS1115_CONV_REG, 1, buf, 2, HAL_MAX_DELAY) != HAL_OK)
    return HAL_ERROR;

  *conv = (buf[0] << 8) | buf[1];
  return HAL_OK;
}

HAL_StatusTypeDef ads1115_read_raw(ADS1115_HandleTypeDef *ads, uint16_t mux,
                                   uint16_t* raw_buf) {
  uint16_t config = (ads->config & ~(ADS1115_MUX_MASK | ADS1115_OS_MASK)) |
                    ADS1115_OS(ADS1115_OS_SINGLE) | ADS1115_MUX(mux);

  // Wait for conversion (poll OS bit)
  int8_t ret = ads1115_set_config(ads, config);
  if (ret != HAL_OK) {
    return ret;
  }
  uint8_t retries = 0;

  do {
	  retries++;
	  uint16_t status_buf = ads1115_get_config(ads);
	  if (status_buf & (ADS1115_OS(ADS1115_OS_SINGLE)))
		  break;
  } while (retries < MAX_RETRIES); // wait until OS=1 (conversion complete)

  // Read conversion result
  if (ads1115_get_conv(ads, raw_buf) != HAL_OK)
    return HAL_ERROR;

  return HAL_OK;
}

HAL_StatusTypeDef ads1115_read_single_ended(ADS1115_HandleTypeDef *ads,
                                            uint16_t mux, float *mv) {

  uint16_t raw_buf;
  if (ads1115_read_raw(ads, mux, &raw_buf) != HAL_OK)
    return HAL_ERROR;

  // convert_raw_to_mv
  *mv = (raw_buf) *
        _get_pga_coefficients(ADS1115_PGA_2_048V);

  return HAL_OK;
}

HAL_StatusTypeDef ads1115_read_P0N1(ADS1115_HandleTypeDef *ads, float *mv) {
  return ads1115_read_single_ended(ads, ADS1115_MUX_P0_N1, mv);
}

HAL_StatusTypeDef ads1115_read_P0N3(ADS1115_HandleTypeDef *ads, float *mv) {
  return ads1115_read_single_ended(ads, ADS1115_MUX_P0_N3, mv);
}

HAL_StatusTypeDef ads1115_read_P1N3(ADS1115_HandleTypeDef *ads, float *mv) {
  return ads1115_read_single_ended(ads, ADS1115_MUX_P1_N3, mv);
}

HAL_StatusTypeDef ads1115_read_P2N3(ADS1115_HandleTypeDef *ads, float *mv) {
  return ads1115_read_single_ended(ads, ADS1115_MUX_P2_N3, mv);
}

HAL_StatusTypeDef ads1115_read_P0NG(ADS1115_HandleTypeDef *ads, float *mv) {
  return ads1115_read_single_ended(ads, ADS1115_MUX_P0_NG, mv);
}

HAL_StatusTypeDef ads1115_read_P1NG(ADS1115_HandleTypeDef *ads, float *mv) {
  return ads1115_read_single_ended(ads, ADS1115_MUX_P1_NG, mv);
}

HAL_StatusTypeDef ads1115_read_P2NG(ADS1115_HandleTypeDef *ads, float *mv) {
  return ads1115_read_single_ended(ads, ADS1115_MUX_P2_NG, mv);
}

HAL_StatusTypeDef ads1115_read_P3NG(ADS1115_HandleTypeDef *ads, float *mv) {
  return ads1115_read_single_ended(ads, ADS1115_MUX_P3_NG, mv);
}

HAL_StatusTypeDef ads1115_start_continuous(ADS1115_HandleTypeDef *ads,
                                           uint16_t mux) {
  uint16_t config = (ads->config & ~(ADS1115_MUX_MASK | ADS1115_MODE_MASK)) |
                    ADS1115_MODE(ADS1115_MODE_CONTINUOUS) | ADS1115_MUX(mux);

  return ads1115_set_config(ads, config);
}

HAL_StatusTypeDef ads1115_read_continuous(ADS1115_HandleTypeDef *ads,
                                          float *mv) {
  uint16_t conv;
  if (ads1115_get_conv(ads, &conv) != HAL_OK)
    return HAL_ERROR;
  *mv = (int16_t)conv * _get_pga_coefficients(ads->pga_coeff);
  return HAL_OK;
}

float _get_pga_coefficients(uint16_t pga) {
  switch (pga) {
  case ADS1115_PGA(ADS1115_PGA_6_144V):
    return 0.1875;

  case ADS1115_PGA(ADS1115_PGA_4_096V):
    return 0.125;

  case ADS1115_PGA(ADS1115_PGA_2_048V):
    return 0.0625;
    break;

  case ADS1115_PGA(ADS1115_PGA_1_024V):
    return 0.03125;

  case ADS1115_PGA(ADS1115_PGA_0_512V):
    return 0.015625;

  case ADS1115_PGA(ADS1115_PGA_0_256V):
  case ADS1115_PGA(ADS1115_PGA_0_256VB):
  case ADS1115_PGA(ADS1115_PGA_0_256VC):
    return 0.0078125;
  default:
    return -EXIT_FAILURE;
  }
}

void ads1115_set_pga(ADS1115_HandleTypeDef *ads, uint16_t pga) {
  ads->pga_coeff = pga;
}

ADS1115_HandleTypeDef ads1115_hal_init(I2C_HandleTypeDef *handler,
                                       uint16_t config) {
  ADS1115_HandleTypeDef ads;
  ads.i2c_handler = handler;
  ads.config = config;
  ads.pga_coeff = ADS1115_PGA_2_048V;
  ads.setPGA = ads1115_set_pga;
  ads.setConfig = ads1115_set_config;
  ads.getConfig = ads1115_get_config;
  // ads.setConversionReadyPinMode = ads1115_set_conv;
  // ads.readSingleEnded = ads1115_read_single_ended;
  return ads;
}

void ads1115_hal_deinit(ADS1115_HandleTypeDef *ads) {
  if (!ads) return;

  ads->i2c_handler = NULL;
  ads->config = 0;
  ads->pga_coeff = 0;

  /* Clear method pointers to avoid accidental use after deinit */
  ads->setPGA = NULL;
  ads->setConfig = NULL;
  ads->getConfig = NULL;
}

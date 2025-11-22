#ifndef MINIBUF_H
#define MINIBUF_H

#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

#define MB_OK 0
#define MB_ERR_INVALID_FORMAT 1
#define MB_ERR_BUFFER_TOO_SMALL 2

extern int mb_float_precision;

typedef struct {
    float topTemp;
    float bottomTemp;
    float powerSupplyTemp;
    bool topHeaterActive;
    bool bottomHeaterActive;
    float powerSupplyVoltage;
    bool proximityActive;
    bool menuActive;
    bool pedalActive;
} systemdata_t;

typedef struct {
    int32_t opTime;
    int32_t coTime;
    int32_t topTempThreshold;
    int32_t bottomTempThreshold;
    float temp1Offset;
    float temp2Offset;
    int32_t menuResetDelay;
    float timeCalibration;
    float maxTempError;
    float vccVoltageError;
    float powerTempError;
    bool powerVccErrorEnabled;
    bool sysErrorEnabled;
    float voltageCalibration;
    float heaterErrorEnable;
    int32_t coolingDelay;
} systemconfig_t;

int mb_systemdata_parse(const char* buf, systemdata_t* out);
int mb_systemdata_serialize(const systemdata_t* in, char* buf, size_t buf_size);

int mb_systemconfig_parse(const char* buf, systemconfig_t* out);
int mb_systemconfig_serialize(const systemconfig_t* in, char* buf, size_t buf_size);

#endif

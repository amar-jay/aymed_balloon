#include "minibuf.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

int mb_float_precision = 3;

int mb_systemdata_parse(const char* buf, systemdata_t* out) {
    char* start = strchr(buf, '[');
    if (!start) return MB_ERR_INVALID_FORMAT;
    start++;
    char* end = strchr(start, ']');
    if (!end) return MB_ERR_INVALID_FORMAT;
    *end = '\0';
    int count = atoi(start);
    *end = ']';
    char* values = end + 1;
    char* vals = strdup(values);
    char* token = strtok(vals, ";");
    int i = 0;
    while (token && i < 9) {
        if (i == 0) {
            out->topTemp = atof(token);
        }
        if (i == 1) {
            out->bottomTemp = atof(token);
        }
        if (i == 2) {
            out->powerSupplyTemp = atof(token);
        }
        if (i == 3) {
            out->topHeaterActive = strcmp(token, "T") == 0;
        }
        if (i == 4) {
            out->bottomHeaterActive = strcmp(token, "T") == 0;
        }
        if (i == 5) {
            out->powerSupplyVoltage = atof(token);
        }
        if (i == 6) {
            out->proximityActive = strcmp(token, "T") == 0;
        }
        if (i == 7) {
            out->menuActive = strcmp(token, "T") == 0;
        }
        if (i == 8) {
            out->pedalActive = strcmp(token, "T") == 0;
        }
        i++;
        token = strtok(NULL, ";");
    }
    free(vals);
    return MB_OK;
}

int mb_systemdata_serialize(const systemdata_t* in, char* buf, size_t buf_size) {
    int len = snprintf(buf, buf_size, "[9]", 9);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    char* pos = buf + len;
    len += snprintf(pos, buf_size - len, "%s%d.%0*d", in->topTemp < 0 ? "-" : "", abs((int)in->topTemp), mb_float_precision, (int)((fabsf(in->topTemp) - abs((int)in->topTemp)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->bottomTemp < 0 ? "-" : "", abs((int)in->bottomTemp), mb_float_precision, (int)((fabsf(in->bottomTemp) - abs((int)in->bottomTemp)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->powerSupplyTemp < 0 ? "-" : "", abs((int)in->powerSupplyTemp), mb_float_precision, (int)((fabsf(in->powerSupplyTemp) - abs((int)in->powerSupplyTemp)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->topHeaterActive ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->bottomHeaterActive ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->powerSupplyVoltage < 0 ? "-" : "", abs((int)in->powerSupplyVoltage), mb_float_precision, (int)((fabsf(in->powerSupplyVoltage) - abs((int)in->powerSupplyVoltage)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->proximityActive ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->menuActive ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->pedalActive ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    return MB_OK;
}

int mb_systemconfig_parse(const char* buf, systemconfig_t* out) {
    char* start = strchr(buf, '[');
    if (!start) return MB_ERR_INVALID_FORMAT;
    start++;
    char* end = strchr(start, ']');
    if (!end) return MB_ERR_INVALID_FORMAT;
    *end = '\0';
    int count = atoi(start);
    *end = ']';
    char* values = end + 1;
    char* vals = strdup(values);
    char* token = strtok(vals, ";");
    int i = 0;
    while (token && i < 16) {
        if (i == 0) {
            out->opTime = atoi(token);
        }
        if (i == 1) {
            out->coTime = atoi(token);
        }
        if (i == 2) {
            out->topTempThreshold = atoi(token);
        }
        if (i == 3) {
            out->bottomTempThreshold = atoi(token);
        }
        if (i == 4) {
            out->temp1Offset = atof(token);
        }
        if (i == 5) {
            out->temp2Offset = atof(token);
        }
        if (i == 6) {
            out->menuResetDelay = atoi(token);
        }
        if (i == 7) {
            out->timeCalibration = atof(token);
        }
        if (i == 8) {
            out->maxTempError = atof(token);
        }
        if (i == 9) {
            out->vccVoltageError = atof(token);
        }
        if (i == 10) {
            out->powerTempError = atof(token);
        }
        if (i == 11) {
            out->powerVccErrorEnabled = strcmp(token, "T") == 0;
        }
        if (i == 12) {
            out->sysErrorEnabled = strcmp(token, "T") == 0;
        }
        if (i == 13) {
            out->voltageCalibration = atof(token);
        }
        if (i == 14) {
            out->heaterErrorEnable = atof(token);
        }
        if (i == 15) {
            out->coolingDelay = atoi(token);
        }
        i++;
        token = strtok(NULL, ";");
    }
    free(vals);
    return MB_OK;
}

int mb_systemconfig_serialize(const systemconfig_t* in, char* buf, size_t buf_size) {
    int len = snprintf(buf, buf_size, "[16]", 16);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    char* pos = buf + len;
    len += snprintf(pos, buf_size - len, "%d", in->opTime);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d", in->coTime);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d", in->topTempThreshold);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d", in->bottomTempThreshold);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->temp1Offset < 0 ? "-" : "", abs((int)in->temp1Offset), mb_float_precision, (int)((fabsf(in->temp1Offset) - abs((int)in->temp1Offset)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->temp2Offset < 0 ? "-" : "", abs((int)in->temp2Offset), mb_float_precision, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d", in->menuResetDelay);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->timeCalibration < 0 ? "-" : "", abs((int)in->timeCalibration), mb_float_precision, (int)((fabsf(in->timeCalibration) - abs((int)in->timeCalibration)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->maxTempError < 0 ? "-" : "", abs((int)in->maxTempError), mb_float_precision, (int)((fabsf(in->maxTempError) - abs((int)in->maxTempError)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->vccVoltageError < 0 ? "-" : "", abs((int)in->vccVoltageError), mb_float_precision, (int)((fabsf(in->vccVoltageError) - abs((int)in->vccVoltageError)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->powerTempError < 0 ? "-" : "", abs((int)in->powerTempError), mb_float_precision, (int)((fabsf(in->powerTempError) - abs((int)in->powerTempError)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->powerVccErrorEnabled ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->sysErrorEnabled ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->voltageCalibration < 0 ? "-" : "", abs((int)in->voltageCalibration), mb_float_precision, (int)((fabsf(in->voltageCalibration) - abs((int)in->voltageCalibration)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d", in->heaterErrorEnable < 0 ? "-" : "", abs((int)in->heaterErrorEnable), mb_float_precision, (int)((fabsf(in->heaterErrorEnable) - abs((int)in->heaterErrorEnable)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d", in->coolingDelay);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    return MB_OK;
}


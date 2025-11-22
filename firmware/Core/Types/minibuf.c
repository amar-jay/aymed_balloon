#include "minibuf.h"
#include <string.h>
#include <stdio.h>
#include <math.h>
#include <stdlib.h>

int mb_float_precision = 1;

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
    len += snprintf(pos, buf_size - len, "%.*f", mb_float_precision, in->topTemp);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%.*f", mb_float_precision, in->bottomTemp);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%.*f", mb_float_precision, in->powerSupplyTemp);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->topHeaterActive ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->bottomHeaterActive ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%.*f", mb_float_precision, in->powerSupplyVoltage);
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
    len += snprintf(pos, buf_size - len, ";%d.%03d", (int)in->temp2Offset, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d.%03d", (int)in->temp2Offset, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d.%.*d", (int)in->temp2Offset,mb_float_precision, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d.%03d", (int)in->temp2Offset, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d.%03d", (int)in->temp2Offset, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d.%03d", (int)in->temp2Offset, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d.%03d", (int)in->temp2Offset, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d.%03d", (int)in->temp2Offset, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d.%03d", (int)in->temp2Offset, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d.%03d", (int)in->temp2Offset, (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * 1000 + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d",
        in->temp2Offset < 0 ? "-" : "",
        abs((int)in->temp2Offset),
        mb_float_precision,
        (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
//    len += snprintf(pos, buf_size - len, ";%.*f", mb_float_precision, in->temp2Offset);
//    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
//    pos = buf + len;
//    len += snprintf(pos, buf_size - len, ";%d", in->menuResetDelay);
//    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
//    pos = buf + len;
//    len += snprintf(pos, buf_size - len, ";%.*f", mb_float_precision, in->timeCalibration);
//    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
//    pos = buf + len;
//    len += snprintf(pos, buf_size - len, ";%.*f", mb_float_precision, in->maxTempError);
//    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
//    pos = buf + len;
//    len += snprintf(pos, buf_size - len, ";%.*f", mb_float_precision, in->vccVoltageError);
//    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
//    pos = buf + len;
//    len += snprintf(pos, buf_size - len, ";%.*f", mb_float_precision, in->powerTempError);
//    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
//    pos = buf + len;
//    len += snprintf(pos, buf_size - len, ";%s", in->powerVccErrorEnabled ? "T" : "F");
//    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
//    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s", in->sysErrorEnabled ? "T" : "F");
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d",
        in->temp2Offset < 0 ? "-" : "",
        abs((int)in->temp2Offset),
        mb_float_precision,
        (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%s%d.%0*d",
        in->temp2Offset < 0 ? "-" : "",
        abs((int)in->temp2Offset),
        mb_float_precision,
        (int)((fabsf(in->temp2Offset) - abs((int)in->temp2Offset)) * powf(10, mb_float_precision) + 0.5f));
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    len += snprintf(pos, buf_size - len, ";%d", in->coolingDelay);
    if (len >= buf_size) return MB_ERR_BUFFER_TOO_SMALL;
    pos = buf + len;
    return MB_OK;
}


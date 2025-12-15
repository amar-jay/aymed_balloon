# Aymed Balloon Machine

This repository contains the firmware, schematics and application software during my internship at Aymed Medikal specifically working on the  Catheter Balloon Machine. The primrary objective of this device is to weld two catheter together through a well-defined sequential process. This is a redesign of the current implementation which is on arduino nano. 

#### Firmware

The MCU used in the system is the STM32F407VGTx and it is programmed with STM32 HAL (via the CubeIDE). This includes managing the reading temperature sensors via ADS1115(i2c to adc converter) or internal ADCs, Top Heater, Bottom Heater, and Power Supply tempretures, UART-based console interface for writing commands and reading logs as well as persistent config storage on flash. 

#### Application

The desktop application built with Electron/React/TS, provides a dashboard interface to monitor every state of the machine as well as record welds (weld recording - not fully tested). The application also has a console interface to set configs by writing to flash, write commands for specific controls or read logs from device. It also has USB device scanning of devices, as well as compatibility with USB.
(Currently, the application is tried and tested on Ubuntu, but not shipped to Windows yet!-but may be used in dev server)*, 

Additional note, firmware update is implemented on the application side currently but not on the firmware side.

#### Communication Protocol

The firmware and application communicate over UART using [**MiniBuf**](https://github.com/amar-jay/minibuf), a lightweight serialization format. The shared message definitions are located in the `types/` directory. I built this because of the unusual length of logs along the Serial connection, so this has a fixed max of 256-byte, making it suitable for most scenarios keeping consistency, short payload and homogeneity across C and TS languages. The implementation isn't perfect, but it works!

These definitions ensure consistency in data exchange between the C-based firmware and the TypeScript-based application.

```
minibuf ./types/data.mb ./types/config.mb -o ./firmware/Core/Types/ -c
minibuf ./types/data.mb ./types/config.mb -o ./app/src/lib/types/ --ts
```

# Supervisor
- [Ahmed W. Harb](https://github.com/AhmedHarb96/)

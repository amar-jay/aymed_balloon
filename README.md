# Aymed Balloon Machine

This repository contains the firmware and control software for the Aymed Balloon Machine. The system consists of an embedded controller (STM32) for hardware management and a desktop application (Electron) for the user interface.


#### Firmware

The firmware is designed for the **STM32F407VGTx** microcontroller and handles low-level hardware control. This includes managing PID control loops for the Top Heater, Bottom Heater, and Power Supply, reading temperature sensors via the ADS1115 ADC, and monitoring system state and safety conditions.

#### Application

The desktop application provides a user-friendly interface to monitor and control the machine built with Electron and React compiled with Vite.

#### Communication Protocol

The firmware and application communicate over UART using **MiniBuf**, a lightweight serialization format. The shared message definitions are located in the `types/` directory.

These definitions ensure consistency in data exchange between the C-based firmware and the TypeScript-based application.

```
minibuf ./types/data.mb ./types/config.mb -o ./firmware/Core/Types/ -c
minibuf ./types/data.mb ./types/config.mb -o ./app/src/lib/types/ --ts
```

### TODO

- [x] Manual Controls / Reading for Cooling and Pressure
- [x] Config Setting to use internal/external ADC for Temperature readings
- [-] Persistent Settings Storage in Application (Flash for Firmware)
- [x] Reading and writing version info between app and firmware
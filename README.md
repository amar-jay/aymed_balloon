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
- [x] Persistent Settings Storage in Application (Flash for Firmware)
- [x] Reading and writing version info between app and firmware
- [x] Complete firmware bug fixes and implementation
  - [x] Fix mutex/semaphore API confusion
  - [x] Fix syntax errors in manual control commands
  - [x] Add missing structure fields
  - [x] Enable heater control task
  - [x] Remove duplicate code
  - [x] Add version constants

### Firmware Implementation Status

The firmware is now fully functional with all critical systems implemented:

#### ✅ Core Features
- **Flash Storage**: EEPROM emulation for persistent configuration
- **UART Communication**: Command processing with MiniBuf serialization
- **Sensor Monitoring**: 3x NTC temperature sensors, voltage, proximity, pedal
- **Heater Control**: Automatic and manual control for top/bottom heaters (dual pin)
- **Safety Features**: Error detection, over-temperature protection, voltage monitoring
- **RTOS Tasks**: Log, sensor, and heater tasks running concurrently

#### 🔧 Manual Control Commands via UART
- Pedal and proximity override
- Pressure valve control
- Cooling fan control  
- Top/Bottom heater manual control
- Configuration updates (temperatures, timings, thresholds)
- System reset

For detailed firmware documentation, see implementation notes in firmware source files.
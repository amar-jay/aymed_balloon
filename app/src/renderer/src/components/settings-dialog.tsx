import * as React from 'react'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { Separator } from '@renderer/components/ui/separator'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@renderer/components/ui/field'
import { Slider } from '@renderer/components/ui/slider'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Settings, Thermometer, Clock, Zap } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useAtom } from 'jotai/react'
import { defaultConfig, settingsAtom } from '@renderer/lib/jotai'
import type { SystemConfig } from 'src/preload/typings'

export function SettingsDialog({
  open,
  onOpenChange
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}): React.JSX.Element {
  const [selectedSection, setSelectedSection] = React.useState<'temperature' | 'time' | 'voltage'>(
    'temperature'
  )
  const [systemConfig, setSystemConfig] = useAtom(settingsAtom)
  const [config, setConfig] = React.useState<SystemConfig>(systemConfig)

  // Sync local state when dialog opens or systemConfig changes
  React.useEffect(() => {
    setConfig(systemConfig)
  }, [systemConfig, open])

  const handleSave = () => {
    // Save local config to atom (which persists to localStorage)
    setSystemConfig(config)
    //console.log('Config saved to localStorage:', config)
    if (onOpenChange) {
      onOpenChange(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!open && !onOpenChange && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
            <span className="text-sm ml-3">Settings</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex sm:max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="absolute top-4 left-4 text-lg font-semibold inline-flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="pt-10 w-full">
          <div className="flex w-full h-[60vh]">
            {/* Left Sidebar */}
            <div className="border-r pr-4">
              <div className="w-[150px] space-y-2">
                <Button
                  variant={selectedSection === 'temperature' ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    selectedSection === 'temperature' && 'bg-secondary'
                  )}
                  onClick={() => setSelectedSection('temperature')}
                >
                  <Thermometer className="h-4 w-4 mr-2" />
                  Temperature
                </Button>
                <Button
                  onClick={() => setSelectedSection('time')}
                  variant={selectedSection === 'time' ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    selectedSection === 'time' && 'bg-secondary'
                  )}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Time
                </Button>
                <Button
                  variant={selectedSection === 'voltage' ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    selectedSection === 'voltage' && 'bg-secondary'
                  )}
                  onClick={() => setSelectedSection('voltage')}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Voltage & Error
                </Button>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 pl-6 overflow-y-auto">
              {selectedSection === 'temperature' && (
                <FieldSet>
                  <FieldLegend>Temperature Settings</FieldLegend>
                  <FieldDescription>
                    Configure temperature thresholds and offsets for the welding process.
                  </FieldDescription>
                  <FieldGroup className="grid grid-cols-1 gap-6 mt-4">
                    <Field>
                      <FieldLabel>Top Temp Threshold: {config.topTempThreshold}°C</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={50}
                          max={250}
                          step={1}
                          value={[config.topTempThreshold]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, topTempThreshold: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>Bottom Temp Threshold: {config.bottomTempThreshold}°C</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={50}
                          max={250}
                          step={1}
                          value={[config.bottomTempThreshold]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, bottomTempThreshold: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>
                        Top Temp Offset:{' '}
                        {config.topTempOffset > 127 ? config.topTempOffset - 256 : config.topTempOffset}
                        °C
                      </FieldLabel>
                      <FieldContent>
                        <Slider
                          min={0}
                          max={255}
                          step={1}
                          value={[config.topTempOffset]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, topTempOffset: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>
                        Bottom Temp Offset:{' '}
                        {config.bottomTempOffset > 127 ? config.bottomTempOffset - 256 : config.bottomTempOffset}
                        °C
                      </FieldLabel>
                      <FieldContent>
                        <Slider
                          min={0}
                          max={255}
                          step={1}
                          value={[config.bottomTempOffset]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, bottomTempOffset: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>Max Temp Error: {config.maxTempError}°C</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={0}
                          max={50}
                          step={1}
                          value={[config.maxTempError]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, maxTempError: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>Power Temp Error: {config.powerTempError}°C</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={0}
                          max={50}
                          step={1}
                          value={[config.powerTempError]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, powerTempError: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </FieldSet>
              )}

              {selectedSection === 'time' && (
                <FieldSet>
                  <FieldLegend>Time Settings</FieldLegend>
                  <FieldDescription>
                    Configure timing parameters for operation and cooling cycles.
                  </FieldDescription>
                  <FieldGroup className="grid grid-cols-1 gap-6 mt-4">
                    <Field>
                      <FieldLabel>Operation Time: {config.opTime}s</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={1}
                          max={60}
                          step={1}
                          value={[config.opTime]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, opTime: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>Cooling Time: {config.coTime}s</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={1}
                          max={60}
                          step={1}
                          value={[config.coTime]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, coTime: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>Menu Reset Delay: {config.menuResetDelay}s</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={1}
                          max={255}
                          step={1}
                          value={[config.menuResetDelay]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, menuResetDelay: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>Time Calibration: {config.timeCalibration}ms</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={0}
                          max={255}
                          step={10}
                          value={[config.timeCalibration]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, timeCalibration: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>Cooling Delay: {config.coolingDelay}s</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={0}
                          max={30}
                          step={1}
                          value={[config.coolingDelay]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, coolingDelay: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </FieldSet>
              )}

              {selectedSection === 'voltage' && (
                <FieldSet>
                  <FieldLegend>Voltage & Error Settings</FieldLegend>
                  <FieldDescription>
                    Configure voltage monitoring and error handling parameters.
                  </FieldDescription>
                  <FieldGroup className="grid grid-cols-1 gap-6 mt-4">
                    <Field>
                      <FieldLabel>VCC Voltage Error: {config.vccVoltageError}V</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={0}
                          max={10}
                          step={0.1}
                          value={[config.vccVoltageError]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, vccVoltageError: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel>
                        Heater Differential Error Threshold: +-{config.heaterErrorEnable}deg C
                      </FieldLabel>
                      <FieldContent>
                        <Slider
                          min={5}
                          max={50}
                          step={1}
                          value={[config.heaterErrorEnable]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, heaterErrorEnable: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel>Voltage Calibration: {config.voltageCalibration}mV</FieldLabel>
                      <FieldContent>
                        <Slider
                          min={0}
                          max={255}
                          step={10}
                          value={[config.voltageCalibration]}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, voltageCalibration: value[0] }))
                          }
                          className="w-full"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="powerVccErrorEnabled"
                          checked={config.powerVccErrorEnabled}
                          onCheckedChange={(checked) =>
                            setConfig((prev) => ({ ...prev, powerVccErrorEnabled: !!checked }))
                          }
                        />
                        <FieldLabel htmlFor="powerVccErrorEnabled">
                          Enable Power Voltage Error
                        </FieldLabel>
                      </div>
                    </Field>
                    <Field>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="sysErrorEnabled"
                          checked={config.sysErrorEnabled}
                          onCheckedChange={(checked) =>
                            setConfig((prev) => ({ ...prev, sysErrorEnabled: !!checked }))
                          }
                        />
                        <FieldLabel htmlFor="sysErrorEnabled">Enable System Error</FieldLabel>
                      </div>
                    </Field>
                  </FieldGroup>
                </FieldSet>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => {
                setConfig({ ...defaultConfig })
              }}
            >
              Reset to Defaults
            </Button>
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

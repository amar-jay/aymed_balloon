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
import {
  ArrowUpRightIcon,
  X,
  Settings,
  Thermometer,
  Clock,
  Zap,
  Settings2Icon,
  Upload,
  Loader2
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useAtom } from 'jotai/react'
import { defaultConfig, settingsAtom, updateAvailableAtom } from '@renderer/lib/jotai'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@renderer/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from './ui/select'
import { toast } from 'sonner'
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger
} from '@renderer/components/ui/file-upload'
import { useMCUUpdate } from '@renderer/hooks/use-mcu-update'

const FIRMWARE_EXTS = ['.bin', '.hex']

function FileUploadComponent({
  file,
  setFile
}: {
  file: File | null
  setFile: (file: File | null) => void
}) {
  const onFileReject = React.useCallback((file: File, message: string) => {
    toast(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`
    })
  }, [])

  return (
    <FileUpload
      maxFiles={1}
      maxSize={10 * 1024 * 1024}
      className="w-full max-w-md"
      value={file ? [file] : []}
      onValueChange={(f) => (f.length > 0 ? setFile(f[0]) : null)}
      onFileReject={onFileReject}
      accept={FIRMWARE_EXTS.join(',')}
      // multiple
    >
      <FileUploadDropzone>
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center justify-center rounded-full border p-2.5">
            <Upload className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">Drag & drop firmware here</p>
          <p className="text-muted-foreground text-xs">
            Or click to browse for BIN file <br />
            (max 1 file, up to 10MB each)
          </p>
        </div>
        <FileUploadTrigger asChild>
          <Button variant="outline" size="sm" className="mt-2 w-fit">
            Browse files
          </Button>
        </FileUploadTrigger>
      </FileUploadDropzone>
      <FileUploadList>
        {file && (
          <FileUploadItem value={file}>
            <FileUploadItemPreview />
            <FileUploadItemMetadata />
            <FileUploadItemDelete asChild onClick={() => setFile(null)}>
              <Button variant="ghost" size="icon" className="size-7">
                <X />
              </Button>
            </FileUploadItemDelete>
          </FileUploadItem>
        )}
      </FileUploadList>
    </FileUpload>
  )
}

export function EmptySettings({ message }: { message?: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Settings2Icon />
        </EmptyMedia>
        <EmptyTitle>No Settings Yet</EmptyTitle>
        <EmptyDescription>
          <p className="pb-1">
            {message ||
              'To view or modify settings, please ensure the device is properly connected.'}
          </p>
          <p className="pt-1">
            If the device is connected, try disconnecting and then reconnecting it to refresh the
            connection status.
          </p>
        </EmptyDescription>
      </EmptyHeader>
      <Button variant="link" asChild className="text-muted-foreground" size="sm">
        <a
          href="https://aymed.amar-jay.com/docs/getting-started/configuration"
          target="_blank"
          rel="noreferrer"
        >
          Read our docs <ArrowUpRightIcon />
        </a>
      </Button>
    </Empty>
  )
}

export function SettingsDialog({
  connectionId,
  open,
  onOpenChange
}: {
  connectionId?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}): React.JSX.Element {
  const [selectedSection, setSelectedSection] = React.useState<
    'temperature' | 'time' | 'voltage' | 'upgrade'
  >('temperature')
  const [systemConfig, setSystemConfig] = useAtom(settingsAtom)
  const [config, setConfig] = React.useState<NonNullable<typeof systemConfig>>(systemConfig!)
  const [isResetting, setIsResetting] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [selectedVersion, setSelectedVersion] = React.useState('')
  const { uploadFirmware, isDownloading, downloadVersion, versions } = useMCUUpdate(connectionId)
  const [updateAvailable, setUpdateAvailable] = useAtom(updateAvailableAtom)

  React.useEffect(() => {
    if (updateAvailable) {
      onOpenChange?.(true)
      setSelectedSection('upgrade')
      setUpdateAvailable(false)
    }
  }, [updateAvailable, setUpdateAvailable, onOpenChange])

  React.useEffect(() => {
    if (!config) {
      setSystemConfig(defaultConfig)
      setConfig(defaultConfig)
    }
  }, [config, setSystemConfig])

  const handleSave = async () => {
    if (!connectionId) {
      toast.info('No active connection', { description: 'Please connect to a device first.' })
      return
    }

    // Save local config to atom (which persists to localStorage)
    setSystemConfig(config)
    //console.log('Config saved to localStorage:', config)
    if (connectionId) {
      window.api.SerialsetSystemConfig(connectionId, config)
    }
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  const handleReset = async () => {
    if (!connectionId) {
      toast.info('No active connection', { description: 'Please connect to a device first.' })
      return
    }
    setIsResetting(true)
    setSystemConfig(null)
    await window.api.SerialresetSystemConfig(connectionId)
    let resetConfig
    do {
      resetConfig = await window.api.SerialgetSystemConfig(connectionId)
      if (!resetConfig) {
        await new Promise((res) => setTimeout(res, 500))
      }
    } while (!resetConfig)
    setSystemConfig(resetConfig)
    setConfig(resetConfig)
    setIsResetting(false)
  }

  const handleUploadFirmware = async (firmware?: string | File | null) => {
    if (!connectionId) {
      toast.error('No active connection', { description: 'Please connect to a device first.' })
      return
    }
    if (!firmware) {
      toast.error('No firmware file provided', { description: 'Please select a firmware file.' })
      return
    }
    // has to be only two types: string (version) or File
    if (typeof firmware !== 'string' && !(firmware instanceof File)) {
      toast.error('Invalid firmware type', {
        description: 'Firmware must be a version string or File.'
      })
      return
    }
    // if its a string or file name should end with .bin or .hex
    if (typeof firmware === 'string') {
      if (!FIRMWARE_EXTS.some((ext) => firmware.endsWith(ext))) {
        toast.error('Invalid firmware file', { description: 'Firmware file must be .bin or .hex.' })
        return
      }
    } else if (firmware instanceof File) {
      if (!FIRMWARE_EXTS.some((ext) => firmware.name.endsWith(ext))) {
        toast.error('Invalid firmware file', { description: 'Firmware file must be .bin or .hex.' })
        return
      }
    }
    // setIsDownloading(true)
    // try {
    await uploadFirmware(firmware)
    // toast.success('Firmware upgraded successfully')
    // } catch (error) {
    //   toast.error('Firmware upgrade failed', {
    //     description: `Error: ${(error as Error).message}`
    //   })
    // } finally {
    // setIsDownloading(false)
    // }
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
      <DialogContent
        aria-describedby="Settings Dialog"
        className={cn(
          'flex  max-h-[80vh] overflow-hidden',
          systemConfig === null || config === null ? 'max-w-xl' : 'sm:max-w-4xl'
        )}
      >
        <DialogHeader>
          <DialogTitle className="absolute top-4 left-4 text-lg font-semibold inline-flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DialogTitle>
        </DialogHeader>
        {systemConfig === null || config === null ? (
          <EmptySettings message={isResetting ? 'Resetting configuration...' : undefined} />
        ) : (
          <>
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
                    <Button
                      variant={selectedSection === 'upgrade' ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start',
                        selectedSection === 'upgrade' && 'bg-secondary'
                      )}
                      onClick={() => setSelectedSection('upgrade')}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upgrade
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
                          <FieldLabel>
                            Bottom Temp Threshold: {config.bottomTempThreshold}°C
                          </FieldLabel>
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
                            {config.topTempOffset > 127
                              ? config.topTempOffset - 256
                              : config.topTempOffset}
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
                            {config.bottomTempOffset > 127
                              ? config.bottomTempOffset - 256
                              : config.bottomTempOffset}
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
                          <FieldLabel>
                            Voltage Calibration: {config.voltageCalibration}mV
                          </FieldLabel>
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

                  {selectedSection === 'upgrade' && (
                    <FieldSet>
                      <FieldLegend>Firmware Upgrade</FieldLegend>
                      <FieldDescription>
                        Upgrade firmware to the latest version or upload a specific version.
                      </FieldDescription>
                      <FieldGroup className="grid grid-cols-1 gap-6 mt-4">
                        <Field>
                          <FieldContent>
                            <div className="space-x-2 grid grid-cols-2 grid-rows-2 gap-2 pl-2 pr-24">
                              <Select
                                value={selectedVersion}
                                onValueChange={(e) => setSelectedVersion(e)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder="Select a version"
                                    defaultValue={selectedVersion}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel>versions (tags)</SelectLabel>
                                    {versions.map((version) => (
                                      <SelectItem key={version.tag} value={version.tag}>
                                        {version.version}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                              <div />
                              <Button
                                className="max-w-xs"
                                onClick={() => uploadFirmware(selectedVersion)}
                                variant="outline"
                                disabled={!selectedVersion || isDownloading}
                              >
                                {isDownloading ? (
                                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                ) : null}
                                Upload specific version
                              </Button>
                              <Button
                                className="max-w-xs"
                                onClick={() => uploadFirmware()}
                                disabled={isDownloading}
                              >
                                {isDownloading ? (
                                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                ) : null}
                                Upgrade to Latest
                              </Button>
                            </div>
                          </FieldContent>
                          <FieldDescription>
                            Download the device to its latest version
                          </FieldDescription>
                        </Field>
                        <Field>
                          <FieldLabel>Upload Specific Version</FieldLabel>
                          <FieldContent className="flex gap-2 ">
                            <div className="w-full flex flex-col items-center gap-2">
                              <FileUploadComponent file={selectedFile} setFile={setSelectedFile} />
                              <Button
                                onClick={() => {
                                  if (!selectedFile) return
                                  handleUploadFirmware(selectedFile)
                                }}
                                disabled={!selectedFile}
                                size={'sm'}
                                className="w-md mx-auto"
                              >
                                Upload Firmware
                              </Button>
                            </div>
                            <FieldDescription>
                              Upload firmware file to be loaded to the device
                            </FieldDescription>
                          </FieldContent>
                        </Field>
                      </FieldGroup>
                    </FieldSet>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" onClick={handleReset} disabled={isResetting}>
                  Reset to Defaults
                </Button>
                <Button onClick={handleSave} disabled={isResetting}>
                  Save Settings
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

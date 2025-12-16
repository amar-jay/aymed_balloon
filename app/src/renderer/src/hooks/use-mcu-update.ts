import React from 'react'
import { toast } from 'sonner'
import { VersionInfo } from 'src/lib/update'

export const useMCUUpdate = (connectionId?: string | null) => {
  // fetch tags from https://github.com/amar-jay/aymed_balloon and return versions
  const [versions, setVersions] = React.useState<VersionInfo[]>([])
  const [isDownloading, setIsDownloading] = React.useState(false)
  React.useEffect(() => {
    window.api.UpdategetOnlineVersions().then(setVersions).catch(console.error)
  }, [])

  // upload to MCU: first wait until its implemented on firmware first
  // for now use sendCommand to send packets
  const uploadFirmware = React.useCallback(
    async (file?: string | File) => {
      if (!connectionId) {
        toast.info('No active connection')
        return
      }

      setIsDownloading(true)

      try {
        let firmwarePath: string

        // 1. Resolve firmware source
        if (file instanceof File) {
          // Handle local file upload
          toast.info(`Preparing local firmware file: ${file.name}...`)
          
          // Read the file as ArrayBuffer
          const fileBuffer = await file.arrayBuffer()
          
          // Save to temporary location via IPC
          firmwarePath = await window.api.UpdatesaveLocalFirmware(fileBuffer, file.name)
          
          toast.info('Local firmware file prepared successfully')
        } else if (typeof file === 'string') {
          const version = versions.find((v) => v.version === file || v.tag === file)

          if (!version) {
            throw new Error(`Firmware version "${file}" not found`)
          }

          toast.info(`Downloading firmware ${version.tag}...`)
          await window.api.UpdatedownloadVersion(version.tag)

          const data = await window.api.UpdategetVersion(version.tag)
          firmwarePath = data.filePath
        } else {
          const version = await window.api.UpdategetLatestVersion()

          if (!version) {
            throw new Error('No latest firmware version found')
          }

          toast.info(`Downloading latest firmware (${version.tag})...`)
          await window.api.UpdatedownloadVersion(version.tag)

          const data = await window.api.UpdategetVersion(version.tag)
          firmwarePath = data.filePath
        }

        // 2. Upload to MCU
        if (!connectionId) {
          throw new Error('No active connection. Please connect to device first.')
        }

        toast.info('Uploading firmware to MCU. Do not disconnect.', {
          duration: 10000
        })

        await window.api.SerialuploadFirmware(connectionId, firmwarePath)

        toast.success('Firmware uploaded successfully')
      } catch (error) {
        console.error('[Firmware Update]', error)
        toast.error((error as Error).message)
      } finally {
        setIsDownloading(false)
      }
    },
    [connectionId, versions]
  )

  return {
    versions,
    isDownloading,
    uploadFirmware
  }
}

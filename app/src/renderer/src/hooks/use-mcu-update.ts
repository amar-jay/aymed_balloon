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

  // download selected version
  const downloadVersion = async (version: string) => {}

  // upload to MCU: first wait until its implemented on firmware first
  // for now use sendCommand to send packets
  const uploadFirmware = React.useCallback(
    async (file?: string | File) => {
      // if (!connectionId) {
      //   toast.info('No active connection')
      //   return
      // }
      setIsDownloading(true)
      try {
        // if it is a file, then...
        if (file instanceof File) {
          console.log('Uploading firmware file to MCU...', file)
        } else if (typeof file === 'string') {
          const version = versions.find((v) => v.version === file || v.tag === file)
          try {
            if (!version) return
            await window.api.UpdatedownloadVersion(version?.tag || file)
            toast.success('Firmware downloaded successfully')
            const versionFile = await window.api.UpdategetVersionFile(version)
            console.log('Fetched firmware to MCU...', versionFile)
          } catch (error) {
            console.error('Error uploading firmware:', error)
            toast.error(`Error uploading firmware: ${(error as Error).message}`)
          }
        } else {
          try {
            const version = await window.api.UpdategetLatestVersion()
            // convert buffer to file object
            // const firmwareFile = new File([file], 'firmware.hex', {
            //   type: 'application/octet-stream'
            // })
            if (version) {
              await window.api.UpdatedownloadVersion(version.tag)
              toast.success('Latest firmware downloaded successfully')
            }
            const versionFile = await window.api.UpdategetVersionFile(version!)
            console.log('Uploading latest firmware to MCU...', versionFile)
          } catch (error) {
            console.error('Error downloading latest firmware:', error)
            toast.error(`Error downloading latest firmware: ${(error as Error).message}`)
          }
        }
      } catch (error) {
        console.error('Error uploading firmware:', error)
      }
      setIsDownloading(false)
    },
    [versions, connectionId]
  )

  return {
    versions,
    isDownloading,
    downloadVersion,
    uploadFirmware
  }
}

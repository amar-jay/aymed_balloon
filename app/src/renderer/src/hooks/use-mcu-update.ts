import React from 'react'
import { VersionInfo } from 'src/lib/update'

export const useMCUUpdate = (connectionId?: string | null) => {
  // fetch tags from https://github.com/amar-jay/aymed_balloon and return versions
  const [versions, setVersions] = React.useState<VersionInfo[]>([])

  React.useEffect(() => {
    window.api.UpdategetOnlineVersions().then(setVersions).catch(console.error)
  }, [])

  // download selected version
  const downloadVersion = async (version: string) => {}

  // upload to MCU: first wait until its implemented on firmware first
  // for now use sendCommand to send packets
  const uploadFirmware = React.useCallback(
    async (file?: string | File) => {
      if (!connectionId) {
        throw new Error('No active connection')
      }
      if (!file) {
        throw new Error('No firmware file provided')
      }

      // if it is a file, then...
      if (file instanceof File) {
        console.log('Uploading firmware file to MCU...', file)
      } else if (typeof file === 'string') {
        console.log('Uploading firmware from path to MCU...', file)
      }
    },
    [connectionId]
  )

  return {
    versions,
    downloadVersion,
    uploadFirmware
  }
}

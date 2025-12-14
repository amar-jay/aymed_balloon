import { app } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import yaml from 'js-yaml'

const updatesDir = join(app.getPath('userData'), 'updates')
const updateInfosPath = join(app.getPath('userData'), 'aymed-updates.yaml')

// GitHub repository for releases
const GITHUB_REPO = 'amar-jay/aymed_balloon' // Update this to the actual repo

export interface VersionInfo {
  version: string
  tag: string
  url: string
  size: number
  publishedAt: string
}

export interface DownloadedVersion {
  /** tag name from GitHub (unique identifier) */
  tag: string
  // : string
  /** version (vx.x.x) */
  version?: string
  /** ISO date string when downloaded */
  downloadedAt: string
  /** Local file path of the downloaded firmware */
  filePath: string
}

interface GitHubRelease {
  tag_name: string
  assets: {
    browser_download_url: string
    size: number
  }[]
  published_at: string
}

/**
 * Fetch available firmware versions from GitHub releases
 * @returns list of versions with download URLs
 */
export async function getOnlineVersions(): Promise<VersionInfo[]> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
      headers: {
        Authorization: `Bearer ${import.meta.env.MAIN_VITE_GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    })

    if (!response.ok) throw new Error('Failed to fetch releases, error: ' + response.statusText)
    const releases: GitHubRelease[] = await response.json()
    const validReleases: VersionInfo[] = []
    const urlRegex = /\.hex$/i
    // temporary disable url check to allow testing with other file types
    // const urlRegex = /.*/i
    for (const release of releases) {
      if (release.assets.length === 0) continue // Skip releases without assets
      const validAssetIdx = release.assets.findIndex(
        (asset) => urlRegex.test(asset.browser_download_url) && asset.size > 0
      )
      if (validAssetIdx === -1) continue // Skip if no valid firmware asset
      validReleases.push({
        version: release.tag_name,
        tag: release.tag_name,
        url: release.assets[validAssetIdx].browser_download_url,
        size: release.assets[validAssetIdx].size,
        publishedAt: release.published_at
      })
    }
    return validReleases
  } catch (error) {
    throw new Error(`Error fetching available versions: ${(error as Error).message}`)
  }
}

/**
 * Get the list of downloaded firmware versions from YAML info file
 * @returns list of downloaded versions
 */
export async function getDownloadedVersions(): Promise<DownloadedVersion[]> {
  try {
    if (!(await fileExists(updateInfosPath))) {
      await fs.writeFile(updateInfosPath, yaml.dump({}))
      return []
    }

    const data =
      (yaml.load(await fs.readFile(updateInfosPath, 'utf8')) as Record<
        string,
        DownloadedVersion
      >) || {}
    return Object.entries(data).map(([tag, info]: [string, DownloadedVersion]) => ({
      tag,
      version: info.version || '',
      downloadedAt: info.downloadedAt || '',
      filePath: info.filePath || ''
    }))
  } catch (error) {
    console.error('Error getting downloaded versions:', error)
    return []
  }
}

/**
 * Download a specific firmware version from GitHub releases, save it locally, and update the Info file.
 * An optional force parameter can be set to true to re-download even if already present.
 * @param version version (vx.x.x), tag is a must-have for identification
 * @param force whether to force re-download if already present
 */
export async function downloadVersion(versionTag: string, force = false): Promise<void> {
  try {
    // check if already downloaded
    const downloaded = await getDownloadedVersions()
    if (downloaded.find((v) => v.tag === versionTag) && !force) {
      return
    }

    // fetch the download URL from version tag online
    const versions = await getOnlineVersions()
    const versionInfo = versions.find((v) => v.tag === versionTag)
    if (!versionInfo || !versionInfo.url) {
      throw new Error(`Version ${versionTag} not found or no download URL available`)
    }

    const response = await fetch(versionInfo.url)
    if (!response.ok) throw new Error('Failed to download firmware')

    const buffer = await response.arrayBuffer()

    // Ensure updates directory exists
    await fs.mkdir(updatesDir, { recursive: true })

    const filePath = join(updatesDir, `${versionTag}.hex`)
    await fs.writeFile(filePath, Buffer.from(buffer))

    // Update the YAML file with download info
    await updateDownloadedVersions(versionInfo, filePath)
  } catch (error) {
    console.error(`Error downloading version ${versionTag}:`, error)
    throw new Error(`Error downloading version ${versionTag}: ${(error as Error).message}`)
  }
}

/**
 * Get the file buffer for a downloaded version
 */
export async function getVersion(versionTag: string): Promise<DownloadedVersion> {
  try {
    const downloaded = await getDownloadedVersions()
    const versionData = downloaded.find((v) => v.tag === versionTag)
    if (!versionData) {
      throw new Error(`Version ${versionTag} not downloaded. Try again after download.`)
    }
    return versionData
  } catch (error) {
    console.error(`Error getting version ${versionTag}:`, error)
    throw new Error(`Error getting version ${versionTag}: ${(error as Error).message}`)
  }
}

/**
 * Delete a downloaded version and update the Info file
 * @param version version (vx.x.x)
 */
export async function deleteVersion(versionTag: string) {
  try {
    const downloaded = await getDownloadedVersions()
    const versionData = downloaded.find((v) => v.tag === versionTag)
    if (!versionData) return

    // Remove file
    if (await fileExists(versionData.filePath)) {
      await fs.unlink(versionData.filePath)
    }

    // Update YAML
    const data =
      (yaml.load(await fs.readFile(updateInfosPath, 'utf8')) as Record<
        string,
        DownloadedVersion
      >) || {}
    delete data[versionTag]
    await fs.writeFile(updateInfosPath, yaml.dump(data))
  } catch (error) {
    console.error(`Error deleting version ${versionTag}:`, error)
    throw new Error(`Error deleting version ${versionTag}: ${(error as Error).message}`)
  }
}

// Check if a version is downloaded
export async function isVersionDownloaded(version: string): Promise<boolean> {
  const downloaded = await getDownloadedVersions()
  return downloaded.some((v) => v.version === version)
}

/**
 * Get the latest available version, or null if none
 * The latest version is determined by the most recent published date.
 * @returns VersionInfo or null
 * */
export async function getLatestVersion(): Promise<VersionInfo | null> {
  const versions = await getOnlineVersions()
  // Sort versions by published date descending
  const sorted = versions.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  return sorted.length > 0 ? sorted[0] : null
}

// Helper function to update the YAML file
async function updateDownloadedVersions(version: VersionInfo, filePath: string): Promise<void> {
  const data = (await fileExists(updateInfosPath))
    ? (yaml.load(await fs.readFile(updateInfosPath, 'utf8')) as Record<
        string,
        DownloadedVersion
      >) || {}
    : {}

  data[version.tag] = {
    tag: version.tag,
    version: version.version,
    downloadedAt: new Date().toISOString(),
    filePath
  }

  await fs.writeFile(updateInfosPath, yaml.dump(data))
}

// Helper function to check if file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

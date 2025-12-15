# Electron Build GitHub Actions - Fixed Workflow

This document explains the fixes applied to the GitHub Actions workflow for building the Electron application for both Windows and Linux.

## Problems Fixed

### 1. **Package Manager Mismatch**
- **Problem**: Workflow used `yarn` but project uses `pnpm` (evidenced by `pnpm-lock.yaml`)
- **Solution**: Switched to `pnpm` with proper setup action

### 2. **Invalid npm Configuration**
- **Problem**: `npm config set python python3` and `npm config set msvs_version 2022` are not valid npm options
- **Solution**: Removed invalid commands and used environment variable `npm_config_python` instead

### 3. **Missing Linux Artifacts Upload**
- **Problem**: Linux build succeeded but artifacts were never uploaded
- **Solution**: Added `actions/upload-artifact@v4` for Linux AppImage and .deb files

### 4. **Broken Windows Artifacts Upload**
- **Problem**: Used custom `lucyio/upload-to-release` action with incorrect configuration
- **Solution**: Replaced with standard `actions/upload-artifact@v4` for proper artifact handling

### 5. **Outdated Actions**
- **Problem**: Used v3 versions of GitHub Actions
- **Solution**: Updated to v4 versions for better performance and features

### 6. **Unnecessary Steps**
- **Problem**: Included `electron-rebuild` which may not be needed with proper pnpm setup
- **Solution**: Removed unnecessary steps to simplify the workflow

## Updated Workflows

### 1. `build-electron.yml` - Regular Builds
This workflow runs on every push to `hal_flash` branch and can be manually triggered.

**Features:**
- Builds Windows `.exe` installer
- Builds Linux AppImage and `.deb` packages
- Uploads artifacts for download from GitHub Actions UI
- Uses pnpm for faster, more reliable dependency installation
- Includes caching for faster subsequent builds

### 2. `release-electron.yml` - Release Workflow (NEW)
This workflow creates GitHub releases with attached binaries.

**Triggers:**
- Automatically when you push a version tag (e.g., `v1.0.0`, `v2.3.1`)
- Manually via workflow_dispatch

**Features:**
- Creates a GitHub Release
- Builds both Windows and Linux versions
- Attaches binaries directly to the release
- Users can download installers from the Releases page

## How to Use

### For Regular Development Builds

1. Push code to `hal_flash` branch
2. GitHub Actions will automatically build
3. Download artifacts from the Actions tab

### For Creating a Release

#### Option 1: Using Git Tags (Recommended)
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

#### Option 2: Manual Trigger
1. Go to GitHub Actions tab
2. Select "Release Electron App" workflow
3. Click "Run workflow"
4. Enter version (e.g., `v1.0.0`)
5. Click "Run workflow" button

### Download Built Applications

#### From Development Builds:
1. Go to Actions tab
2. Click on the workflow run
3. Scroll down to "Artifacts" section
4. Download `windows-executable` or `linux-appimage`

#### From Releases:
1. Go to Releases tab
2. Click on the desired release
3. Download installers from "Assets" section

## Testing the Fix

### To test on hal_flash branch:
1. Merge this PR to `hal_flash` branch
2. The workflow will trigger automatically
3. Check the Actions tab for build status
4. If successful, you'll see artifacts uploaded

### To test manually:
```bash
# Switch to hal_flash branch
git checkout hal_flash

# Merge the fixes
git merge copilot/fix-github-action-electron-build

# Push to trigger the workflow
git push origin hal_flash
```

## Build Output Locations

The Electron Builder creates files in these locations:

- **Windows**: `app/dist/*.exe` (NSIS installer)
- **Linux**:
  - AppImage: `app/dist/*.AppImage`
  - Debian package: `app/dist/*.deb`

## Configuration Files

- **`app/electron-builder.yml`**: Electron Builder configuration
- **`app/package.json`**: Build scripts and dependencies
- **`.github/workflows/build-electron.yml`**: Regular build workflow
- **`.github/workflows/release-electron.yml`**: Release workflow

## Troubleshooting

### If Windows build fails with native module errors:
- Ensure `better-sqlite3` and `serialport` are properly configured in package.json
- The environment variable `npm_config_python` should handle Python requirements
- Windows runners come with Python 3.x pre-installed

### If Linux build fails:
- Check that all required dependencies are available on Ubuntu 22.04
- LibUSB and other system libraries should be available by default

### If pnpm install fails:
- Verify `pnpm-lock.yaml` is committed and up-to-date
- Use `pnpm install --frozen-lockfile` to ensure exact versions

## Next Steps

1. **Test the workflow**: Merge to `hal_flash` and verify builds succeed
2. **Create first release**: Tag version `v1.0.0` to test release workflow
3. **Update version**: Bump version in `app/package.json` before each release
4. **Add signing**: Consider code signing for production releases (Windows and macOS)

## Security Notes

- The workflows use `GITHUB_TOKEN` which is automatically provided
- No additional secrets are required for basic functionality
- For code signing, you would need to add signing certificates as secrets

## Additional Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm Documentation](https://pnpm.io/)

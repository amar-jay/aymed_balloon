# Drag & Drop Firmware Upload Feature

## Overview

The drag & drop firmware upload feature allows users to upload local .hex or .bin firmware files directly to the STM32 MCU without needing to download from GitHub releases first.

## Feature Summary

### What It Does
- Accepts .hex and .bin files via drag & drop or file browser
- Validates file type and size (max 10MB)
- Saves file to temporary location
- Uploads to MCU using existing serial protocol
- Shows progress notifications

### User Experience

```
┌─────────────────────────────────────┐
│   Firmware Upgrade Section          │
├─────────────────────────────────────┤
│                                     │
│  📁 Drag & Drop Zone                │
│  ┌───────────────────────────┐     │
│  │  📤 Drag & drop here      │     │
│  │     or click to browse    │     │
│  │                            │     │
│  │  .hex or .bin (max 10MB)  │     │
│  └───────────────────────────┘     │
│                                     │
│  Selected: firmware_v1.2.3.hex     │
│  Size: 486 KB                       │
│                                     │
│  [Upload Firmware]                  │
│                                     │
└─────────────────────────────────────┘
```

### Upload Options

Users now have **three ways** to upload firmware:

1. **Upload Latest** - Download and upload latest GitHub release
2. **Select Version** - Choose specific version from dropdown
3. **Drag & Drop Local File** 🆕 - Upload .hex/.bin from computer

## Implementation Details

### Architecture

```
User Interface (Renderer)
    │
    ├─ FileUploadComponent (already existed)
    │   └─ Validates: .hex, .bin, max 10MB
    │
    ├─ useMCUUpdate Hook (modified)
    │   ├─ Detects File object
    │   ├─ Reads as ArrayBuffer
    │   └─ Calls UpdatesaveLocalFirmware()
    │
    ▼
IPC Layer (Electron)
    │
    ├─ Preload API (new)
    │   └─ UpdatesaveLocalFirmware(buffer, filename)
    │
    ├─ Main Process Handler (new)
    │   ├─ Receives ArrayBuffer
    │   ├─ Sanitizes filename
    │   ├─ Creates temp path with timestamp
    │   └─ Returns temp file path
    │
    ▼
Serial Upload (existing)
    │
    └─ uploadFirmware(connectionId, tempPath)
        └─ Sends to MCU via UART
```

### Files Changed

1. **`app/src/main/index.ts`**
   ```typescript
   // Added IPC handler
   ipcMain.handle('update:save-local-firmware', 
     async (_, fileBuffer: ArrayBuffer, fileName: string): Promise<string> => {
       const tempDir = tmpdir()
       const timestamp = Date.now()
       const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
       const tempFilePath = join(tempDir, `firmware_${timestamp}_${sanitizedFileName}`)
       await fs.writeFile(tempFilePath, Buffer.from(fileBuffer))
       return tempFilePath
     }
   )
   ```

2. **`app/src/preload/index.ts`**
   ```typescript
   // Exposed API to renderer
   UpdatesaveLocalFirmware: (fileBuffer: ArrayBuffer, fileName: string): Promise<string> =>
     ipcRenderer.invoke('update:save-local-firmware', fileBuffer, fileName)
   ```

3. **`app/src/preload/index.d.ts`**
   ```typescript
   // TypeScript definition
   UpdatesaveLocalFirmware: (fileBuffer: ArrayBuffer, fileName: string) => Promise<string>
   ```

4. **`app/src/renderer/src/hooks/use-mcu-update.ts`**
   ```typescript
   // Handle File objects
   if (file instanceof File) {
     toast.info(`Preparing local firmware file: ${file.name}...`)
     const fileBuffer = await file.arrayBuffer()
     firmwarePath = await window.api.UpdatesaveLocalFirmware(fileBuffer, file.name)
     toast.info('Local firmware file prepared successfully')
   }
   ```

### Data Flow

```
1. User drops file.hex
   └─> FileUploadComponent validates

2. User clicks "Upload Firmware"
   └─> handleUploadFirmware(selectedFile)

3. useMCUUpdate.uploadFirmware(File)
   ├─> file.arrayBuffer()
   └─> window.api.UpdatesaveLocalFirmware(buffer, 'file.hex')

4. IPC to Main Process
   ├─> Sanitize: 'file.hex' → 'file.hex'
   ├─> Create path: '/tmp/firmware_1702574400000_file.hex'
   ├─> Write buffer to file
   └─> Return path

5. Upload via Serial
   └─> window.api.SerialuploadFirmware(connectionId, tempPath)

6. Serial reads temp file
   ├─> Parse HEX format
   └─> Send to MCU line by line

7. MCU Bootloader
   ├─> Parse HEX lines
   ├─> Write to flash
   └─> System reset
```

## Security Features

### File Validation
- **Extension Check**: Only .hex and .bin files accepted
- **Size Limit**: Maximum 10MB per file
- **Filename Sanitization**: Remove special characters that could cause path issues
- **Timestamp Prefix**: Prevents filename collisions

### Sanitization
```typescript
// Original: "../../../etc/passwd.hex"
// Sanitized: "_.._.._.._etc_passwd.hex"
const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
```

### Temporary Storage
- Files saved to system temp directory (`/tmp` on Unix, `%TEMP%` on Windows)
- Unique timestamp prevents collisions
- Files are ephemeral and cleaned up by OS

## User Flow Example

### Happy Path
```
1. User: Drags "firmware_v1.2.3.hex" to upload zone
   UI: Shows file preview with name and size

2. User: Clicks "Upload Firmware" button
   Toast: "Preparing local firmware file: firmware_v1.2.3.hex..."

3. System: Saves file to /tmp/firmware_1702574400000_firmware_v1.2.3.hex
   Toast: "Local firmware file prepared successfully"

4. System: Starts serial upload
   Toast: "Uploading firmware to MCU. Do not disconnect."

5. MCU: Receives HEX lines, writes to flash
   Console: "Progress: 1 KB written" ... "Progress: 486 KB written"

6. MCU: Completes and resets
   Toast: "Firmware uploaded successfully"
   MCU: Boots new firmware
```

### Error Handling

**Invalid File Type**
```
User: Drops "document.pdf"
UI: File rejected
Toast: "Invalid firmware file. Firmware file must be .bin or .hex."
```

**File Too Large**
```
User: Drops "huge_firmware.hex" (15 MB)
UI: File rejected
Toast: "File too large. Maximum size is 10MB."
```

**No Connection**
```
User: Clicks "Upload Firmware" without device connected
Toast: "No active connection. Please connect to device first."
```

**Upload Failure**
```
Upload: Serial communication error
Toast: "Firmware upgrade failed. Error: Connection lost"
```

## Testing

### Manual Test Steps

1. **Test Drag & Drop**
   - Drag a .hex file to upload zone
   - Verify file appears in preview
   - Verify file size and name shown

2. **Test File Browser**
   - Click "Browse files" button
   - Select a .hex or .bin file
   - Verify file appears in preview

3. **Test Validation**
   - Try to upload .txt file (should reject)
   - Try to upload 15MB file (should reject)
   - Try to upload without device (should error)

4. **Test Upload**
   - Connect to device
   - Drop a valid .hex file
   - Click "Upload Firmware"
   - Verify toast notifications appear
   - Verify upload completes successfully
   - Verify device reboots with new firmware

5. **Test Multiple Uploads**
   - Upload first firmware
   - Upload second firmware
   - Verify both complete successfully
   - Verify no filename collisions

### Automated Tests (Future)

```typescript
describe('Local Firmware Upload', () => {
  it('should accept .hex files', () => {
    // Test file validation
  })
  
  it('should reject invalid file types', () => {
    // Test rejection
  })
  
  it('should save file to temp location', () => {
    // Test IPC handler
  })
  
  it('should sanitize filename', () => {
    // Test sanitization
  })
  
  it('should upload file via serial', () => {
    // Test integration
  })
})
```

## Known Limitations

1. **Upload Speed**: Same as GitHub releases (~50 min for 500KB)
   - Limited by Intel HEX line-by-line protocol
   - Binary protocol would be faster but requires redesign

2. **No Resume**: If upload fails, must restart from beginning
   - No checkpoint/resume mechanism
   - Power loss requires complete re-upload

3. **Single File**: Only one file can be uploaded at a time
   - UI supports multiple files but backend processes one

4. **Temp Storage**: Files saved to temp directory
   - May be cleared by OS or user
   - Not persisted like GitHub downloads

## Future Enhancements

1. **Verification**: Add post-upload verification
   - Read back flash and compare CRC
   - Detect corrupted uploads

2. **Resume Support**: Save upload state
   - Allow resume from last checkpoint
   - Recover from connection loss

3. **Binary Protocol**: Replace Intel HEX with binary
   - 10-100× faster uploads
   - More complex implementation

4. **Batch Upload**: Support multiple files
   - Queue uploads
   - Upload to multiple devices

5. **File History**: Track uploaded files
   - Show upload history
   - Allow re-upload from history

## Comparison: GitHub vs Local Upload

| Feature | GitHub Release | Local File |
|---------|---------------|------------|
| **Source** | Online repository | User's computer |
| **Speed** | Network + Upload | Upload only |
| **Verification** | GitHub checksums | User responsibility |
| **Storage** | Persistent cache | Temporary |
| **Version Info** | Automatic | Manual |
| **Internet** | Required | Not required |

## Summary

The drag & drop firmware upload feature provides a convenient way for users to upload custom or development firmware directly from their computer. It integrates seamlessly with the existing OTA update system and requires no changes to the STM32 bootloader.

**Key Benefits:**
- ✅ No internet required for upload
- ✅ Support for development/custom firmware
- ✅ Familiar drag & drop UI
- ✅ Secure file handling
- ✅ Seamless integration with existing code

**Commit:** `0701c04` - Implement drag and drop hex firmware upload feature

---

*For complete OTA update documentation, see [OTA_README.md](./OTA_README.md)*

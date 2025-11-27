# Assets Directory

This directory contains icon files for the PC Health Assistant application.

## Tray Icon

For the system tray icon, you should place a `tray-icon.png` or `tray-icon.ico` file here.

### Recommended Icon Sizes:
- **Windows**: 16x16 or 32x32 pixels (ICO format preferred)
- **macOS**: 16x16 and 32x32 pixels (PNG with transparency)
- **Linux**: 16x16 or 22x22 pixels (PNG)

### Creating a Custom Icon:

You can use tools like:
- **GIMP** (free) - Export as ICO or PNG
- **Paint.NET** (Windows, free) - Export as ICO
- **Online converters** - Convert PNG to ICO

The current implementation uses an embedded base64 icon as a fallback. Replace it with a proper icon file by updating the path in `src/main/index.js`.

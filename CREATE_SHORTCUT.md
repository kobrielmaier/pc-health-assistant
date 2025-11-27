# How to Create a Desktop Shortcut for PC Health Assistant

## ⭐ Recommended Method (No Terminal Window):

1. **Find the file** `launch-app-hidden.vbs` in this folder
2. **Right-click** on `launch-app-hidden.vbs`
3. Click **"Send to"** → **"Desktop (create shortcut)"**
4. A shortcut will appear on your desktop!
5. **Right-click** the shortcut → **Rename** it to "PC Health Assistant"

This launcher will start the app **without showing a terminal window**.

## Alternative Method (Shows Terminal):

1. **Find the file** `launch-app.bat` in this folder
2. **Right-click** on `launch-app.bat`
3. Click **"Send to"** → **"Desktop (create shortcut)"**
4. A shortcut will appear on your desktop!

**Note:** This method shows a terminal window while the app runs.

## Customizing the Shortcut:

After creating the shortcut on your desktop:

1. **Right-click** the shortcut on your desktop
2. Click **"Properties"**
3. Click **"Change Icon..."** button
4. Browse to choose an icon (or use a default Windows icon)
5. Click **"OK"** to save

## Alternative: Manual Shortcut Creation

1. **Right-click** on your Desktop
2. Select **"New"** → **"Shortcut"**
3. In "Type the location of the item", paste:
   ```
   C:\Users\kobri\pc-health-assistant\launch-app.bat
   ```
4. Click **"Next"**
5. Name it: **PC Health Assistant**
6. Click **"Finish"**

## Using the Shortcut:

- **Double-click** the desktop icon to launch the app
- The app will open and appear in the system tray
- Look for the tray icon in the bottom-right corner (next to the clock)

## Troubleshooting:

If the app doesn't launch:
- Make sure you've run `npm install` in the project folder first
- Check that Node.js and npm are installed
- Try running `npm start` from the command line to see any error messages

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Run npm run dev in the background without showing a window
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && npm run dev", 0, False

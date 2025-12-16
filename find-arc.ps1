# Find Arc Raiders Installation and Logs
Write-Host "=== Searching for Arc Raiders ===" -ForegroundColor Cyan

# Check common Steam paths
$steamPaths = @(
    "C:\Program Files (x86)\Steam\steamapps\common",
    "D:\Steam\steamapps\common",
    "E:\Steam\steamapps\common",
    "D:\Games\Steam\steamapps\common",
    "E:\Games\Steam\steamapps\common",
    "D:\SteamLibrary\steamapps\common",
    "E:\SteamLibrary\steamapps\common"
)

Write-Host "`n=== Checking Steam Libraries ===" -ForegroundColor Yellow
foreach ($path in $steamPaths) {
    if (Test-Path $path) {
        Write-Host "Found Steam library: $path" -ForegroundColor Green
        $arcFolder = Get-ChildItem $path -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Arc*" -or $_.Name -like "*Pioneer*" }
        if ($arcFolder) {
            Write-Host "  Found: $($arcFolder.FullName)"
            # Check for Saved/Crashes folder
            $crashFolder = Join-Path $arcFolder.FullName "Pioneer\Saved\Crashes"
            if (Test-Path $crashFolder) {
                Write-Host "  Crash folder exists: $crashFolder"
                Get-ChildItem $crashFolder -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10 FullName, LastWriteTime
            }
            # Check for logs
            $logFolder = Join-Path $arcFolder.FullName "Pioneer\Saved\Logs"
            if (Test-Path $logFolder) {
                Write-Host "  Log folder exists: $logFolder"
                Get-ChildItem $logFolder -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 5 FullName, LastWriteTime
            }
        }
    }
}

# Check AppData
Write-Host "`n=== Checking AppData for Embark/Pioneer ===" -ForegroundColor Yellow
$appDataPaths = @(
    "$env:LOCALAPPDATA\Embark",
    "$env:LOCALAPPDATA\Pioneer",
    "$env:LOCALAPPDATA\ArcRaiders",
    "$env:APPDATA\Embark",
    "$env:APPDATA\Pioneer"
)

foreach ($path in $appDataPaths) {
    if (Test-Path $path) {
        Write-Host "Found: $path" -ForegroundColor Green
        Get-ChildItem $path -Recurse -ErrorAction SilentlyContinue |
            Where-Object { -not $_.PSIsContainer } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 20 FullName, LastWriteTime, Length
    }
}

# Check for Unreal crash reports related to Pioneer
Write-Host "`n=== Checking for Unreal Engine Crash Reports ===" -ForegroundColor Yellow
$unrealCrash = "$env:LOCALAPPDATA\CrashReportClient"
if (Test-Path $unrealCrash) {
    Get-ChildItem $unrealCrash -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-2) } |
        Select-Object -First 20 FullName, LastWriteTime
}

# Search WER ReportArchive for Pioneer/Arc
Write-Host "`n=== Checking WER Report Archive ===" -ForegroundColor Yellow
$werPath = "C:\ProgramData\Microsoft\Windows\WER\ReportArchive"
if (Test-Path $werPath) {
    Get-ChildItem $werPath -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "*Pioneer*" -or $_.Name -like "*Arc*" -or $_.Name -like "*Embark*" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 10 FullName, LastWriteTime
}

# Look at recent WER reports for any game-related crashes
Write-Host "`n=== Recent WER Folders (all) ===" -ForegroundColor Yellow
if (Test-Path $werPath) {
    Get-ChildItem $werPath -Directory -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 15 Name, LastWriteTime
}

# Check Reliability Monitor style events
Write-Host "`n=== Recent Application Crashes (Reliability History) ===" -ForegroundColor Yellow
Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Application Error'; StartTime=(Get-Date).AddDays(-7)} -MaxEvents 20 -ErrorAction SilentlyContinue |
    Format-List TimeCreated, Message

Write-Host "`n=== Done ===" -ForegroundColor Cyan

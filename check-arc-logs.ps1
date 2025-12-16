# Check Arc Raiders Logs
$arcPath = "C:\Program Files (x86)\Steam\steamapps\common\Arc Raiders"

Write-Host "=== Arc Raiders Folder Structure ===" -ForegroundColor Cyan
Get-ChildItem $arcPath -Directory | Select-Object Name

Write-Host "`n=== PioneerGame Contents ===" -ForegroundColor Yellow
Get-ChildItem "$arcPath\PioneerGame" -Directory -ErrorAction SilentlyContinue | Select-Object Name

Write-Host "`n=== Looking for Saved folder ===" -ForegroundColor Yellow
$savedPath = "$arcPath\PioneerGame\Saved"
if (Test-Path $savedPath) {
    Write-Host "Found Saved folder: $savedPath" -ForegroundColor Green
    Get-ChildItem $savedPath -Directory | Select-Object Name

    # Check Crashes folder
    $crashPath = "$savedPath\Crashes"
    if (Test-Path $crashPath) {
        Write-Host "`nCrash reports:" -ForegroundColor Red
        Get-ChildItem $crashPath -Recurse -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 20 FullName, LastWriteTime
    }

    # Check Logs folder
    $logPath = "$savedPath\Logs"
    if (Test-Path $logPath) {
        Write-Host "`nLog files:" -ForegroundColor Yellow
        Get-ChildItem $logPath -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 10 Name, LastWriteTime, Length

        # Read the most recent log
        $latestLog = Get-ChildItem $logPath -Filter "*.log" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

        if ($latestLog) {
            Write-Host "`n=== Last 100 lines of $($latestLog.Name) ===" -ForegroundColor Cyan
            Get-Content $latestLog.FullName -Tail 100 -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Host "No Saved folder at $savedPath" -ForegroundColor Red
    Write-Host "Checking alternate location..."
}

# Check if logs are in AppData instead
Write-Host "`n=== Checking AppData for Arc Raiders logs ===" -ForegroundColor Yellow
$appDataPath = "$env:LOCALAPPDATA\Embark\Pioneer\Saved"
if (Test-Path $appDataPath) {
    Write-Host "Found: $appDataPath" -ForegroundColor Green
    Get-ChildItem $appDataPath -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 30 FullName, LastWriteTime

    # Check for crash logs
    $crashPath2 = "$appDataPath\Crashes"
    if (Test-Path $crashPath2) {
        Write-Host "`nAppData Crash reports:" -ForegroundColor Red
        Get-ChildItem $crashPath2 -Recurse |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 20 FullName, LastWriteTime
    }

    # Check logs
    $logPath2 = "$appDataPath\Logs"
    if (Test-Path $logPath2) {
        Write-Host "`nAppData Log files:"
        Get-ChildItem $logPath2 -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 10 Name, LastWriteTime
    }
}

# Also check for Pioneer directly
$pioneerAppData = "$env:LOCALAPPDATA\Pioneer"
if (Test-Path $pioneerAppData) {
    Write-Host "`n=== Found Pioneer in AppData ===" -ForegroundColor Green
    Get-ChildItem $pioneerAppData -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 30 FullName, LastWriteTime
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan

# Arc Raiders Crash Diagnostic Script
Write-Host "=== Arc Raiders Crash Investigation ===" -ForegroundColor Cyan
Write-Host ""

# Check for crash dumps
Write-Host "=== Recent Crash Dumps ===" -ForegroundColor Yellow
$crashPath = "$env:LOCALAPPDATA\CrashDumps"
if (Test-Path $crashPath) {
    Get-ChildItem $crashPath | Sort-Object LastWriteTime -Descending | Select-Object -First 15 Name, LastWriteTime, @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}}
} else {
    Write-Host "No crash dumps folder found"
}
Write-Host ""

# Check Windows Error Reporting for Arc/Embark
Write-Host "=== Windows Error Reports (last 24h) ===" -ForegroundColor Yellow
Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Windows Error Reporting'; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 50 -ErrorAction SilentlyContinue |
    Where-Object { $_.Message -match 'Arc|Embark|ArcRaiders' } |
    Format-List TimeCreated, Message
Write-Host ""

# Check Application errors
Write-Host "=== Application Errors (last 24h) ===" -ForegroundColor Yellow
Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 100 -ErrorAction SilentlyContinue |
    Where-Object { $_.Message -match 'Arc|Embark|ArcRaiders|Unreal|game|crash' -or $_.ProviderName -match 'Application Error' } |
    Select-Object -First 20 |
    Format-List TimeCreated, ProviderName, Message
Write-Host ""

# Check for GPU errors
Write-Host "=== GPU/Driver Errors (last 24h) ===" -ForegroundColor Yellow
Get-WinEvent -FilterHashtable @{LogName='System'; Level=2,3; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 100 -ErrorAction SilentlyContinue |
    Where-Object { $_.ProviderName -match 'nvlddmkm|amdkmdag|dxgkrnl|display|video' -or $_.Message -match 'display|driver|GPU|TDR|reset|graphics' } |
    Select-Object -First 10 |
    Format-List TimeCreated, ProviderName, Message
Write-Host ""

# Check system resources
Write-Host "=== Current System Resources ===" -ForegroundColor Yellow
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor
$gpu = Get-CimInstance Win32_VideoController

Write-Host "CPU: $($cpu.Name)"
Write-Host "RAM: $([math]::Round($os.TotalVisibleMemorySize/1MB,1)) GB total, $([math]::Round($os.FreePhysicalMemory/1MB,1)) GB free"
Write-Host "GPU: $($gpu.Name)"
Write-Host "GPU Driver: $($gpu.DriverVersion) ($($gpu.DriverDate))"
Write-Host "GPU Status: $($gpu.Status)"
Write-Host ""

# Check for Arc Raiders specific logs
Write-Host "=== Arc Raiders Log Files ===" -ForegroundColor Yellow
$arcPaths = @(
    "$env:LOCALAPPDATA\ArcRaiders",
    "$env:LOCALAPPDATA\Embark",
    "$env:APPDATA\ArcRaiders",
    "$env:APPDATA\Embark"
)
foreach ($path in $arcPaths) {
    if (Test-Path $path) {
        Write-Host "Found: $path"
        Get-ChildItem $path -Recurse -Filter "*.log" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 5 FullName, LastWriteTime
    }
}

# Check for Unreal Engine crash reports
$unrealCrash = "$env:LOCALAPPDATA\CrashReportClient"
if (Test-Path $unrealCrash) {
    Write-Host ""
    Write-Host "Unreal Crash Reports:"
    Get-ChildItem $unrealCrash -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-1) } |
        Select-Object -First 10 FullName, LastWriteTime
}

Write-Host ""
Write-Host "=== All Recent WER Reports ===" -ForegroundColor Yellow
Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Windows Error Reporting'; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 30 -ErrorAction SilentlyContinue |
    Format-List TimeCreated, Message

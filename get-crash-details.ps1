# Get detailed Application Error events
Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Application Error'} -MaxEvents 50 -ErrorAction SilentlyContinue |
ForEach-Object {
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated
        Message = $_.Message
    }
} | Out-File -FilePath "C:\Users\kobri\pc-health-assistant\crash-details.txt" -Width 500

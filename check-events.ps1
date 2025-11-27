# Get recent Application errors
Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2} -MaxEvents 100 -ErrorAction SilentlyContinue |
Select-Object TimeCreated, ProviderName, Id, Message |
Out-File -FilePath "C:\Users\kobri\pc-health-assistant\event-log-errors.txt"

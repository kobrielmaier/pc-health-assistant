# Get detailed Arc Raiders crash information
Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Application Error'} -MaxEvents 200 -ErrorAction SilentlyContinue |
Where-Object { $_.Message -like '*SandFall*' } |
Select-Object TimeCreated, Message |
Format-List | Out-File -FilePath "C:\Users\kobri\pc-health-assistant\arc-raiders-crashes.txt" -Width 1000

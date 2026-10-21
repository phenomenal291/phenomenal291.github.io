# PowerShell script to create a Windows Desktop Shortcut for Portfolio Manager
$wsh = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Portfolio Manager.lnk"
$portfolioDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $portfolioDir) { $portfolioDir = "C:\Users\Administrator\Desktop\Resource\portfolio" }

$exePath = Join-Path $portfolioDir "dist\PortfolioManager\PortfolioManager.exe"
$shortcut = $wsh.CreateShortcut($shortcutPath)

if (Test-Path $exePath) {
    $shortcut.TargetPath = $exePath
    $shortcut.Arguments = ""
} else {
    $pythonw = (Get-Command pythonw.exe -ErrorAction SilentlyContinue).Source
    if (-not $pythonw) { $pythonw = "pythonw.exe" }
    $shortcut.TargetPath = $pythonw
    $shortcut.Arguments = "`"$portfolioDir\gui.py`""
}

$shortcut.WorkingDirectory = $portfolioDir
$shortcut.IconLocation = "$portfolioDir\assets\icon.ico,0"
$shortcut.Description = "Portfolio Manager - Duong Tan Phuc"
$shortcut.Save()

Write-Host "[✓] Portfolio Manager shortcut created on Desktop:" -ForegroundColor Green
Write-Host "    $shortcutPath" -ForegroundColor Cyan

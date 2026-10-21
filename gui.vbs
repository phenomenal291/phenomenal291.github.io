Set WshShell = CreateObject("WScript.Shell")
portfolioDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = portfolioDir
WshShell.Run "pythonw.exe gui.py", 0, False

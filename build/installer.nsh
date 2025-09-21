; Custom NSIS installer script for Code Kata App
; This script adds custom installation steps and registry entries

!macro customInstall
  ; Create registry entries for file associations
  WriteRegStr HKCR ".kata" "" "CodeKataFile"
  WriteRegStr HKCR "CodeKataFile" "" "Code Kata File"
  WriteRegStr HKCR "CodeKataFile\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCR "CodeKataFile\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  
  ; Add to PATH for CLI tools (if implemented)
  ; EnVar::SetHKCU
  ; EnVar::AddValue "PATH" "$INSTDIR\cli"
!macroend

!macro customUnInstall
  ; Remove registry entries
  DeleteRegKey HKCR ".kata"
  DeleteRegKey HKCR "CodeKataFile"
  
  ; Remove from PATH
  ; EnVar::SetHKCU
  ; EnVar::DeleteValue "PATH" "$INSTDIR\cli"
!macroend
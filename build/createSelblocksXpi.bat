SETLOCAL

:: Pre-requisites:
::   Hand-edit install.rdf: <em:version>x.y.z
::             about.xul: text box
::             sel-bocks.js: header comment
:: Assumptions:
::   cygwin grep
::   cygwin zip

set BUILD_DIR=%~dp0
set ROOT=%BUILD_DIR%..

:: parse SelBlocks version # from its install.rdf
call :S_GET_ADDON_VER ..\sel-blocks-fx_xpi
set SB_VER=%_ver%

echo SelBlocks: %SB_VER%


:: create the SelBlocks xpi
pushd ..\sel-blocks-fx_xpi
del "%ROOT%\sel-blocks-%SB_VER%-fx.xpi"
zip -r "%ROOT:\=/%/../sel-blocks-%SB_VER%-fx.xpi" * -x@"%BUILD_DIR%xpi-excludes.lst"
popd

ENDLOCAL


GOTO :done

:S_GET_ADDON_VER
  SETLOCAL
  FOR /F "tokens=1,2,3 delims=><" %%L IN ('grep "em:version" %1\install.rdf') DO (
    :: L-M-N
    echo %%L %%M %%N
    set _ver=%%N
  )
  ENDLOCAL & set _ver=%_ver%
  GOTO :eof

ENDLOCAL

ENDLOCAL

:done
pause

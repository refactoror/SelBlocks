SETLOCAL

:: Assumptions:
::   cygwin sed

::@echo off

psuhd "%~dp0"
SET SRC_DIR=..\sel-blocks-fx_xpi\chrome\content\extensions
copy user-extensions-base.js ..\user-extensions.js

:: get .js file names from extension-loader.xul
sed -n "/addPluginProvidedUserExtension/p" "%SRC_DIR%/extension-loader.xul" | sed -e "s~[^\x22]*\x22/~~" -e "s/\x22.*//" > jsFilenames.txt

:: concatenate .js files
FOR /F %%L IN (jsFilenames.txt) DO (
  echo.>> ..\user-extensions.js
  echo // ================================================================================>> ..\user-extensions.js
  echo // from: %%L>> ..\user-extensions.js
  type %SRC_DIR%\%%L >> ..\user-extensions.js
)

del jsFilenames.txt

popd

ENDLOCAL

:done
::pause

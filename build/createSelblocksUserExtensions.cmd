SETLOCAL
:: Assumptions:
::   cygwin sed

::@echo off

pushd "%~dp0"
del ..\user-extensions.js

SET SRC_DIR=..\sel-blocks-fx_xpi\chrome\content\extensions

:: get .js file names from extension-loader.xul
sed -n "/addPluginProvidedUserExtension/p" "%SRC_DIR%/extension-loader.xul" | sed -e "s~[^\x22]*\x22/~~" -e "s/\x22.*//" > jsFilenames.txt

:: concatenate .js files
echo // To use Selblocks commands in Selenium Server, provide this file on the command line.>> ..\user-extensions.js
echo // Eg: -userExtensions "C:\somewhere\user-extensions.js">> ..\user-extensions.js
FOR /F %%L IN (jsFilenames.txt) DO (
  CALL :s_concat %SRC_DIR% %%L
)
del jsFilenames.txt

:: create minified version of user-extensions.js
"%JAVA_HOME%\bin\java" -jar "yuicompressor-2.4.8.jar" ^
     ../user-extensions.js ^
  -o ../user-extensions-min.js

popd

ENDLOCAL
goto :done

:s_concat
  echo.>> ..\user-extensions.js
  echo // ================================================================================>> ..\user-extensions.js
  echo // from: %2>> ..\user-extensions.js
  echo.>> ..\user-extensions.js
  type %1\%2 >> ..\user-extensions.js
  IF "%2" == "function-intercepting.js" (
    CALL :s_concat . user-extensions-base.js
  )
  goto :eof

:done
::pause

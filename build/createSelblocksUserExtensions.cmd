SETLOCAL

:: Assumptions:
::   cygwin sed

::@echo off

pushd "%~dp0"
del ..\user-extensions.js

SET SRC_DIR=..\sel-blocks-fx_xpi\chrome\content\extensions

type ^
 %SRC_DIR%\name-space.js ^
 %SRC_DIR%\logger.js ^
 %SRC_DIR%\function-intercepting.js ^
 user-extensions-base.js ^
 %SRC_DIR%\xpath-processing.js ^
 %SRC_DIR%\fileIO.js ^
 %SRC_DIR%\expression-parser.js ^
 %SRC_DIR%\selenium-executionloop-handleAsExitTest.js ^
 %SRC_DIR%\selenium-executionloop-handleAsTryBlock.js ^
 %SRC_DIR%\selblocks.js > ..\user-extensions.js

popd

ENDLOCAL

:done
::pause

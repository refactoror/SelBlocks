@echo off
SETLOCAL
SET extensionsDir=%~dp0..\sel-blocks-fx_xpi\chrome\content\extensions
SET userExtensionDir=%~dp0..\user extension

SET copylist="%userExtensionDir%\scripts\config.js"+"%extensionsDir%\name-space.js"+"%extensionsDir%\logger.js"+"%extensionsDir%\function-intercepting.js"+"%extensionsDir%\xpath-processing.js"+"%extensionsDir%\expression-parser.js"+"%extensionsDir%\selenium-executionloop-handleAsExitTest.js"+"%extensionsDir%\selenium-executionloop-handleAsTryBlock.js"+"%extensionsDir%\selblocks.js"

copy %copylist% /B "%userExtensionDir%\user-extensions.js" /B
ENDLOCAL
EXIT /B %ERRORLEVEL%
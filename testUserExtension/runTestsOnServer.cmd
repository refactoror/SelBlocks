@ echo off

SETLOCAL

REM if the autotests don't complete within the given time, the server will shut
REM down and close the browser windows.
SET /a autotestTimeoutInSeconds=30
REM the root of the project
REM C:\projects\selenium\selblocks\SelBlocks\
SET projectRoot=%~dp0..\
REM parts of the baseURL used when the server is started
SET protocol=http
SET host=localhost
SET port=4444
REM the name of the test suite to load into the server
SET testSuiteFileName=_SelBlocks-TestSuite.html
REM directory that holds the selenese tests
SET testsDirName=sel-blocksTests
REM directory that holds parts of the user extension and the generated 
REM "release" version of the extension.
SET userExtensionDirName=user extension
REM holds scripts, logs, results, and other files for testing the user extension
REM the testing version of the extension is generated here.
SET testUserExtensionDirName=testUserExtension
REM console output from the server is redirected into this file when
REM the log option is used.
SET serverLogFileName=Selenium Server Log.txt
SET serverLog=%projectRoot%\%testUserExtensionDirName%\%serverLogFileName%
REM Autotesting results will be placed in this file. The browser chosen will be
REM added to the end of the file name. (results-firefox.html)
SET resultsLogFileName=results
SET resultsLog=%projectRoot%\%testUserExtensionDirName%\%resultsLogFileName%
REM the location of selenium-server-standalone*.jar, chromedriver.exe, and
REM IEDriverServer.exe
REM C:\projects\selenium\server\
SET seleniumServerLocation=%projectRoot%\..\..\server\
REM the filesystem path to the test suite file.
SET testSuiteFile=%projectRoot%\%testsDirName%\%testSuiteFileName%
REM this is the base url setting for selenium server
SET baseURL=%protocol%://%host%:%port%
REM the server debug path to the test suite. This is not the same as the
REM autotesting url.
SET testSuiteURL=%baseURL%/selenium-server/%testsDirName%/%testSuiteFileName%
REM the release version of the user extension.
SET defaultUserExtensions=%projectRoot%\%userExtensionDirName%\user-extensions.js
REM the testing version of the user extension.
SET testUserExtensions=%projectRoot%\%testUserExtensionDirName%\user-extensions.js
REM Selenium server roots at whatever directory contains the user-extensions
REM file. This is just a copy of the testing version of the user extension.
SET serverDebugUserExtensions=%projectRoot%\user-extensions.js
REM Sets %seleniumServerJar% by selecting the last found
REM selenium-server-standalone file in
REM %seleniumServerLocation% I think it always finds the one with the highest
REM version number but I'm not sure.
FOR %%I IN (%seleniumServerLocation%\selenium-server-standalone*.jar) DO SET seleniumServerJar=%%~dpnxI

CALL :startAutotest "firefox"
IF NOT %ERRORLEVEL% EQU 0 (
  CALL :startDebug
)

ENDLOCAL
EXIT /B %ERRORLEVEL%

:cleanupLogsAndResults
  SETLOCAL
  REM deletes the existing server logs
  FOR %%I IN ("%serverLog%*") DO  DEL /Q "%%I"

  REM deletes the existing auto testing results
  FOR %%I IN (results-*.html) DO DEL /Q "%%I"
ENDLOCAL
EXIT /B 0

:generateTestingUserExtension
  SETLOCAL
  REM creates the user extension with selbench and selblocks
  
  SET selbenchUserExtension=%projectRoot%..\..\selbench\SelBench\user extension\user-extensions.js

  DEL /Q %testUserExtensions%
  
  START "Regenerating default user-extensions.js" /WAIT /MIN CMD /C "%projectRoot%\build\createSelblocksUserExtensions.cmd"
  IF NOT %ERRORLEVEL% EQU 0 (
    ECHO ERROR: Could not generate user-extensions.js
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
  
  COPY "%selbenchUserExtension%"+"%defaultUserExtensions%" /B "%testUserExtensions%" /B
ENDLOCAL
EXIT /B %ERRORLEVEL%

:waitForFile
  SETLOCAL
  SET /a count=0
  SET /a max=11
  SET filename=
  
  IF [%1]==[] (
    ECHO ERROR: No file given to wait for.
    ENDLOCAL
    EXIT /B 1
  ) ELSE (
    SET filename=%~1
  )
  IF [%2]==[] (
    ECHO WARNING: No maximum count given, defaulting to %max%.
  ) ELSE (
    SET /a max=%2
  )
  ECHO INFO: Watching for file: "%filename%" for approximately %max% seconds.
:waitForFileLoop
  IF EXIST "%filename%" (
    ENDLOCAL
    EXIT /B 0
  ) ELSE IF %count% LSS %max% (
    ECHO INFO: File check %count%
    SET /a count+=1
    PING -n 2 127.0.0.1>nul
    GOTO :waitForFileLoop
  ) ELSE (
    ECHO ERROR: The file never showed up.
    ENDLOCAL
    EXIT /B 1
  )
ENDLOCAL
EXIT /B %ERRORLEVEL%

:openFile
  SETLOCAL
  REM opens the file in the default application.
  IF [%1]==[] (
    ECHO ERROR: No file specified.
    ENDLOCAL
    EXIT /B 1
  )
  CALL :waitForFile %*
  IF NOT %ERRORLEVEL% EQU 0 (
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
  ECHO INFO: Opening %*
  explorer %*
ENDLOCAL
EXIT /B %ERRORLEVEL%

:startAutotest
  SETLOCAL
  IF [%1]==[] (
    ECHO ERROR: No browser specified.
    ENDLOCAL
    EXIT /B 1
  )
  SET browser=%~1
  REM firefox, piiexplore, googlechrome
  
  CALL :cleanupLogsAndResults
  IF NOT %ERRORLEVEL% EQU 0 (
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
  CALL :generateTestingUserExtension
  IF NOT %ERRORLEVEL% EQU 0 (
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
  
  REM  browsers currently available

  REM  *firefox
  REM  *mock
  REM  *firefoxproxy
  REM  *pifirefox
  REM  *chrome
  REM  *iexploreproxy
  REM  *iexplore
  REM  *firefox3
  REM  *safariproxy
  REM  *googlechrome
  REM  *konqueror
  REM  *firefox2
  REM  *piiexplore
  REM  *safari
  REM  *firefoxchrome
  REM  *opera
  REM  *webdriver
  REM  *iehta
  REM  *custom

  REM runs test suite specified by testSuiteFile, in the given browser
  start /wait "selenium server" /MIN java -jar "%seleniumServerJar%" ^
 -port %port% ^
 -Dwebdriver.ie.driver="%seleniumServerLocation%\IEDriverServer.exe" ^
 -Dwebdriver.chrome.driver="%seleniumServerLocation%\chromedriver.exe" ^
 -userExtensions "%testUserExtensions%" ^
 -log "%serverLog%" -browserSideLog ^
 -htmlSuite "*%browser%" "%baseURL%" "%testSuiteFile%" "%resultsLog%-%browser%.html" ^
 -timeout %autotestTimeoutInSeconds%
  
  IF NOT %ERRORLEVEL% EQU 0 (
    ECHO ERROR: Something went wrong with the server or the tests timed out. Check the logs.
    SETLOCAL ENABLEDELAYEDEXPANSION
    SET str=%serverLog%
    FOR /l %%i in (1,1,10) DO SET str=!str:\\=\!
    CALL :openFile "!str!"
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
  
  REM opens the results in the default browser
  CALL :openFile "%resultsLog%-%browser%.html" 3
  IF NOT %ERRORLEVEL% EQU 0 (
    ECHO ERROR: Could not open browser to the test results.
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
ENDLOCAL
EXIT /B %ERRORLEVEL%

:startDebug
  SETLOCAL
  DEL /Q %serverDebugUserExtensions%
  
  REM copies the testing user extensions file to the debug location.
  COPY "user-extensions.js" %serverDebugUserExtensions%
  IF NOT %ERRORLEVEL% EQU 0 (
    ECHO ERROR: Could not copy user-extensions.js to the project root.
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )

  REM Starts the server and roots it at the directory where
  REM %serverDebugUserExtensions% is located
  REM no html results file will be generated but you can listen to the
  REM HTTP POST requests made
  START "selenium server" /MAX java -jar "%seleniumServerJar%" ^
 -port %port% ^
 -Dwebdriver.ie.driver="%seleniumServerLocation%\IEDriverServer.exe" ^
 -Dwebdriver.chrome.driver="%seleniumServerLocation%\chromedriver.exe" ^
 -userExtensions "%serverDebugUserExtensions%" ^
 -debug

  REM we don't wait for the server because debugging might take a long time.
  REM this also means we don't listen for the server to exit with some errorlevel.
  
  REM opens the default web browser to the server test runner and sets the test
  REM path to the test suite.
  CALL :seleniumOpenTestSuite "%testSuiteURL%"
  IF NOT %ERRORLEVEL% EQU 0 (
    ECHO ERROR: Could not open browser to the test suite.
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
ENDLOCAL
EXIT /B %ERRORLEVEL%

:seleniumOpenTestSuite
SETLOCAL
  IF [%1]==[] (
    ECHO ERROR: No test specified.
    ENDLOCAL
    EXIT /B 1
  )
  
  SET sc=%%3A
  SET fs=%%2F
  SET "str=%baseURL%/selenium-server/core/TestRunner.html?test=%~1"
  SET "str=%str%&resultsUrl=%protocol%%sc%%fs%%fs%%host%%sc%%port%/selenium-server/postResults"
  SET "str=%str%&baseUrl=%protocol%%sc%%fs%%fs%%host%%sc%%port%"
  SET "str=%str%&multiWindow=true"
  SET "str=%str%&defaultLogLevel=info"
  
  IF NOT [%2]==[] (
    SET str=%str%^&auto=true
  )
  
  explorer "%str%"
ENDLOCAL
REM explorer sets an errorlevel if it tries to open anything that isn't a file
EXIT /B 0

:seleniumOpenHub
SETLOCAL
  explorer "%baseURL%/wd/hub"
ENDLOCAL
REM explorer sets an errorlevel if it tries to open anything that isn't a file
EXIT /B 0

:seleniumOpenSeleniumServer
SETLOCAL
  explorer "%baseURL%/selenium-server/"
ENDLOCAL
REM explorer sets an errorlevel if it tries to open anything that isn't a file
EXIT /B 0

:seleniumOpenSeleniumServerDriver
SETLOCAL
  explorer "%baseURL%/selenium-server/driver/"
ENDLOCAL
REM explorer sets an errorlevel if it tries to open anything that isn't a file
EXIT /B 0

:seleniumOpenSeleniumServerCore
SETLOCAL
  explorer "%baseURL%/selenium-server/core/"
ENDLOCAL
REM explorer sets an errorlevel if it tries to open anything that isn't a file
EXIT /B 0

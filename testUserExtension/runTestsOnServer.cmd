@ echo off

SETLOCAL

REM if the autotests don't complete within the given time, the server will shut
REM down and close the browser windows.
SET /a autotestTimeoutInSeconds=90
REM the root of the project
REM C:\projects\selenium\selblocks\SelBlocks\
SET projectRoot=%~dp0..\
REM parts of the baseURL used when the server is started
SET protocol=http
SET host=htmlpreview.github.io
SET port=80
REM the port that selenium server will run on
SET seleniumServerPort=4444
REM the name of the test suite to load into the server
SET testSuiteFileName=_SelBlocks-TestSuite.html
REM the name of the directory that holds scripts for generating parts of the project
SET buildScriptsDirName=build
REM the script for building the release version of the user-extensions.js file
SET userExtensionsBuildScriptFileName=createSelblocksUserExtensions.cmd
REM directory that holds the selenese tests
SET testsDirName=sel-blocksTests
REM the path to selbench's user extension, for generating testing versions of
REM this user extension (not used in selbench project, obviously)
SET selbenchUserExtension=%projectRoot%..\..\selbench\SelBench\user extension\user-extensions.js
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
SET testSuiteURL=./../%testSuiteFileName%
REM the release version of the user extension.
SET defaultUserExtensions=%projectRoot%\%userExtensionDirName%\user-extensions.js
REM the testing version of the user extension.
SET testUserExtensions=%projectRoot%\%testUserExtensionDirName%\user-extensions.js
REM Selenium server roots at whatever directory contains the user-extensions
REM file. This is just a copy of the testing version of the user extension.
SET serverDebugUserExtensions=%projectRoot%\%testsDirName%\user-extensions.js
REM Sets %seleniumServerJar% by selecting the last found
REM selenium-server-standalone file in
REM %seleniumServerLocation% I think it always finds the one with the highest
REM version number but I'm not sure.
FOR %%I IN (%seleniumServerLocation%\selenium-server-standalone*.jar) DO SET seleniumServerJar=%%~dpnxI

CALL :parameterHandler %*
ENDLOCAL
EXIT /B %ERRORLEVEL%

:parameterHandler
  SETLOCAL ENABLEDELAYEDEXPANSION
  IF ["%~1"]==["-h"] (
    CALL :showHelp
    ENDLOCAL
    EXIT /B 0
  ) ELSE IF ["%~1"]==["-help"] (
    CALL :showHelp
    ENDLOCAL
    EXIT /B 0
  ) ELSE IF ["%~1"]==[""] (
    CALL :startAutotest
    IF NOT !ERRORLEVEL! EQU 0 (
      CALL :startDebugTestSuite
    )
  ) ELSE IF [%~1]==[start-autotest] (
    IF NOT ["%~2"]==[""] (
      IF ["%~2"]==["all"] (
        CALL :startAutotest "firefox" "nolog"
        CALL :startAutotest "piiexplore" "nolog"
        CALL :startAutotest "googlechrome" "nolog"
      ) ELSE (
        CALL :startAutotest "%~2" "%~3"
      )
    ) ELSE (
      CALL :startAutotest
    )
  ) ELSE IF [%~1]==[start-debug] (
    IF NOT ["%~2"]==[""] (
      CALL :startDebugTestSuite "%~2"
    ) ELSE (
      CALL :startDebugTestSuite
    )
  ) ELSE IF [%~1]==[open-selenium-server] (
    CALL :seleniumOpenSeleniumServer "%~2"
  ) ELSE IF [%~1]==[open-driver] (
    CALL :seleniumOpenSeleniumServerDriver "%~2"
  ) ELSE IF [%~1]==[open-core] (
    CALL :seleniumOpenSeleniumServerCore "%~2"
  ) ELSE (
    ECHO ERROR: I don't know what you want to do.
    ECHO ERROR: %*
  )
ENDLOCAL
EXIT /B %ERRORLEVEL%

:showHelp
SETLOCAL
  ECHO.
  ECHO GLORIOUS TEST RUNNER RUNS TESTS GLORIOUSLY
  ECHO.
  ECHO start without arguments to run autotests in firefox and automatically
  ECHO   show logs / start debug on failure.
  ECHO.
  ECHO start-autotest [browser] [nolog]
  ECHO   Where browser is a valid browser for Selenium, minus the initial asterisk
  ECHO   Where supplying the second argument as "nolog" will stop the server log
  ECHO   from opening automatically on failure. If you specify the browser as
  ECHO   "all" then the second argument is ignored. It will not open the logs
  ECHO   automatically, since they're deleted after each run with the browsers.
  ECHO   You basically just watch "firefox", "piiexplore", and "googlechrome"
  ECHO   go through the default test suite. It doesn't take long. If they don't
  ECHO   crash or timeout on the tests then there will be results-[browser].html
  ECHO   created. So really you don't have to watch, but it's fun to watch.
  ECHO.
  ECHO start-debug [test suite name]
  ECHO   Where test suite name is a test suite located in your test suites
  ECHO   directory.
  ECHO.
  ECHO open-selenium-server [subdirectory or page]
  ECHO   Where subdirectory or page is some subdirectory of wherever the selenium
  ECHO   server is rooted. Currently this is the project root.
  ECHO.
  ECHO open-driver [querystring]
  ECHO   Where querystring is the initial query to send to the RC server. By
  ECHO   default it gets a new firefox session. Your default browser should open
  ECHO   to a page where you can send commands through the address bar. The
  ECHO   browser under control will have a status window and the window under
  ECHO   remote control.
  ECHO.
  ECHO open-core [subdirectory or page]
  ECHO   Opens the /selenium-server/core/[subdirectory or page] The pages
  ECHO   available here are the ones packed into the selenium-core directory of
  ECHO   the selenium-server-standalone-[version].jar file
  ECHO.
ENDLOCAL
EXIT /B 0

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
  REM creates the user extension with selbench
  
  DEL /Q %testUserExtensions%
  
  START "Regenerating default user-extensions.js" /WAIT /MIN CMD /C "%projectRoot%\%buildScriptsDirName%\%userExtensionsBuildScriptFileName%"
  IF NOT %ERRORLEVEL% EQU 0 (
    ECHO ERROR: Could not generate user-extensions.js
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
  
  IF DEFINED selbenchUserExtension (
    COPY "%selbenchUserExtension%"+"%defaultUserExtensions%" /B "%testUserExtensions%" /B
  ) ELSE (
    COPY "%defaultUserExtensions%" /B "%testUserExtensions%" /B
  )
ENDLOCAL
EXIT /B %ERRORLEVEL%

:waitForFile
  SETLOCAL
  SET /a count=0
  SET /a max=11
  SET filename=
  
  IF ["%~1"]==[""] (
    ECHO ERROR: No file given to wait for.
    ENDLOCAL
    EXIT /B 1
  ) ELSE (
    SET filename=%~1
  )
  IF ["%~2"]==[""] (
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
  SETLOCAL ENABLEDELAYEDEXPANSION
  REM opens the file in the default application.
  IF ["%~1"]==[""] (
    ECHO ERROR: No file specified.
    ENDLOCAL
    EXIT /B 1
  )
  SET "str=%~1"
  REM Collapses multiple backslashes into a single backslash, unless there are
  REM more than 10 in a row...
  FOR /l %%i in (1,1,10) DO SET str=!str:\\=\!
  CALL :waitForFile "!str!" %~2
  IF NOT %ERRORLEVEL% EQU 0 (
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
  ECHO INFO: Opening "!str!"
  explorer "!str!"
ENDLOCAL
EXIT /B %ERRORLEVEL%

:startAutotestServer
  SETLOCAL
  IF ["%~1"]==[""] (
    ECHO ERROR: No browser specified.
    ENDLOCAL
    EXIT /B 1
  ) ELSE (
    ECHO INFO: Attempting to start "%~1" browser for automated testing.
  )
  SET browser=%~1
  REM firefox, piiexplore, googlechrome
  
  DEL /Q %serverDebugUserExtensions%
  
  REM copies the testing user extensions file to the debug location.
  COPY "%testUserExtensions%" /B "%serverDebugUserExtensions%" /B
  IF NOT %ERRORLEVEL% EQU 0 (
    ECHO ERROR: Could not copy user-extensions.js to the project root.
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
 -port %seleniumServerPort% ^
 -Dwebdriver.ie.driver="%seleniumServerLocation%\IEDriverServer.exe" ^
 -Dwebdriver.chrome.driver="%seleniumServerLocation%\chromedriver.exe" ^
 -userExtensions "%serverDebugUserExtensions%" ^
 -log "%serverLog%" -browserSideLog ^
 -htmlSuite "*%browser%" "%baseURL%" "%testSuiteFile%" "%resultsLog%-%browser%.html" ^
 -timeout %autotestTimeoutInSeconds%
 
ENDLOCAL
EXIT /B %ERRORLEVEL%

:openServerLog
  SETLOCAL ENABLEDELAYEDEXPANSION
  SET str=%serverLog%
  REM Collapses multiple backslashes into a single backslash, unless there are
  REM more than 10 in a row...
  FOR /l %%i in (1,1,10) DO SET str=!str:\\=\!
  CALL :openFile "!str!"
  ENDLOCAL
EXIT /B %ERRORLEVEL%

:startAutotest
  SETLOCAL
  IF ["%~1"]==[""] (
    ECHO WARN: No browser specified. Defaults to firefox
    SET browser=firefox
  ) ELSE (
    SET browser=%~1
  )
  REM firefox, piiexplore, googlechrome
  
  IF ["%~2"]==["nolog"] (
    ECHO WARN: Will not open Server Log on failure.
    SET nolog=true
  ) ELSE (
    SET nolog=false
  )
  
REM  CALL :cleanupLogsAndResults
REM  IF NOT %ERRORLEVEL% EQU 0 (
REM    ENDLOCAL
REM    EXIT /B %ERRORLEVEL%
REM  )
  
  CALL :generateTestingUserExtension
  IF NOT %ERRORLEVEL% EQU 0 (
    ENDLOCAL
    EXIT /B %ERRORLEVEL%
  )
  
  CALL :startAutotestServer "%browser%"
  IF NOT %ERRORLEVEL% EQU 0 (
    ECHO ERROR: Something went wrong with the server or the tests timed out. Check the logs.
    IF %nolog%==true (
      ECHO INFO: Logs can be found at: %serverLog%
    ) ELSE (
      CALL :openServerLog
    )
  )
  
  IF %nolog%==true (
    ECHO INFO: Test results can be found at: "%resultsLog%-%browser%.html"
  ) ELSE (
    REM opens the results in the default browser
    CALL :openFile "%resultsLog%-%browser%.html"
    IF NOT %ERRORLEVEL% EQU 0 (
      ECHO ERROR: Could not open browser to the test results.
      ENDLOCAL
      EXIT /B 1
    )
  )
ENDLOCAL
EXIT /B %ERRORLEVEL%

:startDebugServer
  SETLOCAL
  DEL /Q %serverDebugUserExtensions%
  
  REM copies the testing user extensions file to the debug location.
  COPY "%testUserExtensions%" /B "%serverDebugUserExtensions%" /B
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
 -port %seleniumServerPort% ^
 -Dwebdriver.ie.driver="%seleniumServerLocation%\IEDriverServer.exe" ^
 -Dwebdriver.chrome.driver="%seleniumServerLocation%\chromedriver.exe" ^
 -userExtensions "%serverDebugUserExtensions%" ^
 -debug

  REM we don't wait for the server because debugging might take a long time.
  REM this also means we don't listen for the server to exit with some errorlevel.
ENDLOCAL
EXIT /B %ERRORLEVEL%

:startDebugTestSuite
  SETLOCAL
  REM alternate test suites may be specified
  IF NOT ["%~1"]==[""] (
    SET "testSuiteURL=./../%testsDirName%/%~1"
  )
  
  CALL :startDebugServer
  
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
  IF ["%~1"]==[""] (
    ECHO ERROR: No test specified.
    ENDLOCAL
    EXIT /B 1
  )
  
  SET sc=%%3A
  SET fs=%%2F
  SET "str=%baseURL%/selenium-server/core/TestRunner.html?test=%~1"
  SET "str=%str%&resultsUrl=./selenium-server/postResults"
  SET "str=%str%&baseUrl=%protocol%%sc%%fs%%fs%%host%%sc%%port%"
  SET "str=%str%&multiWindow=on"
  SET "str=%str%&defaultLogLevel=info"
  
  IF NOT ["%~2"]==[""] (
    SET "str=%str%&auto=true"
  )
  
  explorer "%str%"
ENDLOCAL
REM explorer sets an errorlevel if it tries to open anything that isn't a file
EXIT /B 0

:seleniumOpenSeleniumServer
SETLOCAL
  CALL :startDebugServer
  explorer "%baseURL%/selenium-server/%~1"
ENDLOCAL
REM explorer sets an errorlevel if it tries to open anything that isn't a file
EXIT /B 0

:seleniumOpenSeleniumServerDriver
SETLOCAL
  REM java -jar selenium-server.jar -interactive
  REM cmd=getNewBrowserSession&1=*firefox&2=http://www.google.com
  REM Got result: OK,260113 on session 260113
  REM cmd=open&1=http://www.google.com&2=hello world&sessionId=<the session id on your browser window>
  CALL :startDebugServer
  IF ["%~1"]==[""] (
    explorer "%baseURL%/selenium-server/driver?cmd=getNewBrowserSession&1=*firefox&2=http://www.google.com"
  ) ELSE (
    explorer "%baseURL%/selenium-server/driver?%~1"
  )
ENDLOCAL
REM explorer sets an errorlevel if it tries to open anything that isn't a file
EXIT /B 0

:seleniumOpenSeleniumServerCore
SETLOCAL
  CALL :startDebugServer
  explorer "%baseURL%/selenium-server/core/%~1"
ENDLOCAL
REM explorer sets an errorlevel if it tries to open anything that isn't a file
EXIT /B 0

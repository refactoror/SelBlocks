@ echo off

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

SET resultsLog=%~dp0\results
SET serverLog=%~dp0\Selenium Server Log.txt
SET testSuite=%~dp0..\sel-blocksTests\_SelBlocks-TestSuite.html
SET userExtensions=%~dp0\user-extensions.js

rem creates the user extension with selbench and selblocks
SET selblocksUserExtension=%~dp0..\user extension\user-extensions.js
SET selbenchUserExtension=%~dp0..\..\..\selbench\SelBench\user extension\user-extensions.js
COPY "%selbenchUserExtension%"+"%selblocksUserExtension%" /B "%userExtensions%" /B

REM C:\projects\selenium\server\
REM selenium-server-standalone*.jar, chromedriver.exe, and IEDriverServer.exe
SET seleniumLocation=%~dp0..\..\..\server\

SET baseURL=http://localhost:4444

rem deletes the existing logs and results
FOR %%I IN ("%serverLog%*") DO  DEL /Q "%%I"
FOR %%I IN (results-*.html) DO DEL /Q "%%I"

rem Sets the seleniumServerJar variable to the path of the one with the highest
rem version in the directory pointed at by seleniumLocation
FOR %%I IN (%seleniumLocation%\selenium-server-standalone*.jar) DO SET seleniumServerJar=%%~dpnxI

REM runs test suite specified by testSuite, in firefox
SET browser=firefox
start /wait "selenium server" /MIN java -jar "%seleniumServerJar%" -userExtensions "%userExtensions%" -log "%serverLog%" -browserSideLog -Dwebdriver.ie.driver="%seleniumLocation%\IEDriverServer.exe" -Dwebdriver.chrome.driver="%seleniumLocation%\chromedriver.exe" -htmlSuite "*%browser%" "%baseURL%" "%testSuite%" "%resultsLog%-%browser%.html"
"%resultsLog%-%browser%.html"

rem  uncomment the following lines once selbench works on the server with firefox.
rem  we'll deal with browser inconsistencies after we get things up and running.

rem SET browser=piiexplore
rem start /wait "selenium server" /MIN java -jar "%seleniumServerJar%" -userExtensions "%userExtensions%" -log "%serverLog%" -browserSideLog -Dwebdriver.ie.driver="%seleniumLocation%\IEDriverServer.exe" -Dwebdriver.chrome.driver="%seleniumLocation%\chromedriver.exe" -htmlSuite "*%browser%" "%baseURL%" "%testSuite%" "%resultsLog%-%browser%.html"
rem "%resultsLog%-%browser%.html"
rem SET browser=googlechrome
rem start /wait "selenium server" /MIN java -jar "%seleniumServerJar%" -userExtensions "%userExtensions%" -log "%serverLog%" -browserSideLog -Dwebdriver.ie.driver="%seleniumLocation%\IEDriverServer.exe" -Dwebdriver.chrome.driver="%seleniumLocation%\chromedriver.exe" -htmlSuite "*%browser%" "%baseURL%" "%testSuite%" "%resultsLog%-%browser%.html"
rem "%resultsLog%-%browser%.html"

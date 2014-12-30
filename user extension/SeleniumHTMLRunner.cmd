@echo off

SET browser=firefox

REM change this to the base url for your tests.
SET baseURL=http://www.google.com

SET seleniumServerPort=4444

REM if the tests don't complete in this many seconds the server will kill the
REM browsers.
SET autotestTimeoutInSeconds=300

REM change these to paths on your own system. Keep the user-extensions.js file
REM in the root of your test suites directory.

SET fullPathToTestSuiteFile=C:\selenium tests\cases and suites\TestSuite.html
SET fullPathToUserExtensions=C:\selenium tests\cases and suites\user-extensions.js
SET fullPathToTestResultsFileLocation=C:\selenium tests\results and logs\
SET fullPathToSeleniumServerJar=C:\selenium server\selenium-server-standalone-2.43.1.jar


REM runs test suite specified by testSuiteFile, in the given browser
START "selenium server" /MAX  java -jar "%fullPathToSeleniumServerJar%" ^
 -port %seleniumServerPort% ^
 -userExtensions "%fullPathToUserExtensions%" ^
 -htmlSuite "*%browser%" "%baseURL%" "%fullPathToTestSuiteFile%" "%fullPathToTestResultsFileLocation%Results-%browser%.html" ^
 -timeout %autotestTimeoutInSeconds%
/*jslint
indent:2,
maxerr:500,
plusplus:true
 */
/*globals
selblocks,
HtmlRunnerTestLoop,
Selenium,
htmlTestRunner
 */
var globalContext = this;
globalContext.onServer = globalContext.onServer || true;
globalContext.serverPatchApplied = globalContext.serverPatchApplied || false;

function seleniumResetInterceptor() {
  "use strict";
  var old_reset;
  old_reset = Selenium.prototype.reset;

  Selenium.prototype.reset = function () {
    function map_list(list, for_func, if_func) {
      var i,
        x,
        mapped_list = [];
      for (i = 0; i < list.length; ++i) {
        x = list[i];
        // AJS: putaquiupariu
        if (undefined === if_func || if_func(i, x)) {
          mapped_list.push(for_func(i, x));
        }
      }
      return mapped_list;
    }

    /*jslint unparam:true */
    function importCommands(i, x) {
      var b = x.getCommand();
      if (x.hasOwnProperty('trElement')) {
        b.type = "command";
      } else {
        b.type = "comment";
      }
      return b;
    }
    /*jslint unparam:false */

    old_reset.call(this);
    // if htmlTestRunner is defined...
    if (!(htmlTestRunner === undefined || htmlTestRunner === null)) {
      //TODO: map commands to real types instead of faking it
      htmlTestRunner.currentTest.commands = map_list(htmlTestRunner.currentTest.htmlTestCase.getCommandRows(), importCommands);
      // AJS: initializes private testCase (closure) to point to htmlTestRunner.currentTest (public testCase is not available under Core).
      globalContext.testCase = htmlTestRunner.currentTest;
      // the debugContext isn't there, but redirecting to the testCase seems to work.
      globalContext.testCase.debugContext = globalContext.testCase;
    }
  };
}

function patchServerEnvironment() {
  "use strict";

  if (globalContext.scriptServerPatchApplied !== true) {
    globalContext.testCase = {};
    HtmlRunnerTestLoop.prototype.old_initialize = HtmlRunnerTestLoop.prototype.initialize;
    HtmlRunnerTestLoop.prototype.initialize = function (htmlTestCase, metrics, seleniumCommandFactory) {
      this.old_initialize(htmlTestCase, metrics, seleniumCommandFactory);
      this.commands = [];
    };
  }
  seleniumResetInterceptor();
  globalContext.serverPatchApplied = true;
}

// There's an option to use user-extensions.js in the IDE
// but it runs the tests against the webdriver backed selenium
// which is a different API than the one that tests are written against...
if ((globalContext.onServer === true) && (globalContext.serverPatchApplied === false)) {
  patchServerEnvironment();
}

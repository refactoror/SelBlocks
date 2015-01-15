/*jslint
 indent:2
,maxerr:500
,plusplus:true
,white:true
,nomen:true
 */
/*globals
HtmlRunnerTestLoop:true,
Selenium:true,
htmlTestRunner:true
 */
(function($$){
  $$.seleniumEnv = "server";
  $$.globalContext.serverPatchApplied = $$.globalContext.serverPatchApplied || false;

  if (!$$.globalContext.serverPatchApplied) {
    $$.fn.interceptAfter(Selenium.prototype, "reset", initTestCase);
    $$.globalContext.serverPatchApplied = true;
  }

  // Selenium Core does not have the testCase object
  // but the currentTest object can be extended for our purposes
  function initTestCase()
  {
    if (!!htmlTestRunner) {
      // TBD: map commands to real types instead of faking it
      htmlTestRunner.currentTest.commands = mapCommands(htmlTestRunner.currentTest.htmlTestCase.getCommandRows());
      $$.globalContext.testCase = htmlTestRunner.currentTest;
      // debugContext isn't on this object, but redirecting to the currentTest seems to work
      $$.globalContext.testCase.debugContext = htmlTestRunner.currentTest;
      Object.defineProperties($$.globalContext.testCase, {
        "_nextCommandRowIndex" : {
          writable : true
        }
        ,"debugIndex" : {
          enumerable : true
          ,get : function () { return this._nextCommandRowIndex; }
          ,set : function (idx) { this._nextCommandRowIndex = idx; }
        }
        ,"nextCommandRowIndex" : {
          enumerable : true
          ,get : function () { return this._nextCommandRowIndex; }
          ,set : function (idx) { this._nextCommandRowIndex = idx; }
        }
      });
    }

    function mapCommands(cmdRows) {
      var mappedCmds = [];
      for (var i = 0; i < cmdRows.length; ++i) {
        mappedCmds.push(importCommand(cmdRows[i]));
      }
      return mappedCmds;
    }

    function importCommand(cmdRow) {
      var cmd = cmdRow.getCommand();
      if (cmdRow.hasOwnProperty("trElement")) {
        cmd.type = "command";
      } else {
        cmd.type = "comment";
      }
      return cmd;
    }
  }
}(selblocks));
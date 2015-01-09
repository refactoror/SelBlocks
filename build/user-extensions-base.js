// To use Selblocks commands in Selenium Server, provide this file on the command line.
// Eg: -userExtensions "C:\somewhere\user-extensions.js"

/*jslint
indent:2,
maxerr:500,
plusplus:true
 */
(function($$){
  $$.onServer = $$.onServer || true;
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
          configurable : false,
          enumerable : false,
          writable : true,
          value : undefined
        },
        "debugIndex" : {
          get : function () { return this._nextCommandRowIndex; },
          set : function (x) { this._nextCommandRowIndex = x; },
          configurable : false,
          enumerable : true
        },
        "nextCommandRowIndex" : {
          get : function () { return this._nextCommandRowIndex; },
          set : function (x) { this._nextCommandRowIndex = x; },
          configurable : false,
          enumerable : true
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
      if (cmdRow.hasOwnProperty('trElement')) {
        cmd.type = "command";
      } else {
        cmd.type = "comment";
      }
      return cmd;
    }
  }
}(selblocks));
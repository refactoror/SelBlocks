/*jslint
 indent:2
,maxerr:500
,plusplus:true
,white:true
,nomen:true
*/
/*globals
Selenium:true,
htmlTestRunner:true
*/
(function($$){
  $$.seleniumEnv = "server";
  // this flag is global so that SelBlocks and SelBench can be used together
  $$.globalContext.serverPatchApplied = $$.globalContext.serverPatchApplied || false;

  if (!$$.globalContext.serverPatchApplied) {
    $$.fn.interceptAfter(Selenium.prototype, "reset", initTestCase);
    $$.globalContext.serverPatchApplied = true;
  }

  // Selenium Core does not have the testCase object
  // but the currentTest object can be extended for our purposes
  function initTestCase()
  {
    if (!(typeof htmlTestRunner === "undefined" || htmlTestRunner === null)) {
      // TBD: map commands to real types instead of faking it
      htmlTestRunner.currentTest.commands = mapCommands(htmlTestRunner.currentTest.htmlTestCase.getCommandRows());
      $$.globalContext.testCase = htmlTestRunner.currentTest;
      // debugContext isn't on this object, but redirecting to the currentTest seems to work
      $$.globalContext.testCase.debugContext = htmlTestRunner.currentTest;
      // define pseudo properties with getters/setters on a hidden property,
      // so that they both maintain the same value.
      Object.defineProperties($$.globalContext.testCase, {
        "_nextCommandRowIndex" : {
          writable : true
        }
        ,"debugIndex" : { // for IDE
          enumerable : true
          ,get : function () { return this._nextCommandRowIndex; }
          ,set : function (idx) { this._nextCommandRowIndex = idx; }
        }
        ,"nextCommandRowIndex" : { // for Selenium Server
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
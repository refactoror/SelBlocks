/**
 * SelBlocks 1.5
 *
 * Provides commands for Javascript-like looping and callable functions,
 *   with scoped variables, and XML driven parameterization.
 *
 * (Selbock installs as a Core Extension, not an IDE Extension, because it manipulates the Selenium object)
 *
 * Features:
 *  - Commands: if/else, loadVars/loadJsonVars, forXml/forJson, foreach, for, while, call/script/return
 *  - Script and loop parameters create regular Selenium variables that are local to the block,
 *    overriding variables of the same name, and that are restored when the block exits.
 *  - Variables can be set via external XML/JSON data file(s).
 *  - Command parameters are Javascript expressions that are evaluated with the Selenium
 *    variables in scope, which can therefore be referenced by their simple names, e.g.: i+1
 *  - A script definition can appear anywhere; they are skipped over in normal execution flow.
 *  - Script functions can be invoked recursively.
 *
 * Concept of operation:
 *  - selenium.reset() is intercepted to initialize the block structures.
 *  - testCase.nextCommand() is overridden for flow branching.
 *  - The static structure of commands & blocks is stored in cmdAttrs[] by command index, (ie, script line number).
 *  - The execution state of blocks is pushed onto cmdStack, with a separate instance for each callStack frame.
 *
 * Limitations:
 *  - Incompatible with flowControl (and derivatives), because they unilaterally override selenium.reset().
 *    Known to have this issue:
 *      selenium_ide__flow_control-1.0.1-fx.xpi
 *      goto_while_for_ide.js
 *
 * Acknowledgements:
 *  SelBlocks reuses bits & parts of extensions: flowControl, datadriven, and include.
 *
 * Wishlist:
 *  - try/catch
 *  - switch/case
 *  - exitTest
 *  - enforce block boundaries (jumping in-to/out-of the middle of blocks)
 *
 * Changes since 1.3.1:
 *  - New commands: loadJsonVars & forJson
 *  - Expression parsing is more robust, specifically for & call list values
 *  - Variable and parameter names are validated for alphanumeric conventions
 *  - Selblocks logging now identifies itself with the prefix [Selblocks]
 *  - Internal functions & vars no longer pollute the global Javascript name space
 *
 * NOTE - The Stored Variables Viewer addon will display the values of Selblocks parameters,
 *   because they are implemented as regular Selenium variables.
 *   The only thing special about Selblocks parameters is that they are activated and deactivated
 *   as script execution flows into and out of blocks, eg, for/endFor, script/endScript, etc.
 *   So this can provide a convenient way to monitor the progress of an executing script.
 */

// =============== global functions as script helpers ===============
// getEval script helpers

// Find an element via locator independent of any selenium commands
// (findElementOrNull returns the first if there are multiple matches)
function $e(locator) {
  return sb.unwrapObject(selenium.browserbot.findElementOrNull(locator));
}

// Return the singular XPath result as a value of the appropriate type
function $x(xpath, contextNode, resultType) {
  var doc = selenium.browserbot.getDocument();
  var node;
  if (resultType)
    node = sbx.selectNode(doc, xpath, contextNode, resultType); // mozilla engine only
  else
    node = sbx.selectElement(selenium.browserbot, doc, xpath, contextNode);
  return node;
}

// Return the XPath result set as an array of elements
function $X(xpath, contextNode, resultType) {
  var doc = selenium.browserbot.getDocument();
  var nodes;
  if (resultType)
    nodes = sbx.selectNodes(doc, xpath, contextNode, resultType); // mozilla engine only
  else
    nodes = sbx.selectElements(selenium.browserbot, doc, xpath, contextNode);
  return nodes;
}

(function(){

  // =============== Javascript extensions as script helpers ===============

  // eg: "dilbert".isOneOf("dilbert","dogbert","mordac") => true
  String.prototype.isOneOf = function(values)
  {
    if (!(values instanceof Array)) // copy function arguments into an array
      values = Array.prototype.slice.call(arguments);
    for (var i = 0; i < this.length; i++) {
      if (values[i] == this) {
        return true;
      }
    }
    return false;
  };

  // eg: "red".mapTo("primary", ["red","green","blue"]) => primary
  String.prototype.mapTo = function(/* pairs of: string, array */)
  {
    var errMsg = " The map function requires pairs of argument: string, array";
    assert(arguments.length % 2 == 0, errMsg + "; found " + arguments.length);
    for (var i = 0; i < arguments.length; i += 2) {
      assert((typeof arguments[i].toLowerCase() == "string") && (arguments[i+1] instanceof Array),
        errMsg + "; found " + typeof arguments[i] + ", " + typeof arguments[i+1]);
      if (this.isOneOf(arguments[i+1])) {
        return arguments[i];
      }
    }
    return this;
  };


  //=============== Command Stack handling ===============

  var symbols = {}; // command indexes stored by name: function names
  var cmdAttrs = new CmdAttrs();  // static command attributes stored by command index
  var callStack;    // command execution stack

  function hereIdx() {
    return testCase.debugContext.debugIndex;
  }

  // Command attributes, stored by command index
  function CmdAttrs() {
    var cmds = [];
    cmds.init = function(i, attrs) {
      cmds[i] = attrs || {};
      cmds[i].idx = i;
      cmds[i].cmdName = testCase.commands[i].command;
      return cmds[i];
    };
    cmds.here = function() {
      var curIdx = hereIdx();
      if (!cmds[curIdx])
        sb.LOG.warn("No cmdAttrs defined curIdx=" + curIdx);
      return cmds[curIdx];
    };
    return cmds;
  }

  // An Array object with stack functionality
  function Stack() {
    var stack = [];
    stack.isEmpty = function() { return stack.length == 0; };
    stack.top = function()     { return stack[stack.length-1]; };
    stack.find = function(_testfunc) { return stack[stack.indexWhere(_testfunc)]; };
    stack.indexWhere = function(_testfunc) { // undefined if not found
      for (var i = stack.length-1; i >= 0; i--) {
        if (_testfunc(stack[i]))
          return i;
      }
    };
    stack.unwindTo = function(_testfunc) {
      while (!_testfunc(stack.top()))
        stack.pop();
      return stack.top();
    };
    stack.isHere = function() {
      return (stack.length > 0 && stack.top().idx == hereIdx());
    };
    return stack;
  }

  // Determine if the given stack frame is one of the loop blocks
  Stack.isLoopBlock = function(stackFrame) {
    return (cmdAttrs[stackFrame.idx].blockNature == "loop");
  };


  // Flow control - we don't just alter debugIndex on the fly, because the command
  // preceding the destination would falsely get marked as successfully executed
  var branchIdx = null;
  // TBD: this needs to be revisited if testCase.nextCommand() ever changes
  // (current as of: selenium-ide-2.2.0)
  function nextCommand() {
    if (!this.started) {
      this.started = true;
      this.debugIndex = testCase.startPoint ? testCase.commands.indexOf(testCase.startPoint) : 0;
    }
    else {
      if (branchIdx != null) {
        sb.LOG.info("branch => " + fmtCmdRef(branchIdx));
        this.debugIndex = branchIdx;
        branchIdx = null;
      }
      else
        this.debugIndex++;
    }
    // skip over comments
    for (; this.debugIndex < testCase.commands.length; this.debugIndex++) {
      var command = testCase.commands[this.debugIndex];
      if (command.type == "command") {
        return command;
      }
    }
    return null;
  }
  function setNextCommand(cmdIdx) {
    assert(cmdIdx >= 0 && cmdIdx < testCase.commands.length,
      " Cannot branch to non-existent command @" + (cmdIdx+1));
    branchIdx = cmdIdx;
  }

  // Tail intercept of Selenium.prototype.reset()
  (function () { // private scope for orig_reset
    // called when Selenium IDE opens / on Dev Tools [Reload] button / upon first command execution
    var orig_reset = Selenium.prototype.reset;
    Selenium.prototype.reset = function() {// this: selenium
      // called before each: execute a single command / run a testcase / run each testcase in a testsuite
      orig_reset.call(this);
      sb.LOG.trace("In tail intercept :: selenium.reset()");

      // TBD: skip during single command execution
      try {
        compileSelBlocks();
      }
      catch (err) {
        notifyFatalErr("In " + err.fileName + " @" + err.lineNumber + ": " + err);
      }
      callStack = new Stack();
      callStack.push({ cmdStack: new Stack() }); // top-level execution state

      // custom flow control logic
      // this is called before: execute a single command / run a testcase / run each testcase in a testsuite
      // TBD: this should be a tail intercept rather than brute force replace
      sb.LOG.debug("Configuring tail intercept: testCase.debugContext.nextCommand()");
      testCase.debugContext.nextCommand = nextCommand;
    };
  })();


  // ================================================================================
  // Assemble block relationships and symbol locations
  function compileSelBlocks()
  {
    var lexStack = new Stack();
    for (var i = 0; i < testCase.commands.length; i++)
    {
      if (testCase.commands[i].type == "command")
      {
        var curCmd = testCase.commands[i].command;
        var aw = curCmd.indexOf("AndWait");
        if (aw != -1) {
          // just ignore the suffix for now, this may or may not be a Selblocks commands
          curCmd = curCmd.substring(0, aw);
        }
        var cmdTarget = testCase.commands[i].target;

        switch(curCmd)
        {
          case "label":
            assertNotAndWaitSuffix(i);
            symbols[cmdTarget] = i;
            break;
          case "goto": case "gotoIf": case "skipNext":
            assertNotAndWaitSuffix(i);
            break;

          case "if":
            assertNotAndWaitSuffix(i);
            lexStack.push(cmdAttrs.init(i));
            break;
          case "else":
            assertNotAndWaitSuffix(i);
            assertBlockIsPending("if", i, ", is not valid outside of an if/endIf block");
            var ifAttrs = lexStack.top();
            assertMatching(ifAttrs.cmdName, "if", i, ifAttrs.idx);
            cmdAttrs.init(i, { ifIdx: ifAttrs.idx }); // else -> if
            cmdAttrs[ifAttrs.idx].elseIdx = i;        // if -> else
            break;
          case "endIf":
            assertNotAndWaitSuffix(i);
            assertBlockIsPending("if", i);
            var ifAttrs = lexStack.pop();
            assertMatching(ifAttrs.cmdName, "if", i, ifAttrs.idx);
            cmdAttrs.init(i, { ifIdx: ifAttrs.idx }); // endIf -> if
            cmdAttrs[ifAttrs.idx].endIdx = i;         // if -> endif
            if (ifAttrs.elseIdx)
              cmdAttrs[ifAttrs.elseIdx].endIdx = i;   // else -> endif
            break;

        case "while":    case "for":    case "foreach":    case "forXml":    case "forJson":
            assertNotAndWaitSuffix(i);
            lexStack.push(cmdAttrs.init(i, { blockNature: "loop" }));
            break;
          case "continue": case "break":
            assertNotAndWaitSuffix(i);
            assertCmd(i, lexStack.find(Stack.isLoopBlock), ", is not valid outside of a loop");
            cmdAttrs.init(i, { hdrIdx: lexStack.top().idx }); // -> header
            break;
        case "endWhile": case "endFor": case "endForeach": case "endForXml": case "endForJson":
            assertNotAndWaitSuffix(i);
            var expectedCmd = curCmd.substr(3).toLowerCase();
            assertBlockIsPending(expectedCmd, i);
            var hdrAttrs = lexStack.pop();
            assertMatching(hdrAttrs.cmdName.toLowerCase(), expectedCmd, i, hdrAttrs.idx);
            cmdAttrs[hdrAttrs.idx].ftrIdx = i;          // header -> footer
            cmdAttrs.init(i, { hdrIdx: hdrAttrs.idx }); // footer -> header
            break;

        case "loadVars": case "loadJsonVars":
            assertNotAndWaitSuffix(i);
            break;

          case "call":
            assertNotAndWaitSuffix(i);
            cmdAttrs.init(i);
            break;
          case "script":
            assertNotAndWaitSuffix(i);
            symbols[cmdTarget] = i;
            lexStack.push(cmdAttrs.init(i, { name: cmdTarget }));
            break;
          case "return":
            assertNotAndWaitSuffix(i);
            assertBlockIsPending("script", i, ", is not valid outside of a script/endScript block");
            var scrpt = lexStack.find(function(attrs) { return (attrs.cmdName == "script"); });
            cmdAttrs.init(i, { scrIdx: scrpt.idx });    // return -> script
            break;
          case "endScript":
            assertNotAndWaitSuffix(i);
            assertBlockIsPending("script", i);
            var scrAttrs = lexStack.pop();
            assertMatching(scrAttrs.cmdName, "script", i, scrAttrs.idx);
            if (cmdTarget)
              assertMatching(scrAttrs.name, cmdTarget, i, scrAttrs.idx); // match-up on script name
            cmdAttrs[scrAttrs.idx].endIdx = i;          // script -> endscript
            cmdAttrs.init(i, { scrIdx: scrAttrs.idx }); // endScript -> script
            break;
          default:
        }
      }
    }
    while (!lexStack.isEmpty()) {
      // unterminated block(s)
      var pend = lexStack.pop();
      var expectedCmd = "end" + pend.cmdName.substr(0, 1).toUpperCase() + pend.cmdName.substr(1);
      throw new Error(fmtCmdRef(pend.idx) + ", without a terminating [" + expectedCmd + "]");
    }
    //- command validation
    function assertNotAndWaitSuffix(cmdIdx) {
      assertCmd(cmdIdx, (testCase.commands[cmdIdx].command.indexOf("AndWait") == -1),
        ", AndWait suffix is not valid for Selblocks commands");
    }
    //- active block validation
    function assertBlockIsPending(expectedCmd, cmdIdx, desc) {
      assertCmd(cmdIdx, !lexStack.isEmpty(), desc || ", without an beginning [" + expectedCmd + "]");
    }
    //- command-pairing validation
    function assertMatching(curCmd, expectedCmd, cmdIdx, pendIdx) {
      assertCmd(cmdIdx, curCmd == expectedCmd, ", does not match command " + fmtCmdRef(pendIdx));
    }
  }

  // ==================== Selblocks Commands (Custom Selenium Actions) ====================

  var commandNames = [];
  var iexpr = Object.create(sb.InfixExpressionParser);

  // validate variable/parameter names
  function validateNames(names, desc) {
    for (var i = 0; i < names.length; i++) {
      validateName(names[i], desc);
    }
  }
  function validateName(name, desc) {
    var match = name.match(/^[a-zA-Z]\w*$/);
    if (!match) {
      notifyFatal("Invalid character(s) in " + desc + " name: '" + name + "'");
    }
  }

  Selenium.prototype.doLabel = function() {
    // noop
  };
  commandNames.push("label");

  // Skip the next N commands (default is 1)
  Selenium.prototype.doSkipNext = function(spec)
  {
    assertRunning();
    var n = parseInt(evalWithVars(spec), 10);
    if (isNaN(n))
      n = 1;
    if (n != 0) // if n=0, execute the next command as usual
      setNextCommand(testCase.debugContext.debugIndex + n + 1);
  };

  Selenium.prototype.doGoto = function(label)
  {
    assertRunning();
    assert(symbols[label], " Target label '" + label + "' is not found.");
    setNextCommand(symbols[label]);
  };

  Selenium.prototype.doGotoIf = function(condExpr, label)
  {
    assertRunning();
    if (evalWithVars(condExpr))
      this.doGoto(label);
  };

  // ================================================================================
  Selenium.prototype.doIf = function(condExpr, locator)
  {
    assertRunning();
    var ifState = { idx: hereIdx() };
    callStack.top().cmdStack.push(ifState);
    if (evalWithVars(condExpr)) {
      ifState.skipElseBlock = true;
      // continue into if-block
    }
    else {
      // jump to else or endif
      var ifAttrs = cmdAttrs.here();
      if (ifAttrs.elseIdx)
        setNextCommand(ifAttrs.elseIdx);
      else
        setNextCommand(ifAttrs.endIdx);
    }
  };
  Selenium.prototype.doElse = function()
  {
    assertRunning();
    assertActiveCmd(cmdAttrs.here().ifIdx);
    var ifState = callStack.top().cmdStack.top();
    if (ifState.skipElseBlock)
      setNextCommand(cmdAttrs.here().endIdx);
  };
  Selenium.prototype.doEndIf = function() {
    assertRunning();
    assertActiveCmd(cmdAttrs.here().ifIdx);
    callStack.top().cmdStack.pop();
    // fall out of if-endIf
  };

  // ================================================================================
  Selenium.prototype.doWhile = function(condExpr)
  {
    enterLoop(
      function() {    // validate
          assert(condExpr, " 'while' requires a condition expression.");
          return null;
      }
      ,function() { } // initialize
      ,function() { return (evalWithVars(condExpr)); } // continue?
      ,function() { } // iterate
    );
  };
  Selenium.prototype.doEndWhile = function() {
    iterateLoop();
  };

  // ================================================================================
  Selenium.prototype.doFor = function(forSpec, localVarsSpec)
  {
    enterLoop(
      function(loop) { // validate
          assert(forSpec, " 'for' requires: <initial-val>; <condition>; <iter-stmt>.");
          var specs = iexpr.splitList(forSpec, ";");
          assert(specs.length == 3, " 'for' requires <init-stmt>; <condition>; <iter-stmt>.");
          loop.initStmt = specs[0];
          loop.condExpr = specs[1];
          loop.iterStmt = specs[2];
          var localVarNames = [];
          if (localVarsSpec) {
            localVarNames = iexpr.splitList(localVarsSpec, ",");
            validateNames(localVarNames, "variable");
          }
          return localVarNames;
      }
      ,function(loop) { evalWithVars(loop.initStmt); }          // initialize
      ,function(loop) { return (evalWithVars(loop.condExpr)); } // continue?
      ,function(loop) { evalWithVars(loop.iterStmt); }          // iterate
    );
  };
  Selenium.prototype.doEndFor = function() {
    iterateLoop();
  };

  // ================================================================================
  Selenium.prototype.doForeach = function(varName, valueExpr)
  {
    enterLoop(
      function(loop) { // validate
          assert(varName, " 'foreach' requires a variable name.");
          assert(valueExpr, " 'foreach' requires comma-separated values.");
          loop.values = evalWithVars("[" + valueExpr + "]");
          if (loop.values.length == 1 && loop.values[0] instanceof Array) {
            loop.values = loop.values[0]; // if sole element is an array, than use it
          }
          return [varName, "_i"];
      }
      ,function(loop) { loop.i = 0; storedVars[varName] = loop.values[loop.i]; }       // initialize
      ,function(loop) { storedVars._i = loop.i; return (loop.i < loop.values.length);} // continue?
      ,function(loop) { // iterate
          if (++(loop.i) < loop.values.length)
            storedVars[varName] = loop.values[loop.i];
      }
    );
  };
  Selenium.prototype.doEndForeach = function() {
    iterateLoop();
  };

  // ================================================================================
  Selenium.prototype.doLoadVars = function(xmlfile, selector)
  {
    assert(xmlfile, " 'loadVars' requires an XML file path or URL.");
    var xmlReader = new XmlReader(xmlfile);
    xmlReader.load(xmlfile);
    xmlReader.next(); // read first <vars> and set values on storedVars
    if (!selector && !xmlReader.EOF())
      notifyFatal("Multiple var sets not valid for 'loadVars'."
        + ' (A specific var set can be selected: name="value".)');

    var result = evalWithVars(selector);
    if (typeof result != "boolean")
      sb.LOG.warn(fmtCmdRef(hereIdx()) + ", " + selector + " is not a boolean expression");

    // read until specified set found
    var isEof = xmlReader.EOF();
    while (!isEof && evalWithVars(selector) != true) {
      xmlReader.next(); // read next <vars> and set values on storedVars
      isEof = xmlReader.EOF();
    }

    if (!evalWithVars(selector))
      notifyFatal("<vars> element not found for selector expression: " + selector
        + "; in XML input file " + xmlReader.xmlFilepath);
  };


  // ================================================================================
  Selenium.prototype.doLoadJsonVars = function(jsonFile, selector)
  {
    assert(jsonFile, " 'loadJsonVars' requires a JSON file path or URL.");
    var jsonReader = new JSONReader(jsonFile);
    jsonReader.load(jsonFile);
    jsonReader.next(); // read first json object and set values on storedVars
    if (!selector && !jsonReader.EOF())
      notifyFatal("Multiple json objects not valid for 'loadJsonVars'."
        + ' (A specific object can be selected: name="value".)');

    var result = evalWithVars(selector);
    if (typeof result != "boolean")
      sb.LOG.warn(fmtCmdRef(hereIdx()) + ", " + selector + " is not a boolean expression");

    // read until specified set found
    var isEof = jsonReader.EOF();
    while (!isEof && evalWithVars(selector) != true) {
      jsonReader.next(); // read next json object and set values on storedVars
      isEof = jsonReader.EOF();
    } 

    if (!evalWithVars(selector))
      notifyFatal("JSON element not found for selector expression: " + selector
        + "; in JSON input file " + jsonReader.jsonFilepath);
  };


  // ================================================================================
  Selenium.prototype.doForXml = function(xmlpath)
  {
    enterLoop(
      function(loop) {  // validate
          assert(xmlpath, " 'forXml' requires an xml file path or URL.");
          loop.xmlReader = new XmlReader();
          var localVarNames = loop.xmlReader.load(xmlpath);
          return localVarNames;
      }
      ,function() { }   // initialize
      ,function(loop) { // continue?
          var isEof = loop.xmlReader.EOF();
          if (!isEof) loop.xmlReader.next();
          return !isEof;
      }
      ,function() { }
    );
  };
  Selenium.prototype.doEndForXml = function() {
    iterateLoop();
  };



  // ================================================================================
  Selenium.prototype.doForJson = function(jsonpath)
  {
    enterLoop(
      function(loop) {  // validate
          assert(jsonpath, " 'forJson' requires a JSON file path or URL.");
          loop.jsonReader = new JSONReader();
          var localVarNames = loop.jsonReader.load(jsonpath);
          return localVarNames;
      }
      ,function() { }   // initialize
      ,function(loop) { // continue?
          var isEof = loop.jsonReader.EOF();
          if (!isEof) loop.jsonReader.next();
          return !isEof;
      }
      ,function() { }
    );
  };
  Selenium.prototype.doEndForJson = function() {
    iterateLoop();
  };


  // --------------------------------------------------------------------------------
  // Note: Selenium variable expansion occurs before command processing, therefore we re-execute
  // commands that *may* contain ${} variables. Bottom line, we can't just keep a copy
  // of parameters and then iterate back to the first command inside the body of a loop.

  function enterLoop(_validateFunc, _initFunc, _condFunc, _iterFunc)
  {
    assertRunning();
    var loopState;
    if (!callStack.top().cmdStack.isHere()) {
      // loop begins
      loopState = { idx: hereIdx() };
      callStack.top().cmdStack.push(loopState);
      var localVars = _validateFunc(loopState);
      loopState.savedVars = getVarState(localVars);
      initVarState(localVars); // because with-scope can reference storedVars only once they exist
      _initFunc(loopState);
    }
    else {
      // iteration
      loopState = callStack.top().cmdStack.top();
      _iterFunc(loopState);
    }

    if (!_condFunc(loopState)) {
      loopState.isComplete = true;
      // jump to bottom of loop for exit
      setNextCommand(cmdAttrs.here().ftrIdx);
    }
    // else continue into body of loop
  }
  function iterateLoop()
  {
    assertRunning();
    assertActiveCmd(cmdAttrs.here().hdrIdx);
    var loopState = callStack.top().cmdStack.top();
    if (loopState.isComplete) {
      restoreVarState(loopState.savedVars);
      callStack.top().cmdStack.pop();
      // done, fall out of loop
    }
    else {
      // jump back to top of loop
      setNextCommand(cmdAttrs.here().hdrIdx);
    }
  }

  // ================================================================================
  Selenium.prototype.doContinue = function(condExpr) {
    var loopState = dropToLoop(condExpr);
    if (loopState) {
      // jump back to top of loop for next iteration, if any
      var ftrCmd = cmdAttrs[loopState.idx];
      setNextCommand(cmdAttrs[ftrCmd.ftrIdx].hdrIdx);
    }
  };
  Selenium.prototype.doBreak = function(condExpr) {
    var loopState = dropToLoop(condExpr);
    if (loopState) {
      loopState.isComplete = true;
      // jump to bottom of loop for exit
      setNextCommand(cmdAttrs[loopState.idx].ftrIdx);
    }
  };

  // Unwind the command stack to the inner-most active loop block
  // (unless the optional condition evaluates to false)
  function dropToLoop(condExpr)
  {
    assertRunning();
    if (condExpr && !evalWithVars(condExpr))
      return;
    var activeCmdStack = callStack.top().cmdStack;
    var loopState = activeCmdStack.unwindTo(Stack.isLoopBlock);
    return loopState;
  }


  // ================================================================================
  Selenium.prototype.doCall = function(scrName, argSpec)
  {
    assertRunning(); // TBD: can we do single execution, ie, run from this point then break on return?
    var scrIdx = symbols[scrName];
    assert(scrIdx, " Script does not exist: " + scrName + ".");

    var callAttrs = cmdAttrs.here();
    var callFrame = callStack.top();
    if (callFrame.isReturning && callFrame.returnIdx == hereIdx()) {
      // returning from completed script
      restoreVarState(callStack.pop().savedVars);
    }
    else {
      // save existing variable state and set args as local variables
      var args = parseArgs(argSpec);
      var savedVars = getVarStateFor(args);
      setVars(args);

      callStack.push({ scrIdx: scrIdx, name: scrName, args: args, returnIdx: hereIdx(),
        savedVars: savedVars, cmdStack: new Stack() });
      // jump to script body
      setNextCommand(scrIdx);
    }
  };
  Selenium.prototype.doScript = function(scrName)
  {
    assertRunning();

    var scrAttrs = cmdAttrs.here();
    var callFrame = callStack.top();
    if (callFrame.scrIdx == hereIdx()) {
      // get parameter values
      setVars(callFrame.args);
    }
    else {
      // no active call, skip around script body
      setNextCommand(scrAttrs.endIdx);
    }
  };
  Selenium.prototype.doReturn = function(value) {
    returnFromScript(null, value);
  };
  Selenium.prototype.doEndScript = function(scrName) {
    returnFromScript(scrName);
  };

  function returnFromScript(scrName, returnVal)
  {
    assertRunning();
    var endAttrs = cmdAttrs.here();
    var callFrame = callStack.top();
    if (callFrame.scrIdx == endAttrs.scrIdx) {
      if (returnVal) storedVars._result = evalWithVars(returnVal);
      callFrame.isReturning = true;
      // jump back to call command
      setNextCommand(callFrame.returnIdx);
    }
    else {
      // no active call, we're just skipping around a script block
    }
  }


  // ========= storedVars management =========

  function evalWithVars(expr) {
    try {
      // EXTENSION REVIEWERS: Use of eval is consistent with the Selenium extension itself.
      // Scripted expressions run in the Selenium window, separate from browser windows.
      // Global functions are intentional features provided for use by end user's in their Selenium scripts.
      var result = eval("with (storedVars) {" + expr + "}");
    }
    catch (err) {
      notifyFatalErr(" While evaluating Javascript expression: " + expr, err);
    }
    return result;
  }

  function parseArgs(argSpec) { // comma-sep -> new prop-set
    var args = {};
    var parms = iexpr.splitList(argSpec, ",");
    for (var i = 0; i < parms.length; i++) {
      var keyValue = iexpr.splitList(parms[i], "=");
      validateName(keyValue[0], "parameter");
      args[keyValue[0]] = evalWithVars(keyValue[1]);
    }
    return args;
  }
  function initVarState(names) { // new -> storedVars(names)
    if (names) {
      for (var i = 0; i < names.length; i++) {
        if (!storedVars[names[i]])
          storedVars[names[i]] = null;
      }
    }
  }
  function getVarStateFor(args) { // storedVars(prop-set) -> new prop-set
    var savedVars = {};
    for (var varname in args) {
      savedVars[varname] = storedVars[varname];
    }
    return savedVars;
  }
  function getVarState(names) { // storedVars(names) -> new prop-set
    var savedVars = {};
    if (names) {
      for (var i = 0; i < names.length; i++) {
        savedVars[names[i]] = storedVars[names[i]];
      }
    }
    return savedVars;
  }
  function setVars(args) { // prop-set -> storedVars
    for (var varname in args) {
      storedVars[varname] = args[varname];
    }
  }
  function restoreVarState(savedVars) { // prop-set --> storedVars
    for (var varname in savedVars) {
      if (savedVars[varname] == undefined)
        delete storedVars[varname];
      else
        storedVars[varname] = savedVars[varname];
    }
  }

  // ========= error handling =========

  // TBD: make into throwable Errors
  function notifyFatalErr(msg, err) {
    sb.LOG.error("Error " + msg);
    sb.LOG.logStackTrace(err);
    throw err;
  }
  function notifyFatal(msg) {
    var err = new Error(msg);
    sb.LOG.error("Error " + msg);
    sb.LOG.logStackTrace(err);
    throw err;
  }
  function notifyFatalCmdRef(idx, msg) { notifyFatal(fmtCmdRef(idx) + msg); }
  function notifyFatalHere(msg) { notifyFatal(fmtCmdRef(hereIdx()) + msg); }

  function assertCmd(idx, cond, msg) { if (!cond) notifyFatalCmdRef(idx, msg); }
  function assert(cond, msg) { if (!cond) notifyFatalHere(msg); }
  // TBD: can we at least show result of expressions?
  function assertRunning() {
    assert(testCase.debugContext.started, " Command is only valid in a running script.");
  }
  function assertActiveCmd(expectedIdx) {
    var activeIdx = callStack.top().cmdStack.top().idx;
    assert(activeIdx == expectedIdx, " unexpected command, active command was " + fmtCmdRef(activeIdx));
  }

  function fmtCmdRef(idx) {
    return ("@" + (idx+1) + ": " + fmtCommand(testCase.commands[idx]));
  }
  function fmtCommand(cmd) {
    var c = cmd.command;
    if (cmd.target) c += "|" + cmd.target;
    if (cmd.value)  c += "|" + cmd.value;
    return '[' + c + ']';
  }

  //================= Javascript helpers ===============

  // Elapsed time, optional duration provides expiration
  function IntervalTimer(msDuration) {
    this.msStart = +new Date();
    this.getElapsed = function() { return (+new Date() - this.msStart); };
    this.hasExpired = function() { return (msDuration && this.getElapsed() > msDuration); };
    this.reset = function() { this.msStart = +new Date(); };
  }

  // Return a translated version of a string
  // given string args, translate each occurrence of characters in t1 with the corresponding character from t2
  // given array args, if the string occurs in t1, return the corresponding string from t2, else null
  String.prototype.translate = function(t1, t2)
  {
    assert(t1.constructor === t2.constructor, "translate() function requires arrays of the same type");
    assert(t1.length == t2.length, "translate() function requires arrays of equal size");
    if (t1.constructor === String) {
      var buf = "";
      for (var i = 0; i < this.length; i++) {
        var c = this.substr(i,1);
        for (var t = 0; t < t1.length; t++) {
          if (c == t1.substr(t,1)) {
            c = t2.substr(t,1);
            break;
          }
        }
        buf += c;
      }
      return buf;
    }
    else if (t1.constructor === Array) {
      for (var i = 0; i < t1.length; i++) {
        if (t1[i] == this)
          return t2[i];
      }
    }
    else
      assert(false, "translate() function requires arguments of type String or Array");
    return null;
  };

  // ==================== Data Files ====================
  // Adapted from the datadriven plugin
  // http://web.archive.org/web/20120928080130/http://wiki.openqa.org/display/SEL/datadriven

  function XmlReader()
  {
    var varsets = null;
    var varNames = null;
    var curVars = null;
    var varsetIdx = 0;

    // load XML file and return the list of var names found in the first <VARS> element
    this.load = function(filepath)
    {
      var fileReader = new FileReader();
      var fileUrl = urlFor(filepath);
      var xmlHttpReq = fileReader.getDocumentSynchronous(fileUrl);
      sb.LOG.info("Reading from: " + fileUrl);

      var fileObj = xmlHttpReq.responseXML; // XML DOM
      varsets = fileObj.getElementsByTagName("vars"); // HTMLCollection
      if (varsets == null || varsets.length == 0) {
        throw new Error("A <vars> element could not be loaded, or <testdata> was empty.");
      }

      curVars = 0;
      varNames = attrNamesFor(varsets[0]);
      return varNames;
    };

    this.EOF = function() {
      return (curVars == null || curVars >= varsets.length);
    };

    this.next = function()
    {
      if (this.EOF()) {
        sb.LOG.error("No more <vars> elements to read after element #" + varsetIdx);
        return;
      }
      varsetIdx++;
      sb.LOG.debug(varsetIdx + ") " + serializeXml(varsets[curVars]));  // log each name & value

      var expected = countAttrs(varsets[0]);
      var found = countAttrs(varsets[curVars]);
      if (found != expected) {
        throw new Error("Inconsistent <testdata> at <vars> element #" + varsetIdx
          + "; expected " + expected + " attributes, but found " + found + "."
          + " Each <vars> element must have the same set of attributes."
        );
      }
      setupStoredVars(varsets[curVars]);
      curVars++;
    };

    //- retrieve the names of each attribute on the given XML node
    function attrNamesFor(node) {
      var attrNames = [];
      var varAttrs = node.attributes; // NamedNodeMap
      for (var v = 0; v < varAttrs.length; v++) {
        attrNames.push(varAttrs[v].nodeName);
      }
      return attrNames;
    }

    //- determine how many attributes are present on the given node
    function countAttrs(node) {
      return node.attributes.length;
    }

    //- set selenium variables from given XML attributes
    function setupStoredVars(node) {
      var varAttrs = node.attributes; // NamedNodeMap
      for (var v = 0; v < varAttrs.length; v++) {
        var attr = varAttrs[v];
        if (null == varsets[0].getAttribute(attr.nodeName)) {
          throw new Error("Inconsistent <testdata> at <vars> element #" + varsetIdx
            + "; found attribute " + attr.nodeName + ", which does not appear in the first <vars> element."
            + " Each <vars> element must have the same set of attributes."
          );
        }
        storedVars[attr.nodeName] = attr.nodeValue;
      }
    }

    //- format the given XML node for display
    function serializeXml(node) {
      if (typeof XMLSerializer != "undefined")
        return (new XMLSerializer()).serializeToString(node) ;
      else if (node.xml) return node.xml;
      else throw "XMLSerializer is not supported or can't serialize " + node;
    }
  }


  function JSONReader()
  {
    var varsets = null;
    var varNames = null;
    var curVars = null;
    var varsetIdx = 0;

    // load JSON file and return the list of var names found in the first object
    this.load = function(filepath)
    {
      var fileReader = new FileReader();
      var fileUrl = urlFor(filepath);
      var xmlHttpReq = fileReader.getDocumentSynchronous(fileUrl);
      sb.LOG.info("Reading from: " + fileUrl);

      var fileObj = xmlHttpReq.responseText;
      varsets = eval(fileObj);
      if (varsets == null || varsets.length == 0) {
        throw new Error("A JSON object could not be loaded, or the file was empty.");
      }

      curVars = 0;
      varNames = attrNamesFor(varsets[0]);
      return varNames;
    };

    this.EOF = function() {
      return (curVars == null || curVars >= varsets.length);
    };

    this.next = function()
    {
      if (this.EOF()) {
        sb.LOG.error("No more JSON objects to read after object #" + varsetIdx);
        return;
      }
      varsetIdx++;
      sb.LOG.debug(varsetIdx + ") " + serializeJson(varsets[curVars]));  // log each name & value

      var expected = countAttrs(varsets[0]);
      var found = countAttrs(varsets[curVars]);
      if (found != expected) {
        throw new Error("Inconsistent JSON object #" + varsetIdx
          + "; expected " + expected + " attributes, but found " + found + "."
          + " Each JSON object must have the same set of attributes."
        );
      }
      setupStoredVars(varsets[curVars]);
      curVars++;
    };

    //- retrieve the names of each attribute on the given object
    function attrNamesFor(obj) {
      var attrNames = [];
      for (var attrName in obj)
        attrNames.push(attrName);
      return attrNames;
    }

    //- determine how many attributes are present on the given obj
    function countAttrs(obj) {
      var n = 0;
      for (var attrName in obj) n++;
      return n;
    }

    //- set selenium variables from given JSON attributes
    function setupStoredVars(obj) {
      for (var attrName in obj) {
        if (null == varsets[0][attrName]) {
          throw new Error("Inconsistent JSON at object #" + varsetIdx
            + "; found attribute " + attrName + ", which does not appear in the first JSON object."
            + " Each JSON object must have the same set of attributes."
          );
        }
        storedVars[attrName] = obj[attrName];
      }
    }

    //- format the given JSON object for display
    function serializeJson(obj) {
      var json = uneval(obj);
      return json.substring(1, json.length-1);
    }
  }

  function urlFor(filepath) {
    var URL_PFX = "file://";
    var url = filepath;
    if (filepath.substring(0, URL_PFX.length).toLowerCase() != URL_PFX) {
      testCasePath = testCase.file.path.replace("\\", "/", "g");
      var i = testCasePath.lastIndexOf("/");
      url = URL_PFX + testCasePath.substr(0, i) + "/" + filepath;
    }
    return url;
  }


  // ==================== File Reader ====================
  // Adapted from the include4ide plugin

  function FileReader() {}

  FileReader.prototype.prepareUrl = function(url) {
    var absUrl;
    // htmlSuite mode of SRC? TODO is there a better way to decide whether in SRC mode?
    if (window.location.href.indexOf("selenium-server") >= 0) {
      sb.LOG.debug("FileReader() is running in SRC mode");
      absUrl = absolutify(url, htmlTestRunner.controlPanel.getTestSuiteName());
    } else {
      absUrl = absolutify(url, selenium.browserbot.baseUrl);
    }
    sb.LOG.debug("FileReader() using URL to get file '" + absUrl + "'");
    return absUrl;
  };

  FileReader.prototype.getDocumentSynchronous = function(url) {
    var absUrl = this.prepareUrl(url);
    var requester = this.newXMLHttpRequest();
    if (!requester) {
      throw new Error("XMLHttp requester object not initialized");
    }
    requester.open("GET", absUrl, false); // synchronous (we don't want selenium to go ahead)
    try {
      requester.send(null);
    } catch(e) {
      throw new Error("Error while fetching URL '" + absUrl + "':: " + e);
    }
    if (requester.status != 200 && requester.status !== 0) {
      throw new Error("Error while fetching " + absUrl
        + " server response has status = " + requester.status + ", " + requester.statusText );
    }
    return requester;
  };

  FileReader.prototype.newXMLHttpRequest = function() {
    var requester = 0;
    var exception = '';
    try {
      // for IE/ActiveX
      if (window.ActiveXObject) {
        try {      requester = new ActiveXObject("Msxml2.XMLHTTP"); }
        catch(e) { requester = new ActiveXObject("Microsoft.XMLHTTP"); }
      }
      // Native XMLHttp
      else if (window.XMLHttpRequest) {
        requester = new XMLHttpRequest();
      }
    }
    catch(e) {
      throw new Error("Your browser has to support XMLHttpRequest in order to read data files\n" + e);
    }
    return requester;
  };

}());

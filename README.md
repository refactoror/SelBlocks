# SelBlocks 2

SelBlocks is a language extension for Selenese that works on both the Selenium IDE and Selenium standalone server. It allows intelligent, data driven, tests to be recorded and composed in Selenium IDE, then run on any browser supported by Selenium server. With SelBlocks there is no need to translate the tests into another language at all! Experience web application testing and automation that's so easy a child could do it. Seriously, we've taught kids how to use this.

> My eight year old nephew's eyes got huge when he said *"You mean I can click __all__ the buttons?"* and I told him yes. Then showed him how to do it.
> -- Kastor

## Features

* Variables can be configured via external XML and/or JSON files.
* Functions are namespaced. They can be defined in test libraries, then called from any test case in the suite with `testCaseTitle.functionName`.
* Command parameters are javascript expressions that are evaluated with Selenium variables in scope, which can therefore be referenced by their simple names, e.g.: <tt>i+1</tt>
* A function definition can appear anywhere, (they are skipped over in normal execution flow).
* Functions can be called recursively.
* Function and loop parameters use regular Selenium variables that are local to the block, overriding variables of the same name, and that are restored when the block exits.
* Adds the following control structures to Selenese:
  * <code>if</code>, <code>elseIf</code>, <code>else</code>
  * <code>try</code>, <code>catch</code>, <code>finally</code>, <code>throw</code>
  * <code>for</code>, <code>foreach</code>, <code>while</code>, <code>continue</code>, <code>break</code>
  * <code>call</code>, <code>function</code>, <code>return</code>
  * <code>goto</code>, <code>gotoIf</code>, <code>label</code>, <code>skipNext</code>
  * <code>forJson</code>, <code>forXml</code>
  * <code>exitTest</code>
* Adds the following variable declarators to Selenese:
  * *Scoped `store` command*
    * <code>storeLocal</code> : stores variables in the current block scope, the builtin `store` command now creates local variables as well.
    * <code>storeGlobal</code> : stores variables in global scope
    * <code>storeAt</code> : stores variable values in the parent scope where they were defined, or creates a global variable if no parent scope defined it.
    * <code>loadJsonVars</code> : creates variables in the current block scope, as defined by the given JSON file or URL.
    * <code>loadXmlVars</code> : creates variables in the current block scope, as defined by the given XML file or URL.
  * *Scoped storeEval* : built in Selenese command, storeEval stores the result of evaluating the given javascript.
    * SelBlocks adds : <code>storeEvalLocal</code>, <code>storeEvalGlobal</code>, and <code>storeEvalAt</code>
  * *Scoped storeText* : stores the text of the located element.
    * SelBlocks adds : <code>storeLocalText</code>, <code>storeGlobalText</code>, and <code>storeAtText</code>
  * *Scoped storeAttribute* : stores the value of the located attribute.
    * SelBlocks adds : <code>storeLocalAttribute</code>, <code>storeGlobalAttribute</code>, and <code>storeAtAttribute</code>

## Installation

The [Firefox installer](https://addons.mozilla.org/en-US/firefox/addon/selenium-ide-sel-blocks/) is available from the firefox addons site, or just search for it in your addons menu.

The Selenium server extension file is in "/user extension/user-extensions.js". Grab a copy and follow the directions in the SeleniumHTMLRunner.cmd file.

## Documentation

Find the docs at http://refactoror.wikia.com/wiki/Selblocks_Reference

## Author

* [Chris Noe](https://github.com/refactoror)

## Contributors

* [Matthew Kastor](https://github.com/matthewkastor)

If you would like to contribute code to SelBlocks, you can do so by forking this project, and then submitting a pull request. Contributed code must be able to pass the full test suite, and should include additional tests to prove the correctness of the new or modified code.

Note that SelBlocks is a stand-alone Selenium extension. However, the SelBlocks test suite requires [SelBench](https://addons.mozilla.org/en-US/firefox/addon/selenium-ide-selbench/).

SelBlocks 2
=========

SelBlocks is a language extension for Selenium IDE

It provides Selenium commands for javascript-like conditionals, looping, callable functions, error catching, and JSON/XML driven parameterization.

Features

* Adds the following control structures to Selenese:
  * <code>if</code>, <code>elseIf</code>, <code>else</code>
  * <code>try</code>, <code>catch</code>, <code>finally</code>, <code>throw</code>
  * <code>for</code>, <code>foreach</code>, <code>while</code>, <code>continue</code>, <code>break</code>
  * <code>call</code>, <code>function</code>, <code>return</code>
  * <code>loadJsonVars</code>, <code>loadXmlVars</code>, <code>forJson</code>, <code>forXml</code>
  * <code>exitTest</code>
* Function and loop parameters use regular Selenium variables that are local to the block, overriding variables of the same name, and that are restored when the block exits.
* Command parameters are javascript expressions that are evaluated with Selenium variables in scope, which can therefore be referenced by their simple names, e.g.: <tt>i+1</tt>
* Variables can be configured via external XML and/or JSON files.
* A function definition can appear anywhere, (they are skipped over in normal execution flow).
* Functions can be called recursively.

[Firefox Installer](https://addons.mozilla.org/en-US/firefox/addon/selenium-ide-sel-blocks/) / [Documentation](http://refactoror.wikia.com/wiki/Selblocks_Reference)

Contributors

If you would like to contribute code to SelBlocks, you can do so by forking this project, and then submitting a pull request. Contributed code must be able to pass the full test suite, and should include additional tests to prove the correctness of the new or modified code.

Note that SelBlocks is a stand-alone Selenium extension. However, the SelBlocks test suite requires [SelBench](https://addons.mozilla.org/en-US/firefox/addon/selenium-ide-selbench/).

// selbocks name-space
(function($$){
  /* This function replaces native Selenium command handling while inside a try block.
   * (See TestLoop.prototype.resume() in chrome/content/selenium-core/scripts/selenium-executionloop.js.)
   * Command processing is altered so that catch and/or finally processing is initiated upon error.
   */
  $$.handleAsTryBlock = function()
  {
    try {
      selenium.browserbot.runScheduledPollers();
      this._executeCurrentCommand();
      if (this.result.failed && isManaged(this.result)) {
        // a failed verify command has activated catch/finally bubbling
        this.continueTest();
      }
      else {
        // normal Selenium behavior
        this.continueTestWhenConditionIsTrue();
      }
    } catch (e) {
      if (isManaged(e)) {
        // a caught error has activated catch/finally bubbling
        this.continueTest();
      }
      else {
        // normal Selenium behavior
        if (!this._handleCommandError(e)) {
          // command is marked in red, and overall test status is failed
          this.testComplete();
        } else {
          // error has been otherwise handled by TestLoop.prototype._handleCommandError()
          // (not sure what the possibilities are, other than stopping and failing the script)
          this.continueTest();
        }
      }
    }

    function isManaged(e) {
      var interceptFrame = $$.fn.getInterceptTop();
      if (e.constructor.name == "AssertResult") {
        e = new Error(e.failureMessage);
      }
      return (interceptFrame && interceptFrame.attrs.manageError(e));
    }
  };

}(selblocks));

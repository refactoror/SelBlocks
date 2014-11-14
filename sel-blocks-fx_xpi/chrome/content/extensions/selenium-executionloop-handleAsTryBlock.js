// selbocks name-space
(function($$){
  /* This function replaces native Selenium command handling while inside a try block.
   * (See TestLoop.prototype.resume() in selenium-executionloop.js.)
   * Command processing is altered so that catch and/or finally processing is initiated upon error.
   */
  $$.handleAsTryBlock = function()
  {
    try {
      selenium.browserbot.runScheduledPollers();
      this._executeCurrentCommand();
      this.continueTestWhenConditionIsTrue();
    }
    catch (e) {
      var interceptFrame = $$.fn.getInterceptTop();
      var isManaged = (interceptFrame && interceptFrame.attrs.manageError(e));
      if (isManaged) {
        this.continueTest();
      }
      else {
        this._handleCommandError(e); // marks command as failed (red), and overall test as failed
        this.testComplete();
      }
    }
  };

}(selblocks));

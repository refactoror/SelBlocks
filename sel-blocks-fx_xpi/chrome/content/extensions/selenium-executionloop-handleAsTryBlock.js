// selbocks name-space
(function($$){
  /* This function replaces native Selenium command handling while inside a try block.
   */
  $$.handleAsTryBlock = function()
  {
    try {
      selenium.browserbot.runScheduledPollers();
      this._executeCurrentCommand();
      this.continueTestWhenConditionIsTrue();
    } catch (e) {
      var isHandled = this._handleCommandError(e); // causes command to be marked in red
      var handlerAttrs = $$.fn.getInterceptAttrs();
      var isManaged = handlerAttrs.handleError(e);
      if (isManaged) {
        this.continueTest();
      } else {
        this.testComplete();
      }
    }
  };

}(selblocks));

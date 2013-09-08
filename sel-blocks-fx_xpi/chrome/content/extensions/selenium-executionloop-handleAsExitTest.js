/* This function replaces native Selenium command handling for the exitScript command.
 * This alters command processing such that the script simply halts rather executing the next command.
 */
// selbocks name-space
(function(_){
  _.handleAsExitTest = function()
  {
    _.popFn(); // un-intercept TestLoop.resume
    try {
      selenium.browserbot.runScheduledPollers();
      this.testComplete();
    } catch (e) {
      // seems highly unlikely that there would be an error in this very simple case
      this._handleCommandError(e);
      this.testComplete();
    }
    _.LOG.info("TEST HALTED");
  };
}(selblocks));

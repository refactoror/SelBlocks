/* This function replaces native Selenium command handling for the exitScript command.
 * This alters command completion so that the script will halt.
 */
// selbocks name-space
(function(_){
  _.handleAsExitTest = function()
  {
    _.popFn(); // un-intercept TestLoop.resume
    try {
      selenium.browserbot.runScheduledPollers();
      this.testComplete();
      _.LOG.warn("TEST HALTED");
    } catch (e) {
      // seems highly unlikely that there would be an error in this very simple case
      this._handleCommandError(e);
      this.testComplete();
    }
  };
}(selblocks));

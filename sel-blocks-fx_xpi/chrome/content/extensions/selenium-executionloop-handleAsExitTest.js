// selbocks name-space
(function($$){
  /* This function replaces native Selenium command-handling for the exitScript command.
   * (See TestLoop.prototype.resume() in chrome/content/selenium-core/scripts/selenium-executionloop.js.)
   * This causes the script to simply halt rather continuing on to the next command.
   */
  $$.handleAsExitTest = function()
  {
    try {
      selenium.browserbot.runScheduledPollers();
      this.testComplete();
    }
    catch (e) {
      // seems highly unlikely that there would be an error in this very simple case
      this._handleCommandError(e); // marks command as failed (red), and overall test as failed
      this.testComplete();
    }
    $$.LOG.info("TEST HALTED");
  };

}(selblocks));

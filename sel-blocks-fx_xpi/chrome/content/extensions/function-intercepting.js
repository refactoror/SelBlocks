// selbocks name-space
(function($$){

  /* Function interception
  */
  $$.fnStack = [];

  $$.interceptPush = function(targetObj, targetFnName, fn) {
    var frame = { targetObj: targetObj, targetFnName: targetFnName, savedFn: targetObj[targetFnName] };
    $$.fnStack.push(frame);
    targetObj[targetFnName] = fn;
  };
  $$.interceptPop = function() {
    var frame = $$.fnStack.pop();
    frame.targetObj[frame.targetFnName] = frame.savedFn;
  };

  $$.interceptOnce = function(targetObj, targetFnName, fn) {
    $$.interceptPush(targetObj, targetFnName, function(){
      $$.interceptPop(); // un-intercept
      fn.call(this);
    });
  };

}(selblocks));

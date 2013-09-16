// selbocks name-space
(function($$){

  /* Function interception
  */

  // execute the given function before each call of the specified function
  $$.interceptBefore = function(targetObj, targetFnName, fn) {
    var existing_fn = targetObj[targetFnName] = fn;
    targetObj[targetFnName] = function() {
      fn.call(this);
      existing_fn.call(this);
    };
  };
  // execute the given function after each call of the specified function
  $$.interceptAfter = function(targetObj, targetFnName, fn) {
    var existing_fn = targetObj[targetFnName] = fn;
    targetObj[targetFnName] = function() {
      existing_fn.call(this);
      fn.call(this);
    };
  };
  // replace the specified function with the given function
  $$.interceptReplace = function(targetObj, targetFnName, fn) {
    targetObj[targetFnName] = function() {
      //var existing_fn = targetObj[targetFnName] = fn;
      return fn.call(this);
    };
  };

  $$.fnStack = [];

  // replace the specified function, saving the original function on a stack
  $$.interceptPush = function(targetObj, targetFnName, fn, frameAttrs) {
// $$.LOG.warn("interceptPush " + (frameAttrs ? frameAttrs : ""));
    var frame = {
       targetObj: targetObj
      ,targetFnName: targetFnName
      ,savedFn: targetObj[targetFnName]
      ,attrs: frameAttrs
    };
    $$.fnStack.push(frame);
    targetObj[targetFnName] = fn;
  };
  // restore the most recent function replacement
  $$.interceptPop = function() {
    var frame = $$.fnStack.pop();
// $$.LOG.warn("interceptPop " + (frame.attrs ? frame.attrs : ""));
    frame.targetObj[frame.targetFnName] = frame.savedFn;
  };
  $$.getActiveInterceptAttrs = function() {
    var topFrame = $$.fnStack[$$.fnStack.length-1];
    return topFrame.attrs;
  };

  // replace the specified function, but then restore the original function as soon as it is call
  $$.interceptOnce = function(targetObj, targetFnName, fn) {
    $$.interceptPush(targetObj, targetFnName, function(){
      $$.interceptPop(); // un-intercept
      fn.call(this);
    });
  };

}(selblocks));

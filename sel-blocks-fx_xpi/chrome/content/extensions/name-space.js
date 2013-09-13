var selblocks = {};

/* Function interception stack.
*/
// selbocks name-space
(function($$){
  $$.fnStack = [];
  $$.pushFn = function(targetObj, targetFnName, fn) {
    var frame = { targetObj: targetObj, targetFnName: targetFnName, savedFn: targetObj[targetFnName] };
    $$.fnStack.push(frame);
    targetObj[targetFnName] = fn;
  };
  $$.popFn = function() {
    var frame = $$.fnStack.pop();
    frame.targetObj[frame.targetFnName] = frame.savedFn;
  };

  /* Starting with FF4 lots of objects are in an XPCNativeWrapper,
   * and we need the underlying object for == and for..in operations.
   */
  $$.unwrapObject = function(obj) {
    if (typeof(obj) === "undefined" || obj == null)
      return obj;
    if (obj.wrappedJSObject)
      return obj.wrappedJSObject;
    return obj;
  };
}(selblocks));

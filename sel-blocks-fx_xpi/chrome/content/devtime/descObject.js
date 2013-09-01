//- Generate the HTML representation of the given element
// TBD: deep option
sb.descElement = function(elem, delim)
{
  delim = delim || " ";
  if (!elem || !elem.tagName)
    return "Not an HTMLElement: " + elem;
  var tagname = ((!elem.tagName) ? "???" : elem.tagName.toLowerCase());
  return (
    "<" + tagname + delim
    + formatList(delim, elem.attributes, null, descAttribute, null)
    + ">"
      + limitMessage(acePrefs.get("descElementMaxLength", 250), elem.textContent)
    + "</" + tagname + ">"
  );
  //- describe a named attribute of the element
  function descAttribute(attr) {
    return attr.nodeName + '="' + attr.nodeValue + '"';
  }
}
//- Summarize the given element as tag-name id class
sb.briefElement = function(elem) {
  return elem.tagName + (elem.id ? (" #" + elem.id) : "") + (elem.className ? (" ." + elem.className) : "");
}
sb.getTag = function(elem) {
  return elem.tagName;
}

//================================================================================
//- Describe an object and its attributes
sb.descObject = function(obj, delim, itemMaxLen, descFuncBodies)
{
  delim = delim || "\n";
  if (!obj) {
    return descValue(obj, itemMaxLen, descFuncBodies);
  }
  obj.constructor.name;
  if (obj instanceof Array)
    return descArray(obj);
  var asString = "";
  if (typeof obj == "string" || obj instanceof String)
    asString = '"' + obj + '"';
  return descType(obj) + " " + obj.constructor.name + "(): " + asString
    + delim
    + formatList(delim, getAttrNames(obj).sort(compareNumAlpha), null, descAttribute, null);

  //- describe a named attribute of the object
  function descAttribute(name) {
    return name + "=" + descValue(getObjectAttr(obj, name), itemMaxLen, descFuncBodies);
  }

  //- Describe the items in an Array
  function descArray(ary, delim, itemMaxLen)
  {
    delim = delim || "\n";
    if (!ary)
      return descValue(ary, itemMaxLen);
    return "[" + descValue(ary) + "]" + ": " + delim
      + formatList(delim, ary, null, descItem, null);

    //- describe a named attribute of the object
    function descItem(value, i) {
      return i + ") " + value;
    }
  }

  //- describe an object's type and value: quote strings, limit function bodies
  function descValue(value, maxLen, descFuncBodies)
  {
    var valueType = descType(value);
    if (valueType == "undefined")
//      return "[" + valueType + "]";
      return valueType;
    if (value == null)
      return "[object] null";
    var valueStr;
    if (valueType.toLowerCase() == "string") valueStr = '"' + value + '"';
    else if (value instanceof Date)      valueStr = value.toString();
    else if (value instanceof Array)     valueStr = "(" + value.length + " elements)";
//    else if (value instanceof Array)     valueStr = descArray(value);
    else if (valueType == "arguments")   valueStr = "signature: " + value.callee.name + "(" + value.length + "-args)";
    else if (typeof value == "function") valueStr = (descFuncBodies ? value.toString() : "");
    else if (value instanceof Object)    valueStr = "";
    else     /* number, boolean */       valueStr = value.toString();
    if (maxLen && valueStr.length > maxLen)
      valueStr = valueStr.substring(0, maxLen) + "... (" + (valueStr.length - maxLen) + " more bytes)";
//    return "[" + valueType + "] " + valueStr;
    return valueType + " " + valueStr;
  }

  //- describe an object's type
  function descType(obj)
  {
    if (obj === null) return "[object Null]"; // special case
    if (typeof(obj) == "undefined") return "undefined"; // special case
    var typ = Object.prototype.toString.call(obj); // the object's internal [[Class]] property
    if (obj.wrappedJSObject) {
      obj = unwrapObject(obj);
      typ = "(" + typ + ")"; // depict that object is in XPCNativeWrapper
    }
    if (obj.constructor.name)
      typ += " " + obj.constructor.name + "()";
    return typ;
  }
//  function descType(obj)
//  {
//    var desc = typeof obj;
//    if (!obj) return desc; // undefined or null
//    if (desc == "function") return desc;
////    if (obj instanceof HTMLElement) return "HTMLElement"; // IE "[object Error]" "Function expected"
//    if (desc == "object") { // includes Array
//      if (obj.callee instanceof Function) desc = "arguments";
//      else if (obj.constructor) desc = obj.constructor.name;
//      else if (obj instanceof Object) desc = "Object";
//    }
//    if (!desc) return "object";
//    return desc; // number, boolean, string
//  }

  //- describe a function's arguments
  function descArgs(a, b) {
    return descValue(arguments);
  }

  //- 
  function getObjectAttr(obj, name)
  {
    try {
      var value = obj[name];
    }
    catch (e) {
      return "-NOT-ACCESSIBLE-";
    }
    return value;
  }
  function getObjectAttrNaked(obj, name)
  {
    try {
      var value = unwrapObject(obj)[name];
    }
    catch (e) {
      return "-NOT-ACCESSIBLE-";
    }
    return value;
  }

  //- Get a list of the object's attribute names
  // TBD: what about obj.prototype attributes?
  function getAttrNames(obj) {
    var names = [];
    // (the in operator throws a TypeError on XPCNativeWrapper objects)
    for (var name in unwrapObject(obj)) {
      try {
        if (typeof(obj[name]) == "undefined")
          continue; // not present in the wrapped object
      }
      catch (e) { // not accessible
        // but it exists, so it's included in the list
      }
      if (!isNaN(name))
        continue; // skip array indices
      names.push(name);
    }
    return names;
  }
  //- Get a list of the underlying object's attribute names
  function getAttrNamesNaked(obj) {
    var names = [];
    for (var name in unwrapObject(obj)) {
      if (!isNaN(name))
        continue; // skip array indices
      names.push(name);
    }
    return names;
  }

  // find attributes of the raw object that are not present on the XPCNativeWrapper object
  // ie, modifications to the object
  function getAttrDiff(obj) {
    var names = [];
    for (var name in unwrapObject(obj)) {
      if (typeof(obj[name]) == "undefined")
        names.push(name);
    }
    return names;
  }

  // Starting with FF4 lots of objects are in an XPCNativeWrapper,
  // and we need the underlying object for == and for..in operations.
  function unwrapObject(obj) {
    if (typeof(obj) === "undefined" || obj == null)
      return obj;
    if (obj.wrappedJSObject)
      return obj.wrappedJSObject;
    return obj;
  }

  //- sort comparator: numbers to the top, then alphabetic
  function compareNumAlpha(a, b) {
    if (!isNaN(a) && !isNaN(b)) return (Number(a) - Number(b));
    return (a > b); // non-numerics, also pushes numbers to the top (assumes all values are unique)
  }

  //- Format the given values array into a delimited list string
  // The optional transformFunc is provided with each item and its zero-based index.
  function formatList(delim, values, left, transformFunc, right)
  {
    var buf = "";
    for (var i = 0; i < values.length; i++) {
      var value = ((transformFunc) ? transformFunc(values[i], i) : values[i]);
      if (buf)   buf += delim || " ";
      if (left)  buf += left;
      if (value) buf += value;
      if (right) buf += right;
    }
    return buf;
  }
}

// alert("descObject.js loaded " + sb.descObject(this));

/** Parse basic expressions.
*/
// selbocks name-space
(function($$){

  $$.InfixExpressionParser =
  {
    _objname : "InfixExpressionParser"
    ,BRACKET_PAIRS : { "(": ")", "{": "}", "[": "]" }
    ,trimListValues : true

    //- Parse a string into a list on the given delimiter character,
    // respecting embedded quotes and brackets
    ,splitList : function(str, delim)
    {
      var values = [];
      var prev = 0, cur = 0;
      while (cur < str.length) {
        if (str.charAt(cur) != delim) {
          cur = this.spanSub(str, cur);
          if (cur == -1)
            throw new Error("Unbalanced expression grouping at: " + str.substr(prev));
        }
        else {
          var value = str.substring(prev, cur);
          if (this.trimListValues)
            value = value.trim();
          values.push(value);
          prev = cur + 1;
        }
        cur++;
      }
      values.push(str.substring(prev));
      if (values.length == 1 && values[0].trim() == "") {
        values.length = 0;
      }
      return values;
    }

    //- Scan to the given chr, skipping over intervening matching brackets
    ,spanTo : function(str, i, chr)
    {
      while (str.charAt(i) != chr) {
        i = this.spanSub(str, i);
        if (i == -1 || i >= str.length)
          return -1;
        i++;
      }
      return i;
    }

    //- If character at the given index is a open/quote character, then scan to its matching close/quote
    ,spanSub : function(str, i)
    {
      if (i < str.length) {
        if (str.charAt(i) == "(") return this.spanTo(str, i+1, ")"); // recursively skip over intervening matching brackets
        else if (str.charAt(i) == "[") return this.spanTo(str, i+1, "]");
        else if (str.charAt(i) == "{") return this.spanTo(str, i+1, "}");
        else if (str.charAt(i) == "'") return str.indexOf("'", i+1); // no special meaning for intervening brackets
        else if (str.charAt(i) == '"') return str.indexOf('"', i+1);
      }
      return i;
    }

    //- Format the given values array into a delimited list string
    // An optional transformFunc operates on each value.
    ,formatList : function(delim, values, left, transformFunc, right)
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
  };

}(selblocks));

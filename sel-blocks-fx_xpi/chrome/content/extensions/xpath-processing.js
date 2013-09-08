/** Provides richer functionality than is available via Selenium xpathEvaluator.
 *  Used only by locator-builders, because it assumes a Firefox environment.
 */
// selbocks name-space
(function($$){

  $$.xp =
  {
    // Evaluate an xpathExpression against the given document object.
    // The document is also the starting context, unless a contextNode is provided.
    // Results are in terms of the most natural type, unless resultType specified.
    evaluateXpath: function(doc, xpath, contextNode, resultType, namespaceResolver, resultObj)
    {
      $$.xp.logXpathEval(doc, xpath, contextNode);
      var isResultObjProvided = (resultObj != null);
      try {
        var result = doc.evaluate(
            xpath
            , contextNode || doc
            , namespaceResolver
            , resultType || XPathResult.ANY_TYPE
            , resultObj);
        $$.LOG.trace("XPATH Result: " + $$.xp.fmtXpathResultType(result) + " : " + xpath);
      }
      catch (err) {
        $$.LOG.error("XPATH: " + xpath);
        //$$.LOG.traceback(err);
        throw err;
      }
      if (isResultObjProvided)
        result = resultObj;

      return result;
    }

    // Find the first matching element
    ,selectElement: function(doc, xpath, contextNode) {
      var elems = $$.xp.selectElements(doc, xpath, contextNode);
      return (elems && elems.length > 0 ? elems[0] : null);
    }

    // Find all matching elements
    // TBD: make XPath engine choice configurable
    ,selectElements: function(doc, xpath, contextNode) {
      var elems = $$.xp.selectNodes(doc, xpath, contextNode);
      return elems;
    }

    // Select a single node
    // (analogous to xpath[1], without the axis-precedence gotchas)
    ,selectNode: function(doc, xpath, contextNode, resultType) {
      var result = $$.xp.evaluateXpath(doc, xpath, contextNode, resultType || XPathResult.FIRST_ORDERED_NODE_TYPE);
      return $$.unwrapObject(result.singleNodeValue);
    }

    // Select one or more nodes as an array
    ,selectNodes: function(doc, xpath, contextNode, resultType) {
      var result = $$.xp.evaluateXpath(doc, xpath, contextNode, resultType || XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
      var nodes = [];
      $$.xp.foreachNode(result, function (n, i) {
        nodes.push($$.unwrapObject(n));
      });
      return nodes;
    }

    // Select all matching nodes in the document, as a snapshot object
    ,selectNodeSnapshot: function(doc, xpath, contextNode) {
      return $$.xp.evaluateXpath(doc, xpath, contextNode, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    }

    // Select the exact matching node, else null
    ,selectUniqueNodeNullable: function(doc, xpath, contextNode)
    {
      var nodeSet = $$.xp.selectNodeSnapshot(doc, xpath, contextNode);
      if (!nodeSet || nodeSet.snapshotLength == 0) {
        return null;
      }
      if (nodeSet.snapshotLength > 1) {
        $$.LOG.debug("Ambiguous: " + nodeSet.snapshotLength + " matches");
        return null;
      }
      return $$.unwrapObject(nodeSet.snapshotItem(0));
    }

    // Select matching node as string/number/boolean value
    // TBD: Exclude the text of certain node types (eg, script).
    //   A way to filter would be to add "//*[not(self::script)]/text()[normalize-space(.)!='']"
    //   But that yields a node set and XPath stringify operations only use the first node in a node set.
    //   Other invisibles: //*[contains(translate(@style,' ',''),'display:none') or contains(translate(@style,' ',''),'visibility:hidden')]
    //     (for inline styling at least, cascaded styling is not accessible via XPath)
    ,selectValue: function(doc, xpath, contextNode)
    {
      var result = $$.xp.evaluateXpath(doc, xpath, contextNode, XPathResult.ANY_TYPE);
      if (!result)
        return null;

      var value = null;
      switch (result.resultType) {
        case result.STRING_TYPE:  value = result.stringValue;  break;
        case result.NUMBER_TYPE:  value = result.numberValue;  break;
        case result.BOOLEAN_TYPE: value = result.booleanValue; break;
      }
      return value;
    }

    // Operate on each node in the given snapshot object
    ,foreachNode: function(nodeSet, callbackFunc)
    {
      if (!nodeSet)
        return;
      var i = 0;
      var n = nodeSet.snapshotItem(i);
      while (n != null) {
        var result = callbackFunc($$.unwrapObject(n), i);
        if (result == false) {
          return; // the callbackFunc can abort the loop by returning false
        }
        n = nodeSet.snapshotItem(++i);
      }
    }

    // Format an xpath result according to its data type
    ,fmtXpathResultType: function(result)
    {
      if (!result) return null;
      switch (result.resultType) {
        case result.STRING_TYPE:                  return "'" + result.stringValue + "'";
        case result.NUMBER_TYPE:                  return result.numberValue;
        case result.BOOLEAN_TYPE:                 return result.booleanValue;
        case result.ANY_UNORDERED_NODE_TYPE:      return "uNODE " + result.singleNodeValue;
        case result.FIRST_ORDERED_NODE_TYPE:      return "oNODE " + result.singleNodeValue;
        case result.UNORDERED_NODE_SNAPSHOT_TYPE: return result.snapshotLength + " uNODEs";
        case result.ORDERED_NODE_SNAPSHOT_TYPE:   return result.snapshotLength + " oNODEs";
        case result.UNORDERED_NODE_ITERATOR_TYPE: return "uITR";
        case result.ORDERED_NODE_ITERATOR_TYPE:   return "oITR";
      }
      return result;
    }

    // Log an xpath result
    ,logXpathEval: function(doc, xpath, contextNode)
    {
      $$.LOG.debug("XPATH: " + xpath);
      if (contextNode && contextNode != doc) {
        $$.LOG.debug("XPATH Context: " + contextNode);
      }
    }
  };

}(selblocks));

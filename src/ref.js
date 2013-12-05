/**
 * The noderef class represents a pointer to a node, that can be
 * resolved and fixed when needed
 * 
 * @param {int} index     
 * @param {NodeREF} parentRef 
 */
var NodeRef = function NodeRef(index, parentRef) {
  var self = this;
  var fixatedNode = false;
  if(parentRef.nodeName !== undefined) {
   return {
    resolve: function(){ return parentRef; },
    debug: function(){ return parentRef.nodeName.toLowerCase(); }
   };
  } else if(parentRef.resolve === undefined) {
    throw new Error('Node ref requires an static root node or an other Ref');
  }

  /**
   * The reference to the parent node
   * @type {NodeRef}
   */
  self.parentRef = parentRef;

  /**
   * Index of this node in the parent
   * @type {[type]}
   */
  self.index = index;

  /**
   * Fix the resolved node to an static dom reference
   */
  self.fixate = function() {
    fixatedNode = self.resolve();
  };

  /**
   * Resolve the reference to an DomNOde
   * @return {Element} the dom node
   */
  self.resolve = function() {
    if(fixatedNode !== false)
      return fixatedNode; //returned fixed

    var parent = parentRef.resolve();
    var wi = 0, i, res;
    for(i=0; i<parent.childNodes.length; i+=1) {
      var node = parent.childNodes[i];

      if(wi === index) {
        res = node;
      }

      //only increment when its not a text or text
      if(node.nodeType !== 3 || node.data.replace(/\s+/g, '').length !== 0) {
        wi+=1;
      }
    }

    return res;
  };

  /**
   * Return a debug string
   * @return {string} the report
   */
  self.debug = function() {
    return (parentRef.debug() + '.' + self.index).toLowerCase();
  };
};

module.exports = NodeRef;
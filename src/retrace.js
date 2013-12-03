/* globals document */
var deep = require('deep-diff');

var Retrace = function(Parser, Promise, scope, debug) {
  debug = (debug === undefined) ? (false) : (debug);
  var self = this;
  var parsed = false;   
  
  /**
   * Original dom used for comparison
   * @type {mixed}
   */
  self.lhs = false;

  /**
   * New dom used for comparison
   * @type {mixed}
   */
  self.rhs = false;

  /**
   * Holds the most recent changeset
   * @type {mixed}
   */
  self.changes = false;

  /**
   * Parse the raw html
   * @param  {string} html the html string
   */
  self.parse = function parse(html) {
    parsed = Promise.defer();
    self.parser.parseComplete(html);
    return parsed.promise;
  };

  /**
   * The noderef class represents a pointer to a node, that can be
   * resolved and fixed when needed
   * 
   * @param {int} index     
   * @param {NodeREF} parentRef 
   */
  var NodeRef = function(index, parentRef) {
    var self = this;
    if(parentRef.nodeName !== undefined) {
     return {
      resolve: function(){ return parentRef; },
      debug: function(){ return parentRef.nodeName.toLowerCase(); }
     };
    } else if(parentRef.resolve === undefined) {
      throw new Error('Node ref requires an static root node or an other Ref');
    }

    self.parentRef = parentRef;
    self.index = index;
    self.node = false;

    self.fixate = function() {
      self.node = self.resolve();
    };

    self.resolve = function() {
      if(self.node !== false)
        return self.node; //returned fixed

      var parent = parentRef.resolve();
      if(parent === undefined) 
        return undefined;

      return parent.childNodes[index];
    };

    self.debug = function() {
      return (parentRef.debug() + '.' + self.index).toLowerCase();
    };
  };


  /**
   * The changeset class the records changes 
   * 
   * @param {boolean} debug enable debug mode
   */
  self.Changeset = function Changeset(debug) {
    debug = (debug === undefined) ? (false) : (debug);
    var supported = ['emptyNode', 'removeNode', 'insertNode', 'replaceNode', 'removeAttribute', 'setAttribute', 'setData'];
    var self = this;
    var content = [];

    /**
     * Retrieve all commands in this changeset
     * @return {Array} [description]
     */
    self.all = function all() {
      return content;
    };

    /**
     * Add a command to the changeset
     * @param {object} cmd the command
     */
    self.add = function add(cmd) {
      if(supported.indexOf(cmd.op) === -1)
        throw new Error('Unsupported operation: ' + cmd.op);

      if(cmd.ref === undefined)
        throw new Error('Command must provide a reference to the subject.');

      if(cmd.depth === undefined)
        throw new Error('Command must provide a depth property.');

      if(cmd.order === undefined)
        throw new Error('Command must provide an order property.');

      content.push(cmd);
    };

    /**
     * Make an estimated guess for the replacement node based on the original, given type and a tag
     * @param  {Node} original the original Node
     * @param  {tag|text|comment} type     the type we are converting to
     * @param  {string} tag      when switching to  tag, which tag it will be
     * @return {Node}  the replacementment node
     */
    self.createReplacementNode = function createReplacementNode(original, type, tag) {
      //get defaults
      var replacement = false;
      if(tag === false)
        tag = 'ins'; //nice! even has scematic meaning

      if(type === false) {
        type = 'tag';
        if(original.nodeType !== 1)
          throw new Error('Unexpected type switch');
      }

      if(original.nodeType === 1 && type === 'tag') {
          var html = original.outerHTML;
          html = html.replace(/<[^ >]*/i, '<' + tag);
          html = html.replace(/<\/.*>$(?!.*<\/)/, '</'+ tag + '>');
          replacement = document.createElement('div');
          replacement.innerHTML = html;
          replacement = replacement.childNodes[0];
          return replacement;
      } else {
        if(type === 'tag') {
          return document.createElement(tag); //from something else to a tag
        } else if(type === 'text') {
          replacement = document.createTextNode(''); //from something else to a text
          if(original.data !== undefined)
            replacement.data = original.data;
          return replacement;
        } else if(type === 'comment') {
          replacement = document.createComment(''); //from something else to a text
          if(original.data !== undefined)
            replacement.data = original.data;
          return replacement;
        } else {
          throw new Error('Unexpected switch to:' + type);
        }
      }
    };

    /**
     * Apply one cmd to the dom
     * @param  {object} cmd hash discribing the op
     * @return {mixed}  result of the op
     */
    self.applyOne = function applyOne(cmd) {
      var res = false;

      if(debug) console.log('cmd:', cmd.op, 'ref:', (cmd.ref.resolve().nodeName === undefined) ? (cmd.ref.resolve()) : (cmd.ref.resolve().nodeName) );

      if(cmd.op === 'removeNode') {
        cmd.ref.parentRef.resolve().removeChild(cmd.ref.resolve());
      } else if(cmd.op === 'removeAttribute') {
        cmd.ref.resolve().removeAttribute(cmd.name);
      } else if(cmd.op === 'setAttribute') {
        cmd.ref.resolve().setAttribute(cmd.name, cmd.value);
      } else if(cmd.op === 'emptyNode') {
        while(cmd.ref.resolve().firstChild) {
          cmd.ref.resolve().removeChild(cmd.ref.resolve().firstChild);
        }
      } else if(cmd.op === 'insertNode') {
        var newNode = self.createElement(cmd.node);
        cmd.ref.resolve().insertBefore(newNode, cmd.ref.resolve().childNodes[cmd.index]);
      } else if(cmd.op === 'replaceNode') {
        var original = cmd.ref.resolve();
        var replacement = self.createReplacementNode(original, cmd.type, cmd.tag);
        cmd.ref.parentRef.resolve().replaceChild(replacement, original);
      } else if(cmd.op === 'setData') {
        var node = cmd.ref.resolve();
        node.data = cmd.rhs;
      } 

      return res;
    };

    /**
     * Order the changes in such a way that destructive operations don't
     * prevent later changes from happening
     */
    self.sortChanges = function sortChanges(changes) {
      return changes;
    };

    /**
     * Apply the changeset to the DOM
     * @return {array} command results
     */
    self.apply = function apply() {
      var res = [];

      if(debug) console.log('-----------------APPLY--------------------');
      self.sortChanges(content).forEach(function(c){
        res.push(self.applyOne(c));
      });
      return res;
    };

    /**
     * Create a new element using htmlparser like config
     * @param  {object} tag config describing the tag
     * @return {Element}     the new node
     */
    self.createElement = function createElement(tag) {

      if(tag.type === 'tag') {
        var el = document.createElement(tag.name);
        if(tag.attribs) {
          Object.keys(tag.attribs).forEach(function(name){
            el.setAttribute(name, tag.attribs[name]);
          }); 
        }

        if(tag.children !== undefined) {
          tag.children.forEach(function(c){
            el.appendChild(self.createElement(c));
          });
        }

        return el;
      } else if(tag.type === 'text') {
        return document.createTextNode(tag.data);
      } else {
        throw new Error('Creating elements of type ' + tag.type + 'is not supported');
      }

    };

  };

  var scheduleChildrenChange = function(d, lhs, ref, depth)
  {
    if(d.kind === 'N') {
      //This happens when previously it had no children
      if(Array.isArray(d.rhs)) {
        //rhs contains new children
        if(debug) console.log(Array(depth).join(' ') + '[CHILDREN][Append] (append all children) ', JSON.stringify(d.rhs));

        d.rhs.forEach(function(node, i){
          self.changes.add({
            op: 'insertNode',
            ref: ref,
            depth: depth,
            order: 0,
            index: i,
            node: node
          });
        });

      } else {
        throw new Error('Expected an array for new "children" received:' + JSON.stringify(d.rhs));
      }
    } else if(d.kind === 'D') {
      //this happens when afterwards it has no children
      if(Array.isArray(d.lhs)) {
          //lhs contains old children              
          if(debug) console.log(Array(depth).join(' ') + '[CHILDREN][DELETE] (delete all children) ', JSON.stringify(d.lhs));   

          self.changes.add({
            op: 'emptyNode',
            ref: ref,
            depth: depth,
            order: 0          
          });

      } else {
        throw new Error('Expected an array for old "children" received:' + JSON.stringify(d.lhs));
      }
    } else if(d.kind === 'A') {
      //this the existing children change, new are appended
      if(d.item === undefined || typeof d.item !== 'object' || d.item.kind !== 'N')
        throw new Error('Expected an object for appending "children" received:' + JSON.stringify(d.item));

      if(debug) console.log(Array(depth).join(' ') + '[CHILDREN][Append] (append to existing @' + d.index +')', JSON.stringify(d.item.rhs));

      self.changes.add({
        op: 'insertNode',
        ref: ref,
        depth: depth,
        order: 0,
        index: d.index,
        node: d.item.rhs
      });

    } else {
      throw new Error('Invalid "children" change kind:' + d.kind);
    }
  };

  var scheduleAttributeChange = function(d, lhs, ref, depth) 
  {
    var attrName = d.path[1];
    if(attrName !== undefined) {
      if(d.kind === 'N') {
          //set new attribute
          if(debug) console.log(Array(depth).join(' ') + '[ATTR][NEW] (set new attribute) ', attrName + ': '+ d.rhs);   

          self.changes.add({
            op: 'setAttribute',
            ref: ref,
            depth: depth,
            order: 0,
            name: attrName,
            value: d.rhs
          });
      } else if(d.kind === 'E') {
          if(debug) console.log(Array(depth).join(' ') + '[ATTR][EDIT] (set existing attribute) ', attrName + ': ' + d.rhs);   

          self.changes.add({
            op: 'setAttribute',
            ref: ref,
            depth: depth,
            order: 0,
            name: attrName,
            value: d.rhs
          });
      } else if(d.kind === 'D') {
          if(debug) console.log(Array(depth).join(' ') + '[ATTR][DELETE] (existing attribute) ', attrName);
          
          self.changes.add({
            op: 'removeAttribute',
            ref: ref,
            depth: depth,
            order: 0,
            name: attrName                
          });
      } else {
        throw new Error('Invalid "attribute" change kind:' + d.kind);
      }
    } else {
      if(d.rhs !== undefined && typeof d.rhs === 'object' && d.kind === 'N') {
        if(debug) console.log(Array(depth).join(' ') + '[ATTR][NEW] (add all attributes) ', JSON.stringify(d.rhs));   
        Object.keys(d.rhs).forEach(function(name){
          self.changes.add({
            op: 'setAttribute',
            ref: ref,
            depth: depth,
            order: 0,
            name: name,
            value: d.rhs[name]
          });
        });
      } else if(d.lhs !== undefined && typeof d.lhs === 'object' && d.kind === 'D') {
        if(debug) console.log(Array(depth).join(' ') + '[ATTR][DELETE] (remove all attributes) ', JSON.stringify(d.lhs));   

        Object.keys(d.lhs).forEach(function(name){
          self.changes.add({
            op: 'removeAttribute',
            ref: ref,
            depth: depth,
            order: 0,
            name: name                
          });
        });
      } else {
        throw new Error('Expected object has with new or old attributes, received:' + d);
      }
    }
  };

  var scheduleNodeNameChange = function(d, lhs, ref, depth)
  {
    if(d.kind === 'E') {
      if(debug) console.log(Array(depth).join(' ') + '[TAG][EDIT] (replace) ', JSON.stringify(d));   

      self.changes.add({
        op: 'replaceNode',
        ref: ref,
        order: 0,
        depth: depth,
        type: false, //use default
        tag: d.rhs
      });

    } else if(d.kind === 'D') {
      if(debug) console.log(Array(depth).join(' ') + '[TAG][DELETE] (due to replace) ', JSON.stringify(d));
      //todo: DUE to REPLACEMENT, will not be missed 
      //this happens when next round node is changed to a text
    } else if(d.kind === 'N') {
      if(debug) console.log(Array(depth).join(' ') + '[TAG][NEW] (due to replace) ', JSON.stringify(d));

      self.changes.add({
        op: 'replaceNode',
        ref: ref,
        order: 0,
        depth: depth,
        type: false, //use default
        tag: d.rhs
      });
    } else {
      throw new Error('Invalid "type" change kind:' + d.kind);
    }
  };

  var scheduleDataChange = function(d, lhs, ref, depth)
  {
    if(d.kind === 'E') {
      if(debug) console.log(Array(depth).join(' ') + '(edit content)');
      self.changes.add({
        op: 'setData',
        ref: ref,
        order: 0,
        depth: depth,
        lhs: d.lhs,
        rhs: d.rhs
      });
    } else if(d.kind === 'D') {
      if(debug) console.log(Array(depth).join(' ') + '[DATA][DELETE] (due to replace) ', JSON.stringify(d));
      //todo: DUE to REPLACEMENT //this happens before next round the element is changed to a tag node
    } else if(d.kind === 'N') {
      if(debug) console.log(Array(depth).join(' ') + '[DATA][NEW] (due to replace) ', JSON.stringify(d));

      self.changes.add({
        op: 'setData',
        ref: ref,
        order: 0,
        depth: depth,
        lhs: d.lhs,
        rhs: d.rhs
      });
    } else {
      throw new Error('Invalid "data" change kind:' + d.kind);
    }
  };

  /**
   * New Supper power traverse function
   * @param  {object} d     the diff object
   * @param  {object} lhs   the original reference
   * @param  {NodeRef} ref   an un resolved location object
   * @param  {int} depth indicatees how deep we are in the dom
   */
  var traverse = function(d, lhs, ref, depth)  {
    depth = depth === undefined ? 1 : depth;
    var p = (d.path === undefined) ? ('self') : d.path[0];
    if(debug === true) {
      console.log(Array(depth).join(' ') + '['+d.kind + '] ' + ref.debug());      
    }

    //if their is a change on the children, it already exists, and the index 
    if(lhs.children !== undefined && lhs.children[d.index] !== undefined && d.kind === 'A' && p === 'children') {
        traverse(d.item, lhs.children[d.index], new NodeRef(d.index, ref), depth + 1);
    } else {

      if(p === 'children') {
        scheduleChildrenChange(d, lhs, ref, depth);
      } else if(p === 'attribs') {
        scheduleAttributeChange(d, lhs, ref, depth);
      } else if(p === 'name') {
        scheduleNodeNameChange(d, lhs, ref, depth);
      } else if(p === 'data') {
        scheduleDataChange(d, lhs, ref, depth);
      } else if(p === 'type') {
        if(d.kind === 'E') {
          if(debug) console.log(Array(depth).join(' ') + '[TYPE][E] (replace) ', JSON.stringify(d));   

          self.changes.add({
            op: 'replaceNode',
            ref: ref,
            order: 0,
            depth: depth,
            type: d.rhs,
            tag: false //use default
          });
        } else {
          throw new Error('Invalid "type" change kind:' + d.kind);
        }

      } else if(p === 'self') {
        if(d.kind === 'D') {
          if(debug) console.log(Array(depth).join(' ') + '(delete itself) ', JSON.stringify(d));  

          ref.fixate(); //fix early
          self.changes.add({
            op: 'removeNode',
            ref: ref,
            order: 0,
            depth: depth
          });

        } else {
          throw new Error('Only possible to delete yourself.');
        }
      } else {
        throw new Error('Path "' + p + '" is not implemented.');
      }
    }
  };

  /**
   * Compare the lhs and rhs and return the diff
   * @return {[type]} [description]
   */
  self.compare = function() {
    var diff = deep.diff(self.lhs, self.rhs);
    if(!Array.isArray(diff))
      return false;

    self.changes = new self.Changeset(debug);

    if(debug === true)
      console.log('-----------------Walk--------------------');

    var root = new NodeRef(0, scope);
    diff.forEach(function(d){
      traverse(d.item, self.lhs[d.index], new NodeRef(d.index, root), 1);
    });

    return self.changes;
  };

  /**
   * The handler function
   *   
   * @param  {mixed} error html parser error
   * @param  {object} dom  the parsed dom
   */
  self.handle = function(error, dom) {
    if (error) {
        //@todo should reject promise
        throw new Error(error);
    } else {

      if(self.rhs === false) {
        self.rhs = dom;
        self.parser.parseComplete(scope.innerHTML);
      } else if (self.lhs === false) {
        self.lhs = dom;
        parsed.resolve(self.rhs);        
      } else {
        self.lhs = self.rhs;
        self.rhs = dom;
        parsed.resolve(self.rhs);
      }
    }
  };

  /**
   * The handler that is called on parse
   * @type {Parser.DefaultHandler}
   */
  self.handler = new Parser.DefaultHandler(self.handle, { verbose: false, ignoreWhitespace: true });

  /**
   * The html parser
   * @type {Parser}
   */
  self.parser = new Parser.Parser(self.handler);

};

module.exports = Retrace;
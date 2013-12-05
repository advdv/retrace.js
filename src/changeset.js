/*global document */
var NodeRef = require('./ref.js');

/**
 * The changeset class the records changes 
 * 
 * @param {boolean} debug enable debug mode
 */
var Changeset = function Changeset(debug) {
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
      var beforeNode = new NodeRef(cmd.index, cmd.ref);

      cmd.ref.resolve().insertBefore(newNode, beforeNode.resolve());
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
    } else if(tag.type === 'comment') {
      return document.createComment(tag.data);
    } else {
      throw new Error('Creating elements of type ' + tag.type + 'is not supported');
    }

  };

};

module.exports = Changeset;
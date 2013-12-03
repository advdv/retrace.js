;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* globals window */
var Retrace = require('./src/retrace.js');

window.Retrace = Retrace;
},{"./src/retrace.js":3}],2:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};;(function(undefined) {
	"use strict";

	var $scope
	, conflict, conflictResolution = [];
	if (typeof global == 'object' && global) {
		$scope = global;
	} else if (typeof window !== 'undefined'){
		$scope = window;
	} else {
		$scope = {};
	}
	conflict = $scope.DeepDiff;
	if (conflict) {
		conflictResolution.push(
			function() {
				if ('undefined' !== typeof conflict && $scope.DeepDiff === accumulateDiff) {
					$scope.DeepDiff = conflict;
					conflict = undefined;
				}
			});
	}

	// nodejs compatible on server side and in the browser.
  function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  }

  function Diff(kind, path) {
  	Object.defineProperty(this, 'kind', { value: kind, enumerable: true });
  	if (path && path.length) {
  		Object.defineProperty(this, 'path', { value: path, enumerable: true });
  	}
  }

  function DiffEdit(path, origin, value) {
  	DiffEdit.super_.call(this, 'E', path);
  	Object.defineProperty(this, 'lhs', { value: origin, enumerable: true });
  	Object.defineProperty(this, 'rhs', { value: value, enumerable: true });
  }
  inherits(DiffEdit, Diff);

  function DiffNew(path, value) {
  	DiffNew.super_.call(this, 'N', path);
  	Object.defineProperty(this, 'rhs', { value: value, enumerable: true });
  }
  inherits(DiffNew, Diff);

  function DiffDeleted(path, value) {
  	DiffDeleted.super_.call(this, 'D', path);
  	Object.defineProperty(this, 'lhs', { value: value, enumerable: true });
  }
  inherits(DiffDeleted, Diff);

  function DiffArray(path, index, item) {
  	DiffArray.super_.call(this, 'A', path);
  	Object.defineProperty(this, 'index', { value: index, enumerable: true });
  	Object.defineProperty(this, 'item', { value: item, enumerable: true });
  }
  inherits(DiffArray, Diff);

  function arrayRemove(arr, from, to) {
  	var rest = arr.slice((to || from) + 1 || arr.length);
  	arr.length = from < 0 ? arr.length + from : from;
  	arr.push.apply(arr, rest);
  	return arr;
  }

  function deepDiff(lhs, rhs, changes, path, key, stack) {
  	path = path || [];
  	var currentPath = path.slice(0);
  	if (key) { currentPath.push(key); }
  	var ltype = typeof lhs;
  	var rtype = typeof rhs;
  	if (ltype === 'undefined') {
  		if (rtype !== 'undefined') {
  			changes(new DiffNew(currentPath, rhs ));
  		}
  	} else if (rtype === 'undefined') {
  		changes(new DiffDeleted(currentPath, lhs));
  	} else if (ltype !== rtype) {
  		changes(new DiffEdit(currentPath, lhs, rhs));
  	} else if (lhs instanceof Date && rhs instanceof Date && ((lhs-rhs) != 0) ) {
  		changes(new DiffEdit(currentPath, lhs, rhs));
  	} else if (ltype === 'object' && lhs != null && rhs != null) {
  		stack = stack || [];
  		if (stack.indexOf(lhs) < 0) {
  			stack.push(lhs);
  			if (Array.isArray(lhs)) {
  				var i
  				, len = lhs.length
  				, ea = function(d) {
  					changes(new DiffArray(currentPath, i, d));
  				};
  				for(i = 0; i < lhs.length; i++) {
  					if (i >= rhs.length) {
  						changes(new DiffArray(currentPath, i, new DiffDeleted(undefined, lhs[i])));
  					} else {
  						deepDiff(lhs[i], rhs[i], ea, [], null, stack);
  					}
  				}
  				while(i < rhs.length) {
  					changes(new DiffArray(currentPath, i, new DiffNew(undefined, rhs[i++])));
  				}
  			} else {
  				var akeys = Object.keys(lhs);
  				var pkeys = Object.keys(rhs);
  				akeys.forEach(function(k) {
  					var i = pkeys.indexOf(k);
  					if (i >= 0) {
  						deepDiff(lhs[k], rhs[k], changes, currentPath, k, stack);
  						pkeys = arrayRemove(pkeys, i);
  					} else {
  						deepDiff(lhs[k], undefined, changes, currentPath, k, stack);
  					}
  				});
  				pkeys.forEach(function(k) {
  					deepDiff(undefined, rhs[k], changes, currentPath, k, stack);
  				});
  			}
  			stack.length = stack.length - 1;
  		}
  	} else if (lhs !== rhs) {
  		changes(new DiffEdit(currentPath, lhs, rhs));
  	}
  }

  function accumulateDiff(lhs, rhs, accum) {
  	accum = accum || [];
  	deepDiff(lhs, rhs, function(diff) {
  		if (diff) {
  			accum.push(diff);
  		}
  	});
  	return (accum.length) ? accum : undefined;
  }

	function applyArrayChange(arr, index, change) {
		if (change.path && change.path.length) {
			// the structure of the object at the index has changed...
			var it = arr[index], i, u = change.path.length - 1;
			for(i = 0; i < u; i++){
				it = it[change.path[i]];
			}
			switch(change.kind) {
				case 'A':
					// Array was modified...
					// it will be an array...
					applyArrayChange(it, change.index, change.item);
					break;
				case 'D':
					// Item was deleted...
					delete it[change.path[i]];
					break;
				case 'E':
				case 'N':
					// Item was edited or is new...
					it[change.path[i]] = change.rhs;
					break;
			}
		} else {
			// the array item is different...
			switch(change.kind) {
				case 'A':
					// Array was modified...
					// it will be an array...
					applyArrayChange(arr[index], change.index, change.item);
					break;
				case 'D':
					// Item was deleted...
					arr = arrayRemove(arr, index);
					break;
				case 'E':
				case 'N':
					// Item was edited or is new...
					arr[index] = change.rhs;
					break;
			}
		}
		return arr;
	}

	function applyChange(target, source, change) {
		if (!(change instanceof Diff)) {
			throw new TypeError('[Object] change must be instanceof Diff');
		}
		if (target && source && change) {
			var it = target, i, u;
			u = change.path.length - 1;
			for(i = 0; i < u; i++){
				if (typeof it[change.path[i]] === 'undefined') {
					it[change.path[i]] = {};
				}
				it = it[change.path[i]];
			}
			switch(change.kind) {
				case 'A':
					// Array was modified...
					// it will be an array...
					applyArrayChange(it[change.path[i]], change.index, change.item);
					break;
				case 'D':
					// Item was deleted...
					delete it[change.path[i]];
					break;
				case 'E':
				case 'N':
					// Item was edited or is new...
					it[change.path[i]] = change.rhs;
					break;
				}
			}
		}

	function applyDiff(target, source, filter) {
		if (target && source) {
			var onChange = function(change) {
				if (!filter || filter(target, source, change)) {
					applyChange(target, source, change);
				}
			};
			deepDiff(target, source, onChange);
		}
	}

	Object.defineProperties(accumulateDiff, {

		diff: { value: accumulateDiff, enumerable:true },
		observableDiff: { value: deepDiff, enumerable:true },
		applyDiff: { value: applyDiff, enumerable:true },
		applyChange: { value: applyChange, enumerable:true },
		isConflict: { get: function() { return 'undefined' !== typeof conflict; }, enumerable: true },
		noConflict: {
			value: function () {
				if (conflictResolution) {
					conflictResolution.forEach(function (it) { it(); });
					conflictResolution = null;
				}
				return accumulateDiff;
			},
			enumerable: true
		}
	});

	if (typeof module != 'undefined' && module && typeof exports == 'object' && exports && module.exports === exports) {
		module.exports = accumulateDiff; // nodejs
	} else {
		$scope.DeepDiff = accumulateDiff; // other... browser?
	}
}());


},{}],3:[function(require,module,exports){
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
   * The changeset class the records changes 
   * 
   * @param {boolean} debug enable debug mode
   */
  self.Changeset = function Changeset(debug) {
    debug = (debug === undefined) ? (false) : (debug);
    var self = this;
    var content = [];

    self.all = function all() {
      return content;
    };

    /**
     * Apply one cmd to the dom
     * @param  {object} cmd hash discribing the op
     * @return {mixed}  result of the op
     */
    self.applyOne = function applyOne(cmd) {
      var res = false;

      if(cmd.op === 'remove') {
        cmd.parent.removeChild(cmd.el);
      } else if(cmd.op === 'append') {
        if(cmd.after !== false) {
          cmd.parent.insertBefore(cmd.el, cmd.el.nextSibling);
        } else {
          cmd.parent.appendChild(cmd.el);
        }
      } else if(cmd.op === 'replace') {

        var node = cmd.el;
        var newEl = false;

        if(node.nodeType === 1) {
          var html = node.outerHTML;
          html = html.replace(/^<[^> ]*/i, '<'+cmd.tag); //opening tag
          html = html.replace(new RegExp('</'+node.tagName+'>$', 'i'), '</' + cmd.tag + '>'); //closing tag
          var div = document.createElement('div');
          div.innerHTML = html;
          newEl = div.childNodes[0];
        } else {
          throw new Error('Replacement of node of type: ' + node.nodeType + ' is not supported');
        }

        cmd.parent.replaceChild(newEl, node);
      } else if(cmd.op === 'editText') {
        cmd.el.data = cmd.newText;
      } else if(cmd.op === 'setAttribute') {
        cmd.el.setAttribute(cmd.name, cmd.newValue);
      } else if(cmd.op === 'removeAttribute') {
        cmd.el.removeAttribute(cmd.name);
      } else {
        throw new Error('Unsupported cmd.op: ' + cmd.op);
      }

      return res;
    };

    /**
     * Order the changes in such a way that destructive operations don't
     * prevent later changes from happening
     */
    self.sortChanges = function sortChanges(changes) {

      var compare = function (cmdA, cmdB) {
        if (cmdA.op !== 'replace')
           return -1;
        else
          return 1;
        return 0;
      };

      var sorted = changes.sort(compare);
      if(debug === true) {
        console.log('-----------------Sorted CMDS--------------------');
        sorted.forEach(function(cmd){
          console.log(cmd.op, cmd.el);
        });
        console.log('-----------------END CMDS--------------------');
      }

      return sorted;
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
      } else {
        throw new Error('Creating elements of type ' + tag.type + 'is not supported');
      }

    };

    /**
     * Append tag at the given index of parent's children
     * @param  {element} parent [description]
     * @param  {int} index  [description]
     * @param  {object} tag    [description]
     */
    self.appendAt = function appendAt(parent, index, tag, depth) {
      var after = parent.childNodes[index - 1];
      if(debug === true)
        console.log(Array(depth).join(' ') +'[N] append:', tag, ' to:', parent.tagName, '@', index);

      content.push({
        op: 'append',
        parent: parent,
        el: self.createElement(tag),
        after: (after === undefined) ? (false) : (after)
      });
    };

    /**
     * Remove a child node at the provided index
     * @param  {Element} parent the parent node
     * @param  {int} index  position
     * @param  {int} depth  debug only
     */
    self.removeAt = function removeAt(parent, index, depth) {
      var node = parent.childNodes[index];
      if(debug === true)
        console.log(Array(depth).join(' ') +'[D] remove:', node);

      content.push({
        op: 'remove',
        parent: parent,
        el: node
      });
    };

    /**
     * Replace the element at index of the parent with the new tag
     * @param  {Element} parent 
     * @param  {int} index  
     * @param  {object} tag 
     * @param  {int} depth  
     */
    self.replaceAt = function replaceAt(parent, index, tag, depth) {
      var node =  parent.childNodes[index];
      if(debug === true)
        console.log(Array(depth).join(' ') +'[R]:', node, 'to:', tag, 'parent:', parent.tagName);

      content.push({
        op: 'replace',
        parent: parent,
        el: node,
        tag: tag
      });
    };

    /**
     * Edit the text nodes of an element
     * @param  {Element} parent 
     * @param  {int} index  
     * @param  {string} o      old data
     * @param  {string} n      new data
     * @param  {int} depth  for debug
     */
    self.editTextAt = function editTextAt(parent, index, o, n, depth) {
      var node = parent.childNodes[index];
      if(debug === true)
        console.log(Array(depth).join(' ') +'[DATA][E]:', node, 'from:', o, 'to:', n);

      content.push({
        op: 'editText',
        parent: parent,
        el: node,
        newText: n
      });

    };

    /**
     * Set the attribute of an element at the given postions (parent/index)
     * @param {Element} parent  
     * @param {int} index   
     * @param {string} name attrib name
     * @param {string} newAttr attribute new value
     * @param {[type]} depth   depth
     * @param {[type]} oldAttr attr old value
     */
    self.setAttributeAt = function setAttributeAt(parent, index, name, newValue, depth, oldValue) {
      var node = parent.childNodes[index];
      if(debug === true)
        console.log(Array(depth).join(' ') +'[ATTR][N] set:', name, 'of', node, 'to:', newValue);

      content.push({
        op: 'setAttribute',
        parent: parent,
        el: node,
        name: name,
        newValue: newValue,
        oldValue: oldValue
      });
    };

    self.removeAttributeAt = function removeAttributeAt(parent, index, name, depth) {
      var node = parent.childNodes[index];
      if(debug === true)
        console.log(Array(depth).join(' ') +'[ATTR][D]:', name, 'of', parent.tagName, '@', index);

      content.push({
        op: 'removeAttribute',
        parent: parent,
        el: node,
        name: name
      });
    };

  };

  /**
   * Append all given tags to the parent defined by parent/index
   * @param  {Element} parentParent parent's parent
   * @param  {string} index  position of parent int parent's parent
   * @param  {array} tag    [description]
   */
  self.appendAllTo = function appendChange(parentParent, parentIndex, tags, depth) {
    var parent = parentParent.childNodes[parentIndex];
    tags.forEach(function(tag, i){
      self.changes.appendAt(parent, i, tag, depth);
    });
  };



  /**
   * Empty the parent described by node and index
   * @param  {Element} parentParent the parent's parent
   * @param  {int} parentIndex  the index of of the parent
   * @param  {int} depth        debug
   */
  self.empty = function empty(parentParent, parentIndex, depth) {
    var parent = parentParent.childNodes[parentIndex];
    for (var i = 0; i < parent.childNodes.length; ++i) {
      self.changes.removeAt(parent, i, depth + 1);
    }
  };

  /**
   * Set all attributes of the element at the position
   * @param {Element} parent  
   * @param {int} index   
   * @param {object} attribs 
   * @param {int} depth   
   */
  self.setAllAttributesOf = function setAttributes(parent, index, attribs, depth) {  
    Object.keys(attribs).forEach(function(name){
      self.changes.setAttributeAt(parent, index, name, attribs[name], depth);
    });
  };

  /**
   * Remove all attributes of of an element at the position
   * @param  {Element} parent  
   * @param  {int} index   
   * @param  {object} attribs 
   * @param  {int} depth   
   */
  self.removeAllAttributesOf = function removeAllAttributesOf(parent, index, attribs, depth) {
    Object.keys(attribs).forEach(function(name){
      self.changes.removeAttributeAt(parent, index, name, attribs[name], depth);
    });
  };

  /**
   * Walk over the changes and add them to the changset in an usefull format
   * @param  {diff} d      the difference object
   * @param  {Element} scope  current element that were talking about
   * @param  {Element} parent the parent element 
   * @param  {int} index  the index of hte scope in the parent element
   * @param  {int} depth  current depth of the element

  var traverse = function(d, scope, parent, index, depth)  {
    depth = depth === undefined ? 1 : depth;
    index = index === undefined ? -1 : index;
    var p = (d.path === undefined) ? ('self') : d.path[0];
    if(debug === true)
      console.log(Array(depth).join(' ') + d.kind + ': ' + p);

    if(p === 'children' || p === 'self') {

      if(d.kind === 'A') {
        var nscope = scope.childNodes[d.index];
        traverse(d.item, nscope, scope, d.index, depth + 1);
      } else if(d.kind === 'D') {
        //Some child it deleted
        if(p === 'self') {
          self.changes.removeAt(parent, index);
        } else {
          self.empty(parent, index, depth);
        }

      } else if(d.kind === 'N') {
        //Some child it added
        if(p === 'self') {
          self.changes.appendAt(parent, index, d.rhs, depth);
        } else {
          self.appendAllTo(parent, index, d.rhs, depth);
        }
      } else {
        throw new Error('Unexpected change kind for path "' + p + '", received: ' + d.kind);
      }

    } else if(p === 'attribs') {

      var name = d.path[1];
      if(d.kind === 'D') {
        if(name === undefined) {
          self.removeAllAttributesOf(parent, index, d.lhs, depth);
        } else {
          self.changes.removeAttributeAt(parent, index, name, depth);
        }
      } else if(d.kind === 'N') {
        if(name === undefined) {
          self.setAllAttributesOf(parent, index, d.rhs, depth);
        } else {
          self.changes.setAttributeAt(parent, index, name, d.rhs, depth);
        }
      } else if(d.kind === 'E') {
        self.changes.setAttributeAt(parent, index, name, d.rhs, depth, d.lhs);
      } else {
        throw new Error('Unexpected change kind for path "' + p + '", received: ' + d.kind);
      }

    } else if(p === 'name') {
      self.changes.replaceAt(parent, index, d.rhs, depth);
    } else if(p === 'data') {
      if(d.kind === 'E') {
        self.changes.editTextAt(parent, index, d.lhs, d.rhs, depth);
      } else if(d.kind === 'N') {

        //@todo: implement
        console.log('[TODO] NEW DATA:', d, parent.tagName);


      } else if(d.kind === 'D') {

        //@todo: implement
        console.log('[TODO] DELETE DATA:', d, parent.tagName);


      } else {
        throw new Error('Unexpected change kind for path "' + p + '", received: ' + d.kind);
      }
    } else if(p === 'type') {
      if(d.kind === 'E') {

        console.log(d, parent.tagName, index);


      } else {
        throw new Error('Unexpected change kind for path "' + p + '", received: ' + d.kind);
      }


    } else {

      throw new Error('Path "' + p + '" is not implemented.');
    }

  };
   */

  var traverse2 = function(d, scope, parent, index, depth)  {
    depth = depth === undefined ? 1 : depth;
    index = index === undefined ? -1 : index;
    var p = (d.path === undefined) ? ('self') : d.path[0];
    if(debug === true)
      console.log(Array(depth).join(' ') + d.kind + ': ' + p);

    if(p === 'children' || p === 'self') {

      if(d.kind === 'A') {
        var nscope = scope.childNodes[d.index];
        traverse2(d.item, nscope, scope, d.index, depth + 1);
      } else if(d.kind === 'D') {
        //Some child it deleted
        if(p === 'self') {
          self.changes.removeAt(parent, index);
        } else {
          self.empty(parent, index, depth);
        }

      } else if(d.kind === 'N') {
        //Some child it added
        if(p === 'self') {
          self.changes.appendAt(parent, index, d.rhs, depth);
        } else {
          self.appendAllTo(parent, index, d.rhs, depth);
        }
      } else {
        throw new Error('Unexpected change kind for path "' + p + '", received: ' + d.kind);
      }

    } else if(p === 'attribs') {

      var name = d.path[1];
      if(d.kind === 'D') {
        if(name === undefined) {
          self.removeAllAttributesOf(parent, index, d.lhs, depth);
        } else {
          self.changes.removeAttributeAt(parent, index, name, depth);
        }
      } else if(d.kind === 'N') {
        if(name === undefined) {
          self.setAllAttributesOf(parent, index, d.rhs, depth);
        } else {
          self.changes.setAttributeAt(parent, index, name, d.rhs, depth);
        }
      } else if(d.kind === 'E') {
        self.changes.setAttributeAt(parent, index, name, d.rhs, depth, d.lhs);
      } else {
        throw new Error('Unexpected change kind for path "' + p + '", received: ' + d.kind);
      }

    } else if(p === 'name') {
      self.changes.replaceAt(parent, index, d.rhs, depth);
    } else if(p === 'data') {
      if(d.kind === 'E') {
        self.changes.editTextAt(parent, index, d.lhs, d.rhs, depth);
      } else if(d.kind === 'N') {

        //@todo: implement
        console.log('[TODO] NEW DATA:', d, parent.tagName);


      } else if(d.kind === 'D') {

        //@todo: implement
        console.log('[TODO] DELETE DATA:', d, parent.tagName);


      } else {
        throw new Error('Unexpected change kind for path "' + p + '", received: ' + d.kind);
      }
    } else if(p === 'type') {
      if(d.kind === 'E') {

        console.log(d, parent.tagName, index);


      } else {
        throw new Error('Unexpected change kind for path "' + p + '", received: ' + d.kind);
      }


    } else {

      throw new Error('Path "' + p + '" is not implemented.');
    }

  };

  /**
   * Compare the lhs and rhs and return the diff
   * @return {[type]} [description]
   */
  self.compare = function() {
    var diff = deep.diff(self.lhs, self.rhs);
    self.changes = new self.Changeset(debug);

    if(debug === true)
      console.log('-----------------Walk--------------------');

    diff.forEach(function(d){
      traverse2(d.item, scope.childNodes[d.index], scope, d.index, 1);
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
},{"deep-diff":2}]},{},[1])
;
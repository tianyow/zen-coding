/**
 * Parsed element factory
 * @param {Function} require
 * @param {Underscore} _ 
 */
zen_coding.exec(function(require, _) {
	/**
	 * Parsed element that represents intermediate node in abbreviation 
	 * transformation process. This element will then be converted to 
	 * <code>ZenNode</code>
	 * 
	 * @param {TreeNode} node Parsed tree node
	 * @param {String} syntax Tag type (html, xml)
	 * @param {DataElement} resource Matched element resource from <code>settings.json</code>
	 * @param {Object} options Custom options dictionary. It will be inherited in
	 * <code>ZenNode</code>
	 */
	function ParsedElement(node, syntax, resource, options) {
		this._abbr = resource;
		
		this.name = this._abbr ? this._abbr.name : node.name;
		this.real_name = node.name;
		this.count = node.count || 1;
		this.syntax = syntax;
		this._content = '';
		this._paste_content = '';
		this.repeat_by_lines = !!node.is_repeating;
		this.is_repeating = node && node.count > 1;
		this.parent = null;
		this.has_implicit_name = !!node.has_implict_name;
		this.children = [];
		this.options = _.extend({}, options || {});
		
		this.setContent(node.text);
	}

	ParsedElement.prototype = {
		/**
		 * Adds new child tag to current one
		 * @param {ParsedElement} elem
		 */
		addChild: function(elem) {
			elem.parent = this;
			this.children.push(elem);
		},
		
		/**
		 * Check if current node contains children
		 * @returns {Boolean}
		 */
		hasChildren: function() {
			return !!this.children.length;
		},
		
		/**
		 * Adds new attribute
		 * @param {String} name Attribute's name
		 * @param {String} value Attribute's value
		 */
		addAttribute: function(name, value) {
			if (!this.attributes)
				this.attributes = [];
				
			if (!this._attr_hash)
				this._attr_hash = {};
			
			/** @type {zen_coding.utils} */
			var utils = require('utils');
			
			// escape pipe (caret) character with internal placeholder
			value = utils.replaceUnescapedSymbol(value || '', '|', utils.getCaretPlaceholder());
			
			var a;
			if (name in this._attr_hash) {
				// attribute already exists, decide what to do
				a = this._attr_hash[name];
				if (name == 'class') {
					// 'class' is a magic attribute
					a.value += ((a.value) ? ' ' : '') + value;
				} else {
					a.value = value;
				}
			} else {
				a = {name: name, value: value};
				this._attr_hash[name] = a;
				this.attributes.push(a);
			}
		},
		
		/**
		 * Copy attributes from parsed node
		 */
		copyAttributes: function(node) {
			if (node && node.attributes) {
				var that = this;
				_.each(node.attributes, function(attr) {
					that.addAttribute(attr.name, attr.value);
				});
			}
		},
		
		/**
		 * This function tests if current tags' content contains xHTML tags. 
		 * This function is mostly used for output formatting
		 */
		hasTagsInContent: function() {
			return require('utils').matchesTag(this.getContent());
		},
		
		/**
		 * Set textual content for tag
		 * @param {String} str Tag's content
		 */
		setContent: function(data) {
			// XXX do I really should escape pipe here?
			// I think 'resource' module is a better place
			if (_.isString(data)) {
				var utils = require('utils');
				this._content = utils.replaceUnescapedSymbol(data || '', '|', utils.getCaretPlaceholder());
			} else if (_.isFunction(data)) {
				this._content = data;
			}
		},
		
		/**
		 * Returns tag's textual content
		 * @return {String}
		 */
		getContent: function() {
			return _.isFunction(this._content) 
				? this._content(this) 
				: this._content || '';
		},
		
		/**
		 * Set content that should be pasted to the output
		 * @param {String} val
		 */
		setPasteContent: function(val) {
			this._paste_content = require('utils').escapeText(val);
		},
		
		/**
		 * Get content that should be pasted to the output
		 * @return {String}
		 */
		getPasteContent: function() {
			return this._paste_content;
		},
		
		/**
		 * Search for deepest and latest child of current element
		 * @return {ParsedElement} Returns null if there's no children
		 */
		findDeepestChild: function() {
			if (!this.children || !this.children.length)
				return null;
				
			var deepestChild = this;
			while (deepestChild.children.length) {
				deepestChild = _.last(deepestChild.children);
			}
			
			return deepestChild;
		}
	};
	
	var elems = require('elements');
	elems.add('parsedElement', function(node, syntax, resource, options) {
		var res = require('resources');
		
		if (_.isString(resource)) {
			resource = elems.create('element', resource);
		}
		
		if (!resource && node.name) {
			resource = res.getAbbreviation(syntax, node.name);
		}
		
		if (resource && elems.is(resource, 'reference')) {
			resource = res.getAbbreviation(syntax, resource.data);
		}
		
		var elem = new ParsedElement(node, syntax, resource, options);
		// add default attributes
		if (elem._abbr)
			elem.copyAttributes(elem._abbr);
		
		elem.copyAttributes(node);
		
		return elem;
	});
	
	elems.add('parsedSnippet', function(node, syntax, resource, options) {
		if (_.isString(resource))
			resource = elems.create('snippet', resource);
		
		var elem = new ParsedElement(node, syntax, resource, options);
		var utils = require('utils');
		var res = require('resources');
		
		var data = resource ? resource.data : res.getSnippet(syntax, elem.name);
		// XXX do I really should escape pipe here?
		// I think 'resource' module is a better place
		elem.value = utils.replaceUnescapedSymbol(data, '|', utils.getCaretPlaceholder());
		
		// override some attributes
		elem.addAttribute('id', utils.getCaretPlaceholder());
		elem.addAttribute('class', utils.getCaretPlaceholder());
		elem.copyAttributes(node);
		
		return elem;
	});
});
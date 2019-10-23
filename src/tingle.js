/* !
* tingle.js
* @author  robin_parisi
* @version 0.15.1
* @url
*/

/* global define,module*/
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory)
    } else if (typeof exports === 'object') {
        module.exports = factory()
    } else {
        root.tingle = factory()
    }
}(this, function() {

    /* ----------------------------------------------------------- */
    /* == modal */
    /* ----------------------------------------------------------- */

    var isBusy = false

    function Modal(options) {
        var defaults = {
            onClose: null,
            onOpen: null,
            beforeOpen: null,
            beforeClose: null,
            stickyFooter: false,
            footer: false,
            cssClass: [],
            closeLabel: 'Close',
            closeMethods: ['overlay', 'button', 'escape'],
            zIndex: 1000,
            styles: {

            }
        }

        // extends config
        this.opts = extend({}, defaults, options)

        // data for the modal form
        this.entities = {};

        this.identificationMethods = ['name', 'id', 'className', 'tagName']; // only read

        // the properties disallowed to set values to the elements of modal form
        this.disallowedProperties = [
            'identificationMethod', 'identificationValue', 'defaultAttribute',
            'usesByForm', 'disallowedProperties', 'multiple'
        ]; // read-only

        this.defaultPropertyValues = {
            identificationMethod: 'name',
            // identificationValue: 'keyName',
            usesByForm: true,
            defaultAttribute: 'value',
            multiple: false,
            value: '',
        };

        // init modal
        this.init()
    }

    Modal.prototype.init = function() {
        if (this.modal) {
            return
        }

        _build.call(this)
        _bindEvents.call(this)

        // insert modal in dom
        document.body.insertBefore(this.modal, document.body.firstChild)

        if (this.opts.footer) {
            this.addFooter()
        }

        return this
    }

    Modal.prototype._busy = function(state) {
        isBusy = state
    }

    Modal.prototype._isBusy = function() {
        return isBusy
    }

    Modal.prototype.destroy = function() {
        if (this.modal === null) {
            return
        }

        // restore scrolling
        if (this.isOpen()) {
            this.close(true)
        }

        // unbind all events
        _unbindEvents.call(this)

        // remove modal from dom
        this.modal.parentNode.removeChild(this.modal)

        this.modal = null
    }

    Modal.prototype.isOpen = function() {
        return !!this.modal.classList.contains('tingle-modal--visible')
    }

    Modal.prototype.open = function() {
        if(this._isBusy()) return
        this._busy(true)

        var self = this

        // before open callback
        if (typeof self.opts.beforeOpen === 'function') {
            self.opts.beforeOpen()
        }

        if (this.modal.style.removeProperty) {
            this.modal.style.removeProperty('display')
        } else {
            this.modal.style.removeAttribute('display')
        }

        // prevent double scroll
        this._scrollPosition = window.pageYOffset
        document.body.classList.add('tingle-enabled')
        document.body.style.top = -this._scrollPosition + 'px'

        // sticky footer
        this.setStickyFooter(this.opts.stickyFooter)

        // show modal
        this.modal.classList.add('tingle-modal--visible')

        // onOpen callback
        if (typeof self.opts.onOpen === 'function') {
            self.opts.onOpen.call(self)
        }

        self._busy(false)

        // check if modal is bigger than screen height
        this.checkOverflow()

        return this
    }

    Modal.prototype.close = function(force) {
        if(this._isBusy()) return
        this._busy(true)
        force = force || false

        //  before close
        if (typeof this.opts.beforeClose === 'function') {
            var close = this.opts.beforeClose.call(this)
            if (!close) {
                this._busy(false)
                return
            }
        }

        document.body.classList.remove('tingle-enabled')
        window.scrollTo(0, this._scrollPosition)
        document.body.style.top = null

        this.modal.classList.remove('tingle-modal--visible')

        // using similar setup as onOpen
        var self = this

        self.modal.style.display = 'none'

        // onClose callback
        if (typeof self.opts.onClose === 'function') {
            self.opts.onClose.call(this)
        }

        // release modal
        self._busy(false)

    }

    /**
     * Sets a content to the modal window.
     *
     * @param  {string|HTMLElement} content A HTML content or a HTMLElement (Node).
     * @return {Modal}
     */
    Modal.prototype.setContent = function(content) {
        // check type of content : String or Node
        if (typeof content === 'string') {
            this.modalBoxContent.innerHTML = content
        } else {
            this.modalBoxContent.innerHTML = ''
            this.modalBoxContent.appendChild(content)
        }

        if (this.isOpen()) {
            // check if modal is bigger than screen height
            this.checkOverflow()
        }

        return this
    }

    /**
     * Returns the content of the modal window.
     *
     * @return {string}
     */
    Modal.prototype.getContent = function() {
        return this.modalBoxContent // use innerHTML
    }

    /**
     * Returns the HTMLElement (DOM) of the modal window.
     *
     * @return {HTMLElement}
     */
    Modal.prototype.geModalBoxElement = function () {
        return this.modalBoxContent;
    }

    Modal.prototype.addFooter = function() {
        // add footer to modal
        _buildFooter.call(this)

        return this
    }

    Modal.prototype.setFooterContent = function(content) {
        // set footer content
        this.modalBoxFooter.innerHTML = content

        return this
    }

    Modal.prototype.getFooterContent = function() {
        return this.modalBoxFooter
    }

    Modal.prototype.setStickyFooter = function(isSticky) {
        // if the modal is smaller than the viewport height, we don't need sticky
        if (!this.isOverflow()) {
            isSticky = false
        }

        if (isSticky) {
            if (this.modalBox.contains(this.modalBoxFooter)) {
                this.modalBox.removeChild(this.modalBoxFooter)
                this.modal.appendChild(this.modalBoxFooter)
                this.modalBoxFooter.classList.add('tingle-modal-box__footer--sticky')
                _recalculateFooterPosition.call(this)
                this.modalBoxContent.style['padding-bottom'] = this.modalBoxFooter.clientHeight + 20 + 'px'
            }
        } else if (this.modalBoxFooter) {
            if (!this.modalBox.contains(this.modalBoxFooter)) {
                this.modal.removeChild(this.modalBoxFooter)
                this.modalBox.appendChild(this.modalBoxFooter)
                this.modalBoxFooter.style.width = 'auto'
                this.modalBoxFooter.style.left = ''
                this.modalBoxContent.style['padding-bottom'] = ''
                this.modalBoxFooter.classList.remove('tingle-modal-box__footer--sticky')
            }
        }

        return this
    }


    Modal.prototype.addFooterBtn = function(label, cssClass, callback) {
        var btn = document.createElement('button')

        // set label
        btn.innerHTML = label

        // bind callback
        btn.addEventListener('click', callback)

        if (typeof cssClass === 'string' && cssClass.length) {
            // add classes to btn
            cssClass.split(' ').forEach(function(item) {
                btn.classList.add(item)
            })
        }

        this.modalBoxFooter.appendChild(btn)

        return btn
    }

    Modal.prototype.resize = function() {
        // eslint-disable-next-line no-console
        console.warn('Resize is deprecated and will be removed in version 1.0')
    }

    Modal.prototype.isOverflow = function() {
        var viewportHeight = window.innerHeight
        var modalHeight = this.modalBox.clientHeight

        return modalHeight >= viewportHeight
    }

    Modal.prototype.checkOverflow = function() {
        // only if the modal is currently shown
        if (this.modal.classList.contains('tingle-modal--visible')) {
            if (this.isOverflow()) {
                this.modal.classList.add('tingle-modal--overflow')
            } else {
                this.modal.classList.remove('tingle-modal--overflow')
            }

            // tODO: remove offset
            // _offset.call(this);
            if (!this.isOverflow() && this.opts.stickyFooter) {
                this.setStickyFooter(false)
            } else if (this.isOverflow() && this.opts.stickyFooter) {
                _recalculateFooterPosition.call(this)
                this.setStickyFooter(true)
            }
        }
    }

    /**
     * Creates a new entity of the modal form with default values and returns it.
     *
     * @param  {string} key            An identification value
     * @param  {object} data           Properties in the form of JSON
     * @param  {object} defaultValues  The default properties in the form of JSON
     * @return {object}
     */
    Modal.prototype.makeEntity = function (key, data, defaultValues) {
        var entity = {};

        if (typeof data === 'string') {
            data = {
                identificationValue: key,
                value: data
            };
        }

        if (typeof data !== 'object') {
            return null;
        }

        Object.assign(entity, data);

        // Sets default values
        if (typeof defaultValues === 'object') {
            for (var propertyName in defaultValues) {
                if (! entity.hasOwnProperty(propertyName)) {
                    entity[propertyName] = defaultValues[propertyName];
                }
            }
        }

        return entity;
    }

    /**
     * Creates and adds a new entity to the entities of the modal form.
     * If the 'replace' is 'true', then old data of the entity will be replaced.
     *
     * @param  {string}        key      A key name of the new entity
     * @param  {string|object} data     Properties in the form of JSON
     * @param  {boolean}       replace
     * @return {boolean}
     */
    Modal.prototype.createEntity = function (key, data, replace) {
        var entity;

        if (typeof replace !== 'boolean') {
            replace = true;
        }

        if (! replace && this.entities.hasOwnProperty(key)) {
            return false;
        }

        entity = this.makeEntity(key, data, this.defaultPropertyValues);

        if (! entity) {
            return false;
        }

        this.entities[key] = {};
        Object.assign(this.entities[key], entity);

        return true;
    }

    /**
     * Adds a new entity to the entities of the modal form.
     * If the 'updateModalForm' is true, then the values of the modal form
     * will be updated. Default value is 'true'.
     * If the 'replace' is 'true', then old data of the entity will be replaced.
     *
     * @param  {string}   key             An entity key
     * @param  {object}   data            Properties of the entity
     * @param  {boolean}  updateModalForm
     * @param  {boolean}  replace
     * @return {boolean}
     */
    Modal.prototype.setEnity = function (key, data, updateModalForm, replace) {
        if (updateModalForm !== 'boolean') {
            updateModalForm = true;
        }

        if (! this.createEntity(key, data, replace)) {
            return false;
        }

        if (updateModalForm) {
            this.updateModalFormFromEntity(key);
        }

        return true;
    }

    /**
     * Returns all properties of an entity of the modal form.
     * If the 'updateEntity' is 'true', then the entity will get data
     * from the modal form. Default 'updateEntity' is 'true'.
     *
     * @param  {string}   key                An entity key
     * @param  {boolean}  updateEntity
     * @return {object}
     */
    Modal.prototype.getEnity = function (key, updateEntity) {
        if (typeof updateEntity !== 'boolean') {
            updateEntity = true;
        }

        if (! this.entities.hasOwnProperty(key)) {
            return null;
        }

        if (updateEntity) {
            this.updateEntityFromModalForm(key);
        }

        return this.entities[key];
    }

    /**
     * Returns an array of property names of an entity.
     * The array doesn't include the disallowed properties.
     *
     * @param  {string}   key   An entity key
     * @return {array}
     */
    Modal.prototype.getEntityPropertyNames = function (key) {
        var names, position;

        if (this.entities.hasOwnProperty(key)) {
            names = Object.keys(this.entities[key]);

            for (var i = 0; i < this.disallowedProperties.length; i++) {
                position = names.indexOf(this.disallowedProperties[i]);

                if (position >= 0) {
                    names.splice(position, 1);
                }
            }
        }

        return names;
    }

    /**
     * Updates an entity of the modal form new data.
     * If the 'updateModalForm' is true, then the values of the modal form
     * will be updated. Default value is 'true'.
     *
     * @param  {string}  key               An entity key
     * @param  {object}  data              Properties in the form of JSON
     * @param  {boolean} updateModalForm
     * @return {boolean}
     */
    Modal.prototype.updateEntity = function (key, data, updateModalForm) {
        if (typeof updateModalForm !== 'boolean') {
            updateModalForm = true;
        }

        if (! this.entities.hasOwnProperty(key)) {
            return false;
        }

        for (var property in data) {
            this.entities[key][property] = data[property];
        }

        if (updateModalForm) {
            this.updateModalFormFromEntity(key);
        }

        return true;
    }

    /**
     * Updates a value of a property of the default attribute of the modal form.
     * If the 'updateModalForm' is true, then the values of the modal form
     * will be updated. Default value is 'true'.
     *
     * @param  {string}  key               An entity key
     * @param  {string}  value             New value of the property
     * @param  {boolean} updateModalForm
     * @return {boolean}
     */
    Modal.prototype.updateEntityDefaultProperty = function (key, value, updateModalForm) {
        if (! this.entities.hasOwnProperty(key)) {
            return false;
        }

        if (typeof updateModalForm !== 'boolean') {
            updateModalForm = true;
        }

        this.entities[key][this.entities[key].defaultAttribute] = value;

        if (updateModalForm) {
            this.updateModalFormFromEntity(key);
        }

        return true;
    }

    /**
     * Updates data of the entity from the modal form.
     *
     * @param  {string}  key   An entity key
     * @return {boolean}
     */
    Modal.prototype.updateEntityFromModalForm = function (key) {
        if (! this.entities.hasOwnProperty(key)) {
            return false;
        }

        this.entities[key][this.entities[key].defaultAttribute] = this.getValue(key);

        return true;
    }

    /**
     * Updates the modal form from entity data.
     *
     * @param  {string}  key   An entity key
     * @return {boolean}
     */
    Modal.prototype.updateModalFormFromEntity = function (key) {
        if (! this.entities.hasOwnProperty(key)) {
            return false;
        }

        this.setSomeValues(key, this.entities[key]);

        return true;
    }

    /**
     * Set values to the element of the modal form.
     *
     * @param  {HTMLElement}   element  The Node of the HTML element
     * @param  {string}        key      An entity key
     * @param  {string|object} value    New values
     * @return {number}
     */
    Modal.prototype.setValueToElement = function (element, key, value) {
        var iterations = 0; // the number of changes

        if (typeof value === 'string' && _setAttributeValue(element, this.getDefaultAttributeOfElement(key), value)) {
            iterations++;
        } else if (typeof value === 'object') {
            for (var property in value) {
                if (this.disallowedProperties.indexOf(property) < 0) {
                    if (_setAttributeValue(element, property, value[property])) {
                        iterations++;
                    }
                }
            }
        }

        return iterations;
    }

    /**
     * Sets one value to the modal form by the key name.
     *
     * @param  {string}   key
     * @param  {mixed}    value
     * @return {number}
     */
    Modal.prototype.setValue = function (key, value) {
        if (typeof value === 'string' || Array.isArray(value)) {
            return this.setSomeValues(key, value);
        }

        return 0;
    }

    /**
     * Sets some values to the modal form. Returns the number of elements changed.
     *
     * @param  {string}                 key
     * @param  {string|object|array}    value
     * @return {number}
     */
    Modal.prototype.setSomeValues = function (key, value) {
        var elements = this.findAnyElementsByKeyName(key),
            iterations = 0; // the number of changes

        if (elements instanceof NodeList || elements instanceof HTMLCollection) {
            for (var i = 0; i < elements.length; i++) {
                iterations += this.setValueToElement(elements.item(i), key, value);
            }
        } else if (elements instanceof HTMLElement) {
            return this.setValueToElement(elements, key, value);
        }

        return iterations;
    }

    /**
     * Returns a value from the modal form by key name.
     *
     * @param  {string}   key
     * @return {string|array}
     */
    Modal.prototype.getValue = function (key) {
        var element = this.findElementByKeyName(key)
            attribute = this.getDefaultAttributeOfElement(key);

        return element ? _getAttributeValue(element, attribute) : null;
    }

    /**
     * Returns data of a HTML element what matches to properties of the entity.
     *
     * @param  {string} key
     * @return {object}
     */
    Modal.prototype.getSomeValues = function (key) {
        var properties = this.getEntityPropertyNames(key),
            element = this.findElementByKeyName(key),
            values = {};
            console.log(element);
        for (var i = 0; i < properties.length; i++) {
            values[properties[i]] = _getAttributeValue(element, properties[i]);
        }

        return element ? values : null;
    }

    /**
     * Sets values to the modal form without written to the properties.
     * Returns number of elements changed.
     *
     * @param  {Object}   values   The values as JSON
     * @return {number}
     */
    Modal.prototype.setValues = function (values) {
        var iterations = 0;

        for (var key in values) {
            iterations += this.setSomeValues(key, values[key]);
        }

        return iterations;
    }

    /**
     * Sets new entities to the modal form.
     * If the 'updateModalForm' is true, then the values of the modal form
     * will be updated. Default value is 'true'.
     *
     * @param  {object}   entities         The new entities in the form of JSON
     * @param  {boolean}  updateModalForm
     * @return {boolean}
     */
    Modal.prototype.setEntities = function (entities, updateModalForm) {
        if (typeof entities !== 'object') {
            return false;
        }

        for (var key in entities) {
            this.setEnity(key, entities[key], updateModalForm);
        }

        return true;
    }

    /**
     * Returns entities of the modal form. The entities returns in the form of JSON.
     * If the 'updateEntities' is 'true', then the entities will get data
     * from the modal form. Default 'updateEntities' is 'true'.
     *
     * @param  {boolean}  updateEntities
     * @return {object}
     */
    Modal.prototype.getEntities = function (updateEntities) {
        var keys = Object.keys(this.entities);

        if (typeof updateEntities !== 'boolean') {
            updateEntities = true;
        }

        if (updateEntities) {
            for (var i = 0; i < keys.length; i++) {
                this.updateEntityFromModalForm(keys[i])
            }
        }

        return this.entities;
    }

    /**
     * Determines whether the element of the property is uses in the modal form.
     *
     * @param  {string}   key
     * @return {boolean}
     */
    Modal.prototype.isUsesByForm = function (key) {
        return this.entities.hasOwnProperty(key)
               ? this.entities[key].usesByForm
               : false;
    }

    /**
     * Determines whether the property is multiple uses in the modal form.
     *
     * @param  {string}   key
     * @return {boolean}
     */
    Modal.prototype.isPropertyMultiple = function (key) {
        return this.entities.hasOwnProperty(key)
               ? this.entities[key].multiple
               : false;
    }

    /**
     * Returns the identification value of element(s) by key name.
     *
     * @param  {string} key
     * @return {string}
     */
    Modal.prototype.getIdentificationValueByKeyName = function (key) {
        return this.entities.hasOwnProperty(key)
               ? this.entities[key].identificationValue
               : null;
    }

    /**
     * Returns the identification method of element(s) by key name.
     *
     * @param  {string} key
     * @return {string}
     */
    Modal.prototype.getIdentificationMethodByKeyName = function (key) {
        return this.entities.hasOwnProperty(key)
               ? this.entities[key].identificationMethod
               : null;
    }

    /**
     * Returns a default attribute of the element the modal form.
     *
     * @param  {string} key
     * @return {string}
     */
    Modal.prototype.getDefaultAttributeOfElement = function (key) {
        return this.entities.hasOwnProperty(key)
               ? this.entities[key].defaultAttribute
               : null;
    }

    Modal.prototype.findElementByKeyName = function (key) {
        var name = this.getIdentificationValueByKeyName(key),
            method = this.getIdentificationMethodByKeyName(key);

        if (! (name && method)) {
            return null;
        }

        return this.findElementByMethodAndValue(method, name);
    }

    Modal.prototype.findElementsByKeyName = function (key) {
        var name = this.getIdentificationValueByKeyName(key),
            method = this.getIdentificationMethodByKeyName(key);

        if (! (name && method)) {
            return null;
        }

        return this.findElementsByMethodAndValue(method, name);
    }

    Modal.prototype.findAnyElementsByKeyName = function (key) {
        var name = this.getIdentificationValueByKeyName(key),
            method = this.getIdentificationMethodByKeyName(key),
            multiple = this.isPropertyMultiple(key);

        if (! (name && method)) {
            return null;
        }

        return multiple
               ? this.findElementsByMethodAndValue(method, name)
               : this.findElementByMethodAndValue(method, name);
    }

    /**
     * Returns a HTMLElement by the identification value of element
     * and the identification method.
     *
     * @param  {string} method
     * @param  {string} value
     * @return {HTMLElement}
     */
    Modal.prototype.findElementByMethodAndValue = function (method, value) {
        var elements;

        if (! (this.modalBoxContent instanceof HTMLElement)) {
            return null;
        }

        if (this.identificationMethods.indexOf(method) < 0) {
            return null;
        }

        if (method == 'id') {
            return this.modalBoxContent.querySelector('#'+value);
        } else if (method == 'selector') {
            return this.modalBoxContent.querySelector(value);
        } else if (method == 'name') {
            elements = this.modalBoxContent.querySelectorAll('input[name="'+value+'"]');
        } else if (method == 'className') {
            elements = this.modalBoxContent.getElementsByClassName(value);
        } else if (method == 'tagName') {
            elements = this.modalBoxContent.getElementsByTagName(value);
        }

        if (typeof elements != 'undefined' && elements.length > 0) {
            return elements[0];
        }

        return null;
    }

    /**
     * Returns a collection of found elements by the identification value of element
     * and the identification method.
     *
     * @param  {string} method
     * @param  {string} value
     * @return {NodeList|HTMLCollection}
     */
    Modal.prototype.findElementsByMethodAndValue = function (method, value) {
        if (! (this.modalBoxContent instanceof HTMLElement)) {
            return null;
        }

        if (this.identificationMethods.indexOf(method) < 0) {
            return null;
        }

        if (method == 'id') {
            return this.modalBoxContent.querySelectorAll('#'+value);
        } else if (method == 'name') {
            return this.modalBoxContent.querySelectorAll('input[name="'+value+'"]');
        } else if (method == 'className') {
            return this.modalBoxContent.getElementsByClassName(value);
        } else if (method == 'tagName') {
            return this.modalBoxContent.getElementsByTagName(value);
        } else if (method == 'selector') {
            return this.modalBoxContent.querySelectorAll(value);
        }

        return null;
    }

    /* ----------------------------------------------------------- */
    /* == private methods */
    /* ----------------------------------------------------------- */

    function closeIcon() {
        return '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M.3 9.7c.2.2.4.3.7.3.3 0 .5-.1.7-.3L5 6.4l3.3 3.3c.2.2.5.3.7.3.2 0 .5-.1.7-.3.4-.4.4-1 0-1.4L6.4 5l3.3-3.3c.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0L5 3.6 1.7.3C1.3-.1.7-.1.3.3c-.4.4-.4 1 0 1.4L3.6 5 .3 8.3c-.4.4-.4 1 0 1.4z" fill="#000" fill-rule="nonzero"/></svg>'
    }

    function _recalculateFooterPosition() {
        if (!this.modalBoxFooter) {
            return
        }
        this.modalBoxFooter.style.width = this.modalBox.clientWidth + 'px'
        this.modalBoxFooter.style.left = this.modalBox.offsetLeft + 'px'
    }

    function _build() {

        // wrapper
        this.modal = document.createElement('div')
        this.modal.classList.add('tingle-modal')

        // remove cusor if no overlay close method
        if (this.opts.closeMethods.length === 0 || this.opts.closeMethods.indexOf('overlay') === -1) {
            this.modal.classList.add('tingle-modal--noOverlayClose')
        }

        this.modal.style.display = 'none'

        // z-index
        if (Number.isInteger(this.opts.zIndex)) {
            this.modal.style.zIndex = this.opts.zIndex
        }

        // custom class
        this.opts.cssClass.forEach(function(item) {
            if (typeof item === 'string') {
                this.modal.classList.add(item)
            }
        }, this)

        // close btn
        if (this.opts.closeMethods.indexOf('button') !== -1) {
            this.modalCloseBtn = document.createElement('button')
            this.modalCloseBtn.type = 'button'
            this.modalCloseBtn.classList.add('tingle-modal__close')

            this.modalCloseBtnIcon = document.createElement('span')
            this.modalCloseBtnIcon.classList.add('tingle-modal__closeIcon')
            this.modalCloseBtnIcon.innerHTML = closeIcon()

            this.modalCloseBtnLabel = document.createElement('span')
            this.modalCloseBtnLabel.classList.add('tingle-modal__closeLabel')
            this.modalCloseBtnLabel.innerHTML = this.opts.closeLabel

            this.modalCloseBtn.appendChild(this.modalCloseBtnIcon)
            this.modalCloseBtn.appendChild(this.modalCloseBtnLabel)
        }

        // modal
        this.modalBox = document.createElement('div')
        this.modalBox.classList.add('tingle-modal-box')

        // modal box content
        this.modalBoxContent = document.createElement('div')
        this.modalBoxContent.classList.add('tingle-modal-box__content')

        this.modalBox.appendChild(this.modalBoxContent)

        if (this.opts.closeMethods.indexOf('button') !== -1) {
            this.modal.appendChild(this.modalCloseBtn)
        }

        this.modal.appendChild(this.modalBox)

    }

    function _buildFooter() {
        this.modalBoxFooter = document.createElement('div')
        this.modalBoxFooter.classList.add('tingle-modal-box__footer')
        this.modalBox.appendChild(this.modalBoxFooter)
    }

    function _bindEvents() {

        this._events = {
            clickCloseBtn: this.close.bind(this),
            clickOverlay: _handleClickOutside.bind(this),
            resize: this.checkOverflow.bind(this),
            keyboardNav: _handleKeyboardNav.bind(this)
        }

        if (this.opts.closeMethods.indexOf('button') !== -1) {
            this.modalCloseBtn.addEventListener('click', this._events.clickCloseBtn)
        }

        this.modal.addEventListener('mousedown', this._events.clickOverlay)
        window.addEventListener('resize', this._events.resize)
        document.addEventListener('keydown', this._events.keyboardNav)
    }

    function _handleKeyboardNav(event) {
        // escape key
        if (this.opts.closeMethods.indexOf('escape') !== -1 && event.which === 27 && this.isOpen()) {
            this.close()
        }
    }

    function _handleClickOutside(event) {
        // if click is outside the modal
        if (this.opts.closeMethods.indexOf('overlay') !== -1 && !_findAncestor(event.target, 'tingle-modal') &&
        event.clientX < this.modal.clientWidth) {
            this.close()
        }
    }

    function _findAncestor(el, cls) {
        while ((el = el.parentElement) && !el.classList.contains(cls));
        return el
    }

    function _unbindEvents() {
        if (this.opts.closeMethods.indexOf('button') !== -1) {
            this.modalCloseBtn.removeEventListener('click', this._events.clickCloseBtn)
        }
        this.modal.removeEventListener('mousedown', this._events.clickOverlay)
        window.removeEventListener('resize', this._events.resize)
        document.removeEventListener('keydown', this._events.keyboardNav)
    }

    /**
     * Sets the value of the attribute to the HTMLElement.
     *
     * @param       {HTMLElement}       element
     * @param       {string}            attribute
     * @param       {string|array|null} value
     * @return      {boolean}
     */
    function _setAttributeValue(element, attribute, value) {
        if (! (element instanceof HTMLElement)) {
            return false;
        }

        if (attribute == 'classList' || attribute == 'className') {
            if (Array.isArray(value) && value.length) {
                element.classList.add(value);
            } else if (value == null) {
                element.removeAttribute('class');
            } else if (typeof value === 'string') {
                element.setAttribute('class', value);
            } else {
                return false;
            }
        } else if (attribute == 'innerHTML' && typeof value === 'string') {
            element.innerHTML = value;
        } else if (attribute in element) {
            element[attribute] = value;
        } else if (typeof value === 'string' || typeof value === 'number') {
            element.setAttribute(attribute, value);
        } else {
            return false;
        }

        return true;
    }

    /**
     * Returns the value of the attribute of the element.
     *
     * @param       {HTMLElement} element
     * @param       {string}      attribute
     * @return      {string|array}
     */
    function _getAttributeValue(element, attribute) {
        if (! (element instanceof HTMLElement || typeof attribute === 'string')) {
            return null;
        }

        if (attribute == 'classList') {
            return element.className.split(' ');
        } else if (attribute == 'className') {
            return element.className;
        } else if (attribute == 'innerHTML') {
            return element.innerHTML;
        } else if (attribute in element) {
            return element[attribute];
        } else if (element.hasAttribute(attribute)) {
            return element.getAttribute(attribute);
        }

        return null;
    }

    /* ----------------------------------------------------------- */
    /* == helpers */
    /* ----------------------------------------------------------- */

    function extend() {
        for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    arguments[0][key] = arguments[i][key]
                }
            }
        }
        return arguments[0]
    }

    // Polyfills
    Number.isInteger = Number.isInteger || function(value) {
      return typeof value === 'number'
             && Number.isFinite(value)
             && !(value % 1);
    };

    Number.isFinite = Number.isFinite || function(value) {
      return typeof value === 'number' && isFinite(value);
    }

    if (typeof Object.assign !== 'function') {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, "assign", {
            value: function assign(target, varArgs) { // .length of function is 2
              'use strict';
              if (target === null || target === undefined) {
                throw new TypeError('Cannot convert undefined or null to object');
              }

              var to = Object(target);

              for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];

                if (nextSource !== null && nextSource !== undefined) {
                  for (var nextKey in nextSource) {
                    // Avoid bugs when hasOwnProperty is shadowed
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                      to[nextKey] = nextSource[nextKey];
                    }
                  }
                }
              }
              return to;
            },
            writable: true,
            configurable: true
        });
      }

    /* ----------------------------------------------------------- */
    /* == return */
    /* ----------------------------------------------------------- */

    return {
        modal: Modal
    }

}))

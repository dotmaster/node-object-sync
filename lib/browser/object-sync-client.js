(function() {
  var EventEmitter, ObjectSync, default_max_listeners, isArray;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  window.console || (window.console = {});
  console.log || (console.log = function() {});
  console.error || (console.error = function() {});
  console.trace || (console.trace = function() {});
  console.dir || (console.dir = function() {});
  if (!Array.indexOf) {
    Array.prototype.indexOf = function(obj) {
      var i, _ref;
      for (i = 0, _ref = this.length; (0 <= _ref ? i <= _ref : i >= _ref); (0 <= _ref ? i += 1 : i -= 1)) {
        if (this[i] === obj) {
          return i;
        }
      }
      return -1;
    };
  }
  isArray = Array.isArray || function(obj) {
    return obj.constructor.toString().indexOf("Array") !== -1;
  };
  default_max_listeners = 10;
  EventEmitter = (function() {
    function EventEmitter() {}
    EventEmitter.prototype.setMaxListeners = function(n) {
      return this._events.maxListeners = n;
    };
    EventEmitter.prototype.emit = function(type) {
      var args, handler, listener, listeners, _i, _len, _ref, _ref2, _ref3, _ref4, _results;
      if (type === 'error') {
        if (!isArray(((_ref = this._events) != null ? _ref.error : void 0) != null) || !((_ref2 = this._events) != null ? _ref2.error.length : void 0)) {
          if (arguments[1] instanceof Error) {
            throw arguments[1];
          } else {
            throw new Error(arguments[1].code);
          }
          return false;
        }
      }
      handler = (_ref3 = this._events) != null ? _ref3[type] : void 0;
      if (!((_ref4 = this._events) != null ? _ref4[type] : void 0)) {
        return false;
      }
      if (typeof handler === 'function') {
        switch (arguments.length) {
          case 1:
            handler.call(this);
            break;
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[2]);
            break;
          default:
            args = Array.prototype.slice.call(arguments, 1);
            handler.apply(this, args);
        }
        return true;
      } else if (isArrayhandler) {
        args = Array.prototype.slice.call(arguments, 1);
        listeners = handler.slice();
        _results = [];
        for (_i = 0, _len = listeners.length; _i < _len; _i++) {
          listener = listeners[_i];
          _results.push(listener.apply(this, args));
        }
        return _results;
      } else {
        return false;
      }
    };
    EventEmitter.prototype.addListener = function(type, listener) {
      var m;
      if (typeof listener !== 'function') {
        throw new Error('addListener only takes instances of Function');
      }
      this._events || (this._events = {});
      this.emit('newListener', type, listener);
      if (!this._events[type]) {
        this._events[type] = listener;
      } else if (isArray(this._events[type])) {
        if (!this._events[type].warned) {
          m = 0;
          if (this._events.maxListeners !== void 0) {
            m = this._events.maxListeners;
          } else {
            m = default_max_listeners;
          }
          if (m && m > 0 && this._events[type].length > m) {
            this._events[type].warned = true;
            console.error("warning: possible EventEmitter memory" + ("leak detected. " + this._events[type].length + " listeners"));
            console.trace();
          }
        }
        this._events[type].push(listener);
      } else {
        this._events[type] = [this._events[type], listener];
      }
      return this;
    };
    EventEmitter.prototype.on = EventEmitter.prototype.addListener;
    EventEmitter.prototype.once = function(type, listener) {
      var g;
      g = __bind(function() {
        this.removeListener(type, g);
        return listener.apply(this, arguments);
      }, this);
      this.on(type, g);
      return this;
    };
    EventEmitter.prototype.removeListener = function(type, listener) {
      var i, list, _ref;
      if (typeof listener !== 'function') {
        throw new Error('removeListener only takes instances of Function');
      }
      list = (_ref = this._events) != null ? _ref[type] : void 0;
      if (!list) {
        return this;
      }
      if (isArray(list)) {
        i = list.indexOf(listener);
        if (i < 0) {
          return this;
        }
        list.splice(i, 1);
        if (list.length === 0) {
          delete this._events[type];
        }
      } else if (this._events[type] === listener) {
        delete this._events[type];
      }
      return this;
    };
    EventEmitter.prototype.removeAllListeners = function(type) {
      var _ref;
      if (type && ((_ref = this._events) != null ? _ref[type] : void 0)) {
        this._events[type] = null;
      }
      return this;
    };
    EventEmitter.prototype.listeners = function(type) {
      var _base;
      this._events || (this._events = {});
      (_base = this._events)[type] || (_base[type] = []);
      if (!isArray(this._events[type])) {
        this._events[type] = [this._events[type]];
      }
      return this._events[type];
    };
    return EventEmitter;
  })();
  ObjectSync = (function() {
    __extends(ObjectSync, EventEmitter);
    function ObjectSync(options) {
      var key, val;
      if (options == null) {
        options = {};
      }
      this._onMessage = __bind(this._onMessage, this);;
      this._onDisconnect = __bind(this._onDisconnect, this);;
      this._onConnect = __bind(this._onConnect, this);;
      this.options = {
        auto_reconnect: true,
        verbose: false,
        reconnect_timeout: 1000
      };
      for (key in options) {
        val = options[key];
        this.options[key] = val;
      }
      this._socket = new io.Socket;
      this._socket.on('connect', this._onConnect);
      this._socket.on('message', this._onMessage);
      this._socket.on('disconnect', this._onDisconnect);
      this._reconnect_timer = null;
      this._reconnect_attempts = 0;
      this._request_counter = 1;
      this._objects = {};
    }
    ObjectSync.prototype.allObjects = function() {
      return this._objects;
    };
    ObjectSync.prototype.fetch = function(id, cb) {
      if (!isArray(id)) {
        id = [id];
      }
      return this._doRequest('fetch', id, cb);
    };
    ObjectSync.prototype.save = function(obj, cb) {
      return this._doRequest('save', obj, cb);
    };
    ObjectSync.prototype.destroy = function(id, cb) {
      return this._doRequest('destroy', id, cb);
    };
    ObjectSync.prototype.connect = function() {
      this._reconnect_timer = setTimeout((__bind(function() {
        if (!this._socket.connecting && !this._socket.connected) {
          if (this.options.verbose) {
            this.log('attempting to connect');
          }
          this._socket.connect();
        }
        if (this.options.auto_reconnect) {
          return this.connect();
        }
      }, this)), this._reconnect_attempts * 1000);
      return this._reconnect_attempts += 1;
    };
    ObjectSync.prototype.log = function() {
      if (this.options.verbose) {
        return console.log.apply(console, arguments);
      }
    };
    ObjectSync.prototype.isConnected = function() {
      return this._socket.connected;
    };
    ObjectSync.prototype._onConnect = function() {
      if (this.options.verbose) {
        this.log('Connected', arguments);
      }
      this._reconnect_attempts = 0;
      clearTimeout(this._reconnect_timer);
      this._reconnect_timer = null;
      return this.emit('connect');
    };
    ObjectSync.prototype._onDisconnect = function() {
      if (this.options.verbose) {
        this.log('Disconnected', arguments);
      }
      if (this.options.auto_reconnect) {
        this.connect();
      }
      return this.emit('disconnect');
    };
    ObjectSync.prototype._onMessage = function(payload) {
      var error, ev_param, result, type;
      if (this.options.verbose) {
        this.log('Message', arguments);
      }
      type = payload.type;
      error = null;
      if (payload.code !== 'ok') {
        error = payload.error;
      }
      result = payload.result;
      if (error) {
        this.emit('error', error);
      }
      this._callReqCallback(payload.client_req_id, [error, result]);
      ev_param = payload.obj;
      switch (type) {
        case 'destroy':
          ev_param = payload.id;
          delete this._objects[payload.id];
          break;
        case 'fetch':
        case 'update':
        case 'create':
          this._objects[payload.obj.id] = payload.obj;
      }
      if (type !== 'response') {
        return this.emit(type, ev_param);
      }
    };
    ObjectSync.prototype._doRequest = function(type, obj_or_ids, cb) {
      var payload;
      payload = {
        type: type,
        client_req_id: this._request_counter
      };
      if (type === 'fetch' || type === 'destroy') {
        payload.id = obj_or_ids;
      } else {
        payload.obj = obj_or_ids;
      }
      if (typeof cb === 'function') {
        this._registerReqCallback(this._request_counter, cb);
      }
      this._request_counter++;
      return this._socket.send(payload);
    };
    ObjectSync.prototype._registerReqCallback = function(req_id, cb) {
      this._req_callbacks || (this._req_callbacks = {});
      return this._req_callbacks[req_id] = cb;
    };
    ObjectSync.prototype._callReqCallback = function(req_id, args) {
      var fn;
      fn = this._req_callbacks[req_id];
      if (typeof fn === 'function') {
        fn.apply(this, args);
      }
      return delete this._req_callbacks[req_id];
    };
    return ObjectSync;
  })();
  window.ObjectSync = ObjectSync;
}).call(this);

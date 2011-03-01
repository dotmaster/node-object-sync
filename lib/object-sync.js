(function() {
  var EventEmitter, ObjectSync, socket_io;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __slice = Array.prototype.slice;
  socket_io = require('socket.io');
  EventEmitter = require('events').EventEmitter;
  ObjectSync = (function() {
    __extends(ObjectSync, EventEmitter);
    ObjectSync.listen = function(http_server, options) {
      var sync;
      if (options == null) {
        options = {};
      }
      options.server = http_server;
      sync = new ObjectSync(options);
      sync.listen();
      return sync;
    };
    function ObjectSync(options) {
      this._update = __bind(this._update, this);;
      this._create = __bind(this._create, this);;
      this._destroy = __bind(this._destroy, this);;
      this._fetch = __bind(this._fetch, this);;
      this._onConnect = __bind(this._onConnect, this);;
      this._onDisconnect = __bind(this._onDisconnect, this);;
      this._onMessage = __bind(this._onMessage, this);;      var action, key, val, _i, _len, _ref;
      ObjectSync.__super__.constructor.call(this);
      this.options = {
        server: null,
        update: __bind(function() {
          return this.log('missing update handler', arguments[0]);
        }, this),
        create: __bind(function() {
          return this.log('missing create handler', arguments[0]);
        }, this),
        destroy: __bind(function() {
          return this.log('missing destroy handler', arguments[0]);
        }, this),
        fetch: __bind(function() {
          return this.log('missing fetch handler', arguments[0]);
        }, this)
      };
      for (key in options) {
        val = options[key];
        this.options[key] = val;
      }
      _ref = ['update', 'create', 'destroy', 'fetch'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        action = _ref[_i];
        this.setHandler(action, this.options[action]);
      }
    }
    ObjectSync.prototype.listen = function() {
      if (!this.options.server) {
        throw new Error('No server in options!');
      }
      this.log('hooking up to server. booyah.');
      this._socket = socket_io.listen(this.options.server);
      this._socket.on('clientConnect', this._onConnect);
      this._socket.on('clientMessage', this._onMessage);
      return this._socket.on('clientDisconnect', this._onDisconnect);
    };
    ObjectSync.prototype.save = function(obj, cb) {
      if (obj.id) {
        return this._update(obj, 0, cb || function() {});
      } else {
        return this._create(obj, 0, cb || function() {});
      }
    };
    ObjectSync.prototype.destroy = function(id, cb) {
      return this._destroy(id, 0, cb || function() {});
    };
    ObjectSync.prototype.fetch = function(ids, cb) {
      return this._fetch(ids, 0, cb || function() {});
    };
    ObjectSync.prototype._onMessage = function(msg, client) {
      var client_cb;
      if (!(typeof client === 'object' && msg.type && msg.client_req_id)) {
        return this.log(new Error('invalid message received'), arguments);
      }
      client_cb = __bind(function(err, result) {
        var response;
        response = {
          code: 'ok',
          result: result,
          type: 'response',
          client_req_id: msg.client_req_id
        };
        if (err) {
          response.code = 'error';
          response.error = err;
        }
        return client.send(response);
      }, this);
      switch (msg.type) {
        case 'save':
          if (typeof msg.obj.id === 'undefined') {
            return this._create(msg.obj, client, client_cb);
          } else {
            return this._update(msg.obj, client, client_cb);
          }
          break;
        case 'destroy':
          return this._destroy(msg.id, client, client_cb);
        case 'fetch':
          return this._fetch(msg.id, client, client_cb);
      }
    };
    ObjectSync.prototype._onDisconnect = function(client) {
      return this.emit('disconnect', client.sessionId);
    };
    ObjectSync.prototype._onConnect = function(client) {
      return this.emit('connect', client.sessionId);
    };
    ObjectSync.prototype._broadcast = function(payload) {
      var key, response, val;
      response = {
        code: 'ok'
      };
      for (key in payload) {
        val = payload[key];
        response[key] = val;
      }
      return this._socket.broadcast(response);
    };
    ObjectSync.prototype._fetch = function(ids, client, client_cb) {
      return this._handle('fetch', [ids, client.sessionId], client_cb);
    };
    ObjectSync.prototype._destroy = function(id, client, client_cb) {
      return this._handle('destroy', [id, client.sessionId], __bind(function(err, fire_event) {
        if (fire_event == null) {
          fire_event = true;
        }
        client_cb.apply(null, arguments);
        if (fire_event && !err) {
          return this._broadcast({
            type: 'destroy',
            id: id
          });
        }
      }, this));
    };
    ObjectSync.prototype._create = function(obj, client, client_cb) {
      return this._handle('create', [obj, client.sessionId], __bind(function(err, obj, fire_event) {
        if (fire_event == null) {
          fire_event = true;
        }
        client_cb.apply(null, arguments);
        if (fire_event && !err) {
          return this._broadcast({
            type: 'create',
            obj: obj
          });
        }
      }, this));
    };
    ObjectSync.prototype._update = function(obj, client, client_cb) {
      return this._handle('update', [obj, client.sessionId], __bind(function(err, obj, fire_event) {
        if (fire_event == null) {
          fire_event = true;
        }
        client_cb.apply(null, arguments);
        if (fire_event && !err) {
          return this._broadcast({
            type: 'update',
            obj: obj
          });
        }
      }, this));
    };
    ObjectSync.prototype.setHandler = function(ev, handler) {
      this._handlers || (this._handlers = {});
      return this._handlers[ev] = handler;
    };
    ObjectSync.prototype._handle = function(ev, args, cb) {
      var _ref;
      return (_ref = this._handlers)[ev].apply(_ref, __slice.call(args).concat([cb]));
    };
    ObjectSync.prototype.log = function() {
      return console.log.apply(console, arguments);
    };
    return ObjectSync;
  })();
  module.exports = ObjectSync;
}).call(this);

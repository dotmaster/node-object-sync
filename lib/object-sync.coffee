socket_io = require 'socket.io'
Filter = require './filter'
_ = require './underscore' #needed for isEqual deep equality testing

class ObjectSync extends (require 'nodeBase' )
  
  
  # Wraps a server and returnes ObjectSync object.
  @listen: (http_server, options={}) ->
    options.server = http_server
    sync = new ObjectSync options
    sync.listen()
    return sync
  
  constructor: (options) ->

    @defaults =
      server:  null
      change:  => @log 'missing change handler', arguments[0]
      update:  => @log 'missing update handler', arguments[0]
      create:  => @log 'missing create handler', arguments[0]
      destroy: => @log 'missing destroy handler', arguments[0]
      fetch:   => @log 'missing fetch handler', arguments[0]
      _file:   => @log 'missing fetch handler', arguments[0]      
    super(arguments...)    
    #for key, val of options #handled by nodeBase
    #  @options[key] = val
    
    #st the default action to be unhandled
    for action in ['update', 'change', 'create', 'destroy', 'fetch', '_file']
      @setHandler action, @options[action]
  
  # Starts listening on the wrapped server. If no server was passed
  # a new socket.io server is created
  # 
  # TODO: remove dependency on HTTP server
  listen: ->
    throw new Error 'No server in options!' unless @options.server

    @log 'hooking up to server. booyah.'
    @_socket = socket_io.listen @options.server
    @_clients = @_socket.listener.clients;

    @_socket.on 'clientConnect', @_onConnect

    @_socket.on 'clientMessage', @_onMessage
    
    @_socket.on 'clientDisconnect', @_onDisconnect
    
  ###
    var event = new SynapticEvent({ 'type': 'change', 
        'forKey': '', 
        'linkedObject': value, 
        'unlinkedObject': oldValue,                 
        'self':this,
        'modTime': this[K]['attrsMeta'][key].modTime,
        'eventId': uniqueEventId() 
      });
      change object {type: link/unlink/change id:objId, attr:attr, event:event}
  ###

  change: (c, cb) ->
    @_change c, 0, (cb or ->)
  save: (obj, cb) ->
    if obj.id then @_update obj, 0, (cb or ->)
    else @_create obj, 0, (cb or ->)
  destroy: (id,  cb) -> @_destroy id, 0, (cb or ->)
  fetch: (ids, cb) -> @_fetch ids, 0, (cb or ->)
  
  ###
   Message =
     type: 'save' or 'destroy' or 'fetch', NEW: 'register', 'unregister', 'change', '_file', 'error', 'result'
     obj: the object to save, except of change the change object containingthe unique id of the object and the change as an event
   register comes with a filter object to register
     id: the ids  to destroy/fetch
     client_req_id: id the client uses to reference this request for cb
   If the object has no id, it will be created, otherwise updated
  ###
  _onMessage: (msg, client) =>
    if not (typeof client is 'object' and msg.type and msg.client_req_id)
      return @log new Error('invalid message received'), arguments
    
    # construct cb function that will respond directly to the client
    # TODO obfuscate stack trace
    client_cb = (err, result) =>
      response =
        code: 'ok'
        result: result
        type: 'response'
        client_req_id: msg.client_req_id
      if err
        response.code = 'error'
        response.error = err
      @_send response
    
    switch msg.type
      when 'register'
        @register msg.obj, client, client_cb
      when 'unregister'
        @unregister msg.obj, client, client_cb          
      when '_file'
        @_file msg.obj, client, client_cb    
      when 'change'
        @_change msg.obj, client, client_cb    
      when 'save'
        if typeof msg.obj.id is 'undefined'
          @_create msg.obj, client, client_cb
        else @_update msg.obj, client, client_cb
      when 'destroy'
        @_destroy msg.id, client, client_cb
      when 'fetch'
        @_fetch msg.id, client, client_cb
      
  _onDisconnect: (client) =>
    @emit 'disconnect', client.sessionId

  _onConnect: (client) =>
    @emit 'connect', client.sessionId
  
  __broadcast: (response, except) ->
    for own clientId, client of @_clients
      if not except or (typeof except is 'number' or typeof except is 'string') and  clientId isnt except\
        or (Array.isArray(except) and except.indexOf(clientId) isnt -1)
          @_sendFiltered(client, response)
          
  _sendFiltered: (client, message) ->
    if @_filter client.filters, message
      client.send message
    else @log 'message #{message} filtered out from client #{client.sessionId}', client, message
  
  _filter: (filters, message) ->  
    for filter in filters
      if not filter.test message then return false
    return true

  _broadcast: (payload) ->
    response =
      code: 'ok'
    for key, val of payload
      response[key] = val

    @__broadcast response
    
    
  _fetch: (ids, client, client_cb) =>
    @_handle 'fetch', [ids, client.sessionId], client_cb

  _destroy: (id, client, client_cb) =>
    @_handle 'destroy', [id, client.sessionId], (err, fire_event=true) =>
      client_cb arguments...
      if fire_event and not err
        @_broadcast
          type: 'destroy'
          id: id
  
  #Register Functions
  register: (filter, client, client_cb) =>
    err = null
    filter = new Filter(filter)
    filters = client.filters or {};
    filters[filter.id] = filter;
    @info "Client #{client.sessionId}  registered for filtered messages", JSON.stringify filter
    client_cb null, filter, fire_event=true

  unregister: (filter, client, client_cb) =>
    filters = client.filters or [];
    if typeof filter is 'number'
      f = filters[filter];
    else #if we are not searching for the filter by id make a deep traversal to find the filter
      if _.isEqual(_f.filter, filter) then f=_f; break for _f in filters
    if not f? 
      return @warn 'filter to remove was not in list of filters for client', JSON.stringify filter;
    delete filters[f.id];
    @info "Client #{client.sessionId}  unregistered for receiving messages from filter ", JSON.stringify filter
    client_cb null, f, fire_event=true
    
  _change: (c, client, client_cb) =>
    @_handle 'change', [c, client.sessionId], (err, c, fire_event=true) =>
      client_cb arguments...
      if fire_event and not err
        @_broadcast 
          type: 'change'
          obj: c

  _create: (obj, client, client_cb) =>
    @_handle 'create', [obj, client.sessionId], (err, obj, fire_event=true) =>
      client_cb arguments...
      if fire_event and not err
        @_broadcast 
          type: 'create'
          obj: obj
      
  _update: (obj, client, client_cb) =>
    @_handle 'update', [obj, client.sessionId], (err, obj, fire_event=true) =>
      client_cb arguments...
      if fire_event and not err
        @_broadcast
          type: 'update'
          obj: obj 
 
  # Sets the function to handle event of type ev. Possible event types
  # are fetch, create, update, destroy.
  # 
  # Parameters for handlers: create and update take an object and destroy
  # and fetch take an id. All handlers take a callback as last param.
  setHandler: (ev, handler) ->
    @_handlers or= {}
    @_handlers[ev] = handler

  _handle: (ev, args, cb) ->
    #try
      @_handlers[ev](args..., cb)
    #catch e
    #  cb e 

module.exports = ObjectSync
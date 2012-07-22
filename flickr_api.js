(function() {
	/*
	*
	* Flickr API Module 2
	* I make calling the Flickr API easier. Get it?
	*
	* http://code.flickr.com
	*
	*/
	
	window.F = window.F || {};
	
	F.log = F.log || function(msg, type) {
		if(window.console && window.console.log) {
			window.console.log('Flickr API Error:', type, msg);
		}
	}
	
	F.FlickrAPI = function( config ) {
		
		/***
		*   Private Methods
		***/
		
		/*
		*  Type checks
		*/
		function isObject( t ){
			return Object.prototype.toString.call( t ) === "[object Object]";
		}
		
		function isArray( t ){
			return Object.prototype.toString.call( t ) === "[object Array]";
		}

		function isFunction( t ){
			return Object.prototype.toString.call( t ) === "[object Function]";
		}

		function isString( t ){
			return Object.prototype.toString.call( t ) === "[object String]";
		}
		
		/*
		*  Merge multiple objects. Each argument
		*  supersedes the one before
		*/
		function merge() {
			
			var new_object = {},
			    argument;
			
			for(var i=0, l=arguments.length; l > i; i++) {
			
				argument = arguments[ i ];
				
				for( var ii in argument ) {

					if( argument.hasOwnProperty( ii ) ) {

						new_object[ ii ] = argument[ ii ];

					}

				}
				
			}
			
			return new_object;
			
		}
		
		function serializeObject( object ) {
		    	var string_out = '';
			for (var i in object) {
				if(object.hasOwnProperty(i)) {
					string_out += i + '=' + object[i] + '&';
				}
			}
			return string_out.substr( 0, string_out.length - 1 );
		}
		
		function getNewTransactionId() {
			var out = transaction_id;
			transaction_id++;
			return out;
		}
		
		/***
		* Globals
		***/
		
		F.flickrAPITransactions = {};
		F.flickrAPIResponses    = {};
		
		var public_interface, default_config,
		    subscriptions  = {},
		    transaction_id = 1,
		    transactions   = F.flickrAPITransactions;
		
		/*
		*  Merge defaults into the config passed on 
		*  instantiation
		*/
		config = merge( default_config, {
			api_uri       : 'http://api.flickr.com/services/rest/',
			api_arguments : {
				format     :'json',
				clientType :'js-flickrapi-module',
				api_key    : config.api_key
			},
			string_prefix : 'flapi2cb' + (new Date()).getTime()
		} );
		
		/***
		*   Not So Private Methods
		***/
		
		/*
		*  Subscribe to events
		*/
		function subscribe_to_event( event, callback, scope ) {
			
			if( isObject( subscriptions )) {
			
				if( !isArray( subscriptions[ event ] ) ) {
				
					subscriptions[ event ] = [];
				
				}
				
				subscriptions[ event ].push( [ callback, scope ] );
			
			}
			
		}
		
		function fire_event( event, args ) {
			
			var subs, sub;
			
			if( isArray( subscriptions[ event ] ) ) {
			
				subs = subscriptions[ event ];
				
				for( var i=0, l=subs.length; l > i; i++ ) {
					
					sub = subs[i];
				
					if( isArray( sub ) && sub.length === 2 && isFunction( sub[ 0 ] ) ) {
					
						sub[0].apply( sub[1] || window, [{
							event : event,
							args  : args
						}] );
					
					}
				
				}
				
			}
			
		}
		
		function unsubscribe_from_event( method, callback ) {
			
			var new_array = [],
			    subs, sub;
			
			if( isArray( subscriptions[ event ] ) ) {
				
				subs = subscriptions[ event ];
				
				for( var i=0, l=subs.length; l > i; i++ ) {
					
					sub = subs[i];
						
					if( sub[0] !== callback ) {
						
						new_array.push( sub );
						
					}
					
				}
				
				subscriptions[ event ] = new_array;
				
			}
			
		}
		
		function processAPIResponse( api_response, callback, scope ) {
			
			scope = scope || this;
			
			if( isObject( api_response.args ) && isObject( api_response.args.response ) && api_response.args.response.stat !== 'fail' ) {
				
				callback.apply( scope, [ api_response.args.response ] );
				
			} else {
				
				F.log( api_response.args.response.message );
				
			}
			
		}
		
		function do_post_request( method, args, callback, scope ) {
			
		}
		
		function do_get_request( method, args, callback, scope ) {
			
			var new_node       = document.createElement( 'script' ),
			    first_node     = document.getElementsByTagName( 'script' )[ 0 ],
			    transaction_id = getNewTransactionId(),
			    function_name  = config.string_prefix + '_' + transaction_id,
			    event_name     = 'get-request-complete';
			
			args.method = method;
			
			args = merge( config.api_arguments, args, {
				
				jsoncallback : 'F.flickrAPITransactions.' + function_name
			
			} );
			
			subscribe_to_event( event_name, function( r ) {
				
				processAPIResponse( r, callback, scope );
				
			}, scope );
			
			F.flickrAPITransactions[ function_name ] = function( r ) {
				
				fire_event( event_name, {
					request_id     : transaction_id,
					response       : r,
					request_args   : args,
					request_method : method
				} );
				
				delete F.flickrAPITransactions[ function_name ];
				
				unsubscribe_from_event( event_name, callback );
				
			};
			
			new_node.id  = config.string_prefix + '_node';
			new_node.src = config.api_uri + '?' + serializeObject(args);
			
			/*
			*  Cute trick to make sure this works in many implementations
			*  even without a body or head tag.
			*/
			first_node.parentNode.insertBefore( new_node, first_node );

		}
		
		function callMethod( method, args, callback, scope ) {
			
			var scope = scope || this;
			
			/*
			* Decide if this is a get or post request.
			*/
			if ( (/(?:add|create|delete|edit|mute|post|record|remove|set|submit|unmute|move|sort|hide|block|unblock|insert)[a-zA-Z]*$/.test( method ) || config.force_post ) &&  !config.force_get ) {
				
				args.nojsoncallback=1;
				return do_post_request.apply( scope, arguments );
				
			} else {
				
				return do_get_request.apply( scope, arguments );
				
			}
			
		}
		
		/***
		*   Public Interface
		***/
		
		public_interface = {
			on         : subscribe_to_event,
			callMethod : callMethod
		}
		
		return public_interface;
	}
}());
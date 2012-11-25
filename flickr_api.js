(function() {
	/*
	*
	* Flickr API Module 2
	* I make calling the Flickr API easier. Get it?
	*
	* http://code.flickr.com
	*
	*/
	
	F = {};
	
	F.log = F.log || function(msg, type) {
		if(window.console && window.console.error) {
			window.console.error( msg );
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
		
		function getXHR() {
			var crossxhr = false;
			
			if( window.XMLHttpRequest ) {
				crossxhr = new XMLHttpRequest();
				
				if( crossxhr.overrideMimeType ) {
					crossxhr.overrideMimeType( 'text/xml' );
				}
				
			} else if( window.ActiveXObject ) {
			
				try {
					crossxhr = new ActiveXObject('Msxml2.XMLHTTP');
				} catch( e ) {
			
					try {
						crossxhr = new ActiveXObject('Microsoft.XMLHTTP');
					} catch( e ) {
						crossxhr = false;
					}
					
				}
			}
			
			return crossxhr;
		}
		
		/***
		* Globals
		***/
		
		F.flickrAPI2Transactions = {};
		F.flickrAPIResponses     = {};
		
		var public_interface, default_config,
		    subscriptions  = {},
		    transaction_id = 1,
		    transactions   = F.flickrAPI2Transactions;
		
		/*
		*  Merge defaults into the config passed on 
		*  instantiation
		*/
		config = merge( default_config, {
			api_uri       : 'http://api.flickr.com/services/rest/',
			api_arguments : {
				format     : 'json',
				clientType : 'js-flickrapi-module',
				api_key    : config.api_key
			},
			string_prefix : 'flapi2cb' + ( new Date() ).getTime(),
			timout : 10000
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
		
		function unsubscribe_from_event( event_name, callback ) {
			
			var new_array = [],
			    subs, sub;
			
			if( isArray( subscriptions[ event_name ] ) ) {
				
				subs = subscriptions[ event_name ];
				
				for( var i=0, l=subs.length; l > i; i++ ) {
					
					sub = subs[i];
						
					if( sub[0] !== callback ) {
						
						new_array.push( sub );
						
					}
					
				}
				
				subscriptions[ event_name ] = new_array;
				
			}
			
		}
		
		function processAPIResponse( api_response, callback, scope ) {
			
			scope = scope || this;
			
			if( isObject( api_response.args ) && isObject( api_response.args.response ) && api_response.args.response.stat !== 'fail' ) {
				
				if( isObject( callback ) && isFunction( callback.success ) ) {
					
					callback.success.apply( scope, [ api_response.args.response ] );
					
				} else if( isFunction( callback ) ) {
					
					callback.apply( scope, [ api_response.args.response ] );
					
				} else {
					
					F.log('API request was successful but there was no valid callback to use');
					
				}
				
			} else {
				
				if( isObject( callback ) && isFunction(callback.failure) ) {
					
					callback.failure.apply( scope, [ api_response.args.response ] );
					
				} else {
					
					F.log( api_response.args.response.message );
					
				}
				
			}
			
		}
		
		function do_post_request( method, args, callback, scope ) {
			
			var client   = new getXHR();
			
			client.onreadystatechange = function () {
				
				if( this.readyState == this.DONE ) {
					
					if( this.status == 200 && this.responseText.length ) {
						// success!
						eval( 'var response=' + this.responseText );
						processAPIResponse( { args : response }, callback, scope );
						return;
					}
			
					// something went wrong
					console.log('fail');
					
				}
			};
			
			client.open( 'POST', config.api_uri + '?' + serializeObject( merge( config.api_arguments, args, { method : method } ) ) );
			client.send();
		}
		
		function do_get_request( method, args, callback, scope ) {
			
			var new_node       = document.createElement( 'script' ),
			    first_node     = document.getElementsByTagName( 'script' )[ 0 ],
			    transaction_id = getNewTransactionId(),
			    function_name  = config.string_prefix + '_' + transaction_id,
			    event_name     = 'get-request-complete',
			    scope          = scope || this,
			    timeout_id, wrapped_callback;
			
			args.method = method;
			
			args = merge( config.api_arguments, args, {
				
				jsoncallback : 'F.flickrAPI2Transactions.' + function_name
			
			} );
			
			wrapped_callback = function( r ) {
				
				processAPIResponse( r, callback, scope );
				
			};
			
			subscribe_to_event( event_name, wrapped_callback, scope );
			
			timeout_id = setTimeout( function() {
			
				if( isObject( callback ) && isFunction( callback.timeout ) ) {
					
					callback.timeout.apply( scope, args );
					
				} else {
					
					F.log( 'Request timed out.' );
					unsubscribe_from_event( event_name, wrapped_callback );
					
				}
			
			}, config.timout );
			
			F.flickrAPI2Transactions[ function_name ] = function( r ) {
				
				fire_event( event_name, {
					request_id     : transaction_id,
					response       : r,
					request_args   : args,
					request_method : method
				} );
				
				clearTimeout( timeout_id );
				
				delete F.flickrAPI2Transactions[ function_name ];
				unsubscribe_from_event( event_name, wrapped_callback );
				
			};
			
			new_node.id  = config.string_prefix + '_node';
			new_node.src = config.api_uri + '?' + serializeObject( args );
			
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
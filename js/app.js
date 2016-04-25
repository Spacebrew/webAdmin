// UTILS
function compareRoutes( route1, route2 ){
	var cn = route1.clientName == route2.clientName;
	var ra = route1.remoteAddress == route2.remoteAddress;
	var t = route1.type == route2.type;
	var n = route1.name == route2.name;
	return cn && ra && t && n;
}

// Main app logic

var app = angular.module("admin", []);

// each sub should *probably* have its own controller...
app.controller("adminCtl", function($scope, $timeout) {
	$scope.filter = "test";

	/*
		Object containing all pubsub info
	 	Structure example, an app routed to itself:
	 	{
			'CoolApp:192.168.1.1':{
				'description':"it's cool",
				'name':'CoolApp',
				'publish':{
					'messages':[
						{
							'default':0,
							'name':'button',
							'routes':[
								{
									'clientName':'CoolApp',
									'name':'boolListener'
									'remoteAddress':'192.168.1.1',
									'type':'boolean'
								}
							],
							'type':'boolean'
						}
					]
				},
				'remoteAddress':'192.168.1.1',
				'subscribe':{
					'messages':[
						{
							'name':'boolListener',
							'routes':[
								{
									'clientName':'CoolApp',
									'name':'button'
									'remoteAddress':'192.168.1.1',
									'type':'boolean'
								}
							],
							'type':'boolean'
						}
					]
				}
			}
	 	}
	*/
	$scope.clients = {};

	// canvas vars
	var canvas, ctx;
	var paths = {};

	// spacebrew vars
	var sb = null;


	/**********************************************
		SPACEBREW
	**********************************************/

	$scope.spacebrew = function(){
		return sb;
	}

	$scope.setupSpacebrew = function(){
		if ( sb != null ){
			console.error("[adminCtl] Spacebrew already setup/not null. Aborting!");
			return;
		}
		sb = new Spacebrew.Client({reconnect:true});
		sb.extend(Spacebrew.Admin);
		sb.name("WebAdmin");

		// special admin-only events
		sb.onNewClient = onNewClient;
		sb.onUpdateClient = onUpdateClient;
		sb.onRemoveClient = onRemoveClient;
		sb.onUpdateRoute = onUpdateRoute;

		sb.connect();
	}


	/**********************************************
		SPACEBREW EVENTS
	**********************************************/

	function onNewClient( client ) {
		console.log("[onNewClient] new client ", client);
		
		//todo: hide ourselves!
		$scope.clients[ client.name +":"+ client.remoteAddress ] = client;
		$scope.$digest(); // this tells angular there's new data
	}

	function onUpdateClient( client ) {
		console.log("[onUpdateClient] new client ", client);
		$scope.clients[ client.name +":"+ client.remoteAddress ] = client;
		$scope.$digest();
	}

	function onRemoveClient( name, address ) {
		console.log("[onRemoveClient] remove client '" + name + "' with address '" + address + "'");

		var name = name +":"+ address;
		if ( name in $scope.clients ){
			delete $scope.clients[name];
		}
		$scope.$digest();
	}

	function onUpdateRoute ( type, pub, sub ) {
		console.log("[onUpdateRoute] '", pub, type, sub);
		var pname = pub.clientName +":"+ pub.remoteAddress;
		var sname = sub.clientName +":"+ sub.remoteAddress;

		var pmess, smess;
		var pubsub = [];
		var values = [];
		var route = { pub: pub, sub: sub };

		var bFound = false;
		var pubDiv, subDiv;

		if ( $scope.clients[pname] ){
			pmess = $scope.clients[pname].publish.messages;
			pubsub.push(pmess);
			values.push(pub);
		}
		if ( $scope.clients[sname] ){
			smess = $scope.clients[sname].subscribe.messages;
			pubsub.push(smess);
			values.push(sub);
		}

		if ( type == "add" ){

			// find pub + attach route in arr
			for ( var j=0; j<pubsub.length; j++){
				for ( var i=0; i<pubsub[j].length; i++){
					if ( pubsub[j][i].name == values[j].name 
						&& pubsub[j][i].type == values[j].type ){
						// create array for routes if not there
						pubsub[j][i].routes = pubsub[j][i].routes === undefined ? [] : pubsub[j][i].routes;
						
						var to = j == 0 ? 1 : 0;

						pubsub[j][i].routes.push( values[to] );
						bFound = true;

						if ( j == 0 ){
							pubDiv = values[j].name;
						} else {
							subDiv = values[j].name;
						}
						break;
					}
				}
			}
		} else if (type == "remove" ){
			for ( var j=0; j<pubsub.length; j++){
				for ( var i=0; i<pubsub[j].length; i++){
					if ( pubsub[j][i].name == values[j].name 
						&& pubsub[j][i].type == values[j].type ){
						// create array for routes if not there
						if ( pubsub[j][i].routes ){
							var routes = pubsub[j][i].routes;
							for ( var k=0; k<routes.length; k++){
								
								var to = j == 0 ? 1 : 0;
								if ( compareRoutes(routes[k], values[to]) ){
									routes.splice( k, 1 );

									var name = pname +":"+ pub.name +":"+ sname + ":"+sub.name;
									if ( name in paths ){
										paths[name].removeSegments();
										delete paths[name];
									}
									break;
								} else {
								}
							}
						}
						break;
					}
				}
			}
		}

		$scope.$apply();


		if ( bFound ){
			var fromDiv = "pub_" + pub.clientName + "_" + pubDiv;
			var toDiv = "sub_" + sub.clientName + "_" + subDiv;
			// todo: make this work for real
			var name = pname +":"+ pub.name +":"+ sname + ":"+sub.name;
			$timeout(updatePath, 0, false, name, fromDiv, toDiv );
		}

	}

	/**********************************************
		ROUTING
	**********************************************/

	$scope.currentSelected = null;

	$scope.selectRouter = function(isPub, clientName, remoteAddress, routeName, routeType, divId){
		var toRouteTo = {
			div: document.getElementById(divId),
			clientName : clientName,
			name : routeName,
			type : routeType,
			remoteAddress: remoteAddress,
			isPublisher: isPub
		};

		// first click
		if ( $scope.currentSelected == null ){
			$scope.currentSelected = toRouteTo;
		} else {
			var pub = isPub ? toRouteTo : $scope.currentSelected;
			var sub = !isPub ? toRouteTo : $scope.currentSelected;
			
			// does the route exist?
			
			var pname = pub.clientName +":"+ pub.remoteAddress;
			var sname = sub.clientName +":"+ sub.remoteAddress;
			var pmess = $scope.clients[pname].publish.messages;
			var smess = $scope.clients[sname].subscribe.messages;

			var routeExists = false;

			for ( var i=0; i<pmess.length; i++){
				if ( pmess[i].name == pub.name 
					&& pmess[i].type == pub.type ){
					if ( pmess[i].routes ){
						var routes = pmess[i].routes;
						for ( var k=0; k<routes.length; k++){
							if ( compareRoutes(routes[k], sub) ){
								routeExists = true;
								break;
							}
						}
					}
					break;
				}
			}

			// nope, new
			if ( !routeExists ){
				// route between these two lovebirds
				sb.addRoute( pub.clientName, pub.remoteAddress, pub.name, sub.clientName, sub.remoteAddress, sub.name );
			} else {
				sb.removeRoute( pub.clientName, pub.remoteAddress, pub.name, sub.clientName, sub.remoteAddress, sub.name );
			}
			// then set back 2 null
			$scope.currentSelected = null;
		}
	}

	/**********************************************
		DRAWING
	**********************************************/

	function updatePath( name, fromDivId, toDivId ){
		var fromDiv = document.getElementById(fromDivId);
		var toDiv = document.getElementById(toDivId);

		if ( !fromDiv || !toDiv ){
			$timeout( updatePath, 0, false, name, fromDivId, toDivId );
		}

		// todo: scrolling!
		// todo: window resize

		var path;
		if ( name in paths ){
			path = paths[name];
			path.removeSegments();
		} else {
			paths[name] = new paper.Path();
			path = paths[name];
		}
		path.strokeColor = 'black';

		var fromRect 	= fromDiv.getBoundingClientRect();
		var toRect 		= toDiv.getBoundingClientRect();
		var fromH 		= fromRect.bottom - fromRect.top;
		var toH 		= toRect.bottom - toRect.top;

		var start = new paper.Point(fromRect.right  , fromRect.top + fromH/2);
		var end = new paper.Point(toRect.left, toRect.top + toH/2);

		path.moveTo(start);
		path.lineTo(end);
		// Draw the view now:
		paper.view.draw();
	}
 
	function redrawAll() {
		for ( var name in paths ){
			var path = paths[name];
			path.removeSegments();
			path.strokeColor = 'black';

			var fromRect 	= fromDiv.getBoundingClientRect();
			var toRect 		= toDiv.getBoundingClientRect();
			var fromH 		= fromRect.bottom - fromRect.top;
			var toH 		= toRect.bottom - toRect.top;

			var start = new paper.Point(fromRect.right  , fromRect.top + fromH/2);
			var end = new paper.Point(toRect.left, toRect.top + toH/2);

			path.moveTo(start);
			path.lineTo(end);
		}
		// Draw the view now:
		paper.view.draw();
	}

	/**********************************************
		EVENTS
	**********************************************/

	function onWindowResize(e) {
		
	}

	/**********************************************
		SETUP
	**********************************************/

	$scope.setupCanvas = function(){
		canvas = document.getElementById('canvas');
		paper.setup(canvas);
		window.addEventListener('resize', onWindowResize.bind($scope));
	}

	// setup spacebrew on init
	$scope.setupSpacebrew();
	$scope.setupCanvas();
});
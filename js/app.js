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
	$scope.clients = {};

	// canvas vars
	var canvas, ctx;
	var paths = {};

	// spacebrew vars
	var sb = null;

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
						pubsub[j][i].routes.push( values[j] );
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
								if ( compareRoutes(routes[k], values[j]) ){
									routes.splice( k, 1 );
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
			console.log("hey")
			var name = pname +":"+ pub.name +":"+ sname + ":"+sub.name;
			console.log(name);
			$timeout(updatePath, 500, false, name, fromDiv, toDiv );
		}

	}

	function updatePath( name, fromDivId, toDivId ){
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

		var fromDiv = document.getElementById(fromDivId);
		var toDiv = document.getElementById(toDivId);

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

	$scope.setupCanvas = function(){
		canvas = document.getElementById('canvas');
		paper.setup(canvas);
	}

	// setup spacebrew on init
	$scope.setupSpacebrew();
	$scope.setupCanvas();
});
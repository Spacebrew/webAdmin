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

app.controller("adminCtl", function($scope) {
	$scope.filter = "test";
	$scope.clients = {};

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
		console.log($scope.clients);
		$scope.$digest();
	}

	// internal spacebrew functions

	// setup spacebrew on init
	$scope.setupSpacebrew();
});
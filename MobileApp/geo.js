var map; // FIXME: rename an globally substitute this to something less generic
var dashMap;

document.addEventListener(
	'DOMContentLoaded',
	function () {

		if (navigator.geolocation) {
			console.log('App supports ' + navigator.geolocation + ', using options: ' + JSON.stringify(config.geoOptions));
			logActivity('Getting GPS fix ..', 'task');
			
			dashMap = drawMap('dash-canvas', {latlon:[-43.56,172.64], zoom:11}); // TODO; pull settings from config
			// kill image?, check onlineness
			// $('#dash-canvas .underlay').detach(); // FIXME: needs to wait for map draw
			
			navigator.geolocation.getCurrentPosition(onCurrenLocationSuccess, onCurrentLocationFail, config.geoOptions);
		}

		$('.ui-tabs').on('tabsactivate', function(event, ui) {
			// console.log('activated ' + ui.newTab.filter('#nav-map').length);
			ui.newTab.each( function () { // .filter('#nav-map').each
				console.log('Switched tab to ' + $(this).text());
				//L.DomEvent.addListener(window, 'load', startMap);
				// map.invalidateSize(false);
				// console.log(map);
			});

/*
			if ( ui.newTab.attr('id') == 'nav-map') {
				console.log('activated ');
*/
		});

	},
	function() {
		console.log('bummer about the map');
	}
);

function onCurrenLocationSuccess(position) {
	logActivity('Location found: (' + position.coords.latitude + ',' + position.coords.longitude + ')');
	map = drawMap('track-canvas', {
		latlon: [
			position.coords.latitude,
			position.coords.longitude
			],
		});

var TESTWatchId = navigator.geolocation.watchPosition( function(position) { // TODO: if this code stays, kill the watch at an appropriate time
console.log('now at (' + position.coords.latitude + ',' + position.coords.longitude + ')');
if (typeof(mypos) == 'undefined') {
mypos = L.marker(L.latLng(position.coords.latitude, position.coords.longitude), {icon:L.icon({iconUrl: locationPinIcon})}).addTo(map);
}
else {
mypos.update();
}
},
function(e) {
console.log('watch error code: ' + error.code + ' message: ' + error.message);
},
config.geoOptions
);

	// displayStatus(); // FIXME: make this a native system notifcation instead
}

function onCurrentLocationFail(e) { // not doing anything with e ATM
	logActivity('Location not determined', 'error'); console.log('we here ' + dummyLoc);
	if (dummyLoc.length) {
		map = drawMap('track-canvas', {
			latlon: dummyLoc,
		});
	}
	if (config.enableButtonsWithoutGPS) { //TODO: looks like this never got implemented ??
		logActivity('Enabling buttons without GPS as per config');
	}
	logActivity('No GPS' + (config.enableButtonsWithoutGPS ? ' (Ready anyway)' : ''), 'error');
}

function drawMap(renderingId, initialView) { //replaces startMap() of old
	renderingData = config.rendering[renderingId];
	id = renderingData.DOMId || renderingId;
	console.log('drawMap() called for ' + id);
	var rendering = L.map(id, renderingData.options);
	layer = config.layer[renderingData.layers[0]].tiles; //FIXME - this needs to support the full array
	layer.addTo(rendering);
	
	if (initialView) {
		console.log('Centering map at ' + JSON.stringify(initialView.latlon));
		var zoom = initialView.zoom || 18;
		rendering.setView(initialView.latlon, zoom);
	}
	
	return rendering;
}


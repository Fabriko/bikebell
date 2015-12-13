var map; // FIXME: rename an globally substitute this to something less generic
var dashMap;

document.addEventListener(
	'deviceready',
	function () {

		if (navigator.geolocation) {
			console.log('App supports ' + navigator.geolocation + ', using options: ' + JSON.stringify(config.geoOptions));
			logActivity('Getting GPS fix ..', 'task');
			if (navigator.connection.type) {
				logActivity('Online via connection type ' + navigator.connection.type);
				dashMap = drawMap('dash-canvas');
			}
			else {
				logActivity('Not online','warning');
			}
			// kill image?
			// $('#dash-canvas .underlay').detach(); // FIXME: needs to wait for map draw
			
			navigator.geolocation.getCurrentPosition(onCurrenLocationSuccess, onCurrentLocationFail, config.geoOptions);
		}

		// simply logs tab switches to console.log; ..
		// .. borne of an unsuccesful attempt to resize the map on certain tab changes
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
	
	// TODO: don't assume online or map exists
	// TODO: calculate max zoom if available in config or 18 default, can extract using Leaflet til layer property maxZoom, but gets tricky incorporating layer groups
	console.log('dashMap to be updated with animation');
	dashMap.setView([position.coords.latitude,position.coords.longitude], 18, {animate: true});

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
	
	// override any missing initialView options with any start options from the config
	initialView = Object.assign(
		{},
		renderingData.hasOwnProperty('start') ? renderingData.start : {},
		initialView || {}
		);

	if (Object.keys(initialView).length > 0) {
		var zoom = initialView.zoom || 18;
		console.log('Centering map at ' + JSON.stringify(initialView.latlon) + ', z' + zoom);
		rendering.setView(initialView.latlon, zoom);
	}
	
	return rendering;
}


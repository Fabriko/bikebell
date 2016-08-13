var map, trackMarker, trackJourneyLine; // FIXME: rename an globally substitute this to something less generic
var dashMap, dashMarker, dashJourneyLine;
var geoWatchID;

document.addEventListener(
	'deviceready',
	function () {

		if (navigator.geolocation) {
			console.log('App supports ' + navigator.geolocation + ', using options: ' + JSON.stringify(config.geoOptions));
			logActivity('Getting GPS fix ..', 'task');

			// refer https://www.npmjs.com/package/cordova-plugin-network-information to handle status changes using 'offline' and 'online' events <<-- TODO
			if (navigator.connection.type) {
				bellUI.popup('Online via connection type ' + navigator.connection.type, 'long');
				dashMap = drawMap('dash-canvas');
			}
			else {
				bellUI.popup('Not online', 'long', { fallback: window.alert });
			}

			// kill image?
			// $('#dash-canvas .underlay').detach(); // FIXME: needs to wait for map draw
			
			navigator.geolocation.getCurrentPosition(onCurrenLocationSuccess, onCurrentLocationFail, config.geoOptions);
		}
		else {
			console.log('bummer about the map');
		}
	});

function onCurrenLocationSuccess(position) {

	sensibelStatus.add('GPS');
	bellUI.popup('Position found at (' + position.coords.latitude + ',' + position.coords.longitude + ')', 'long');
	logActivity('Location found: (' + position.coords.latitude + ',' + position.coords.longitude + ')');
	var here = L.latLng(position.coords.latitude, position.coords.longitude);
	
	// TODO: don't assume online or map exists
	// TODO: calculate max zoom if available in config or 18 default, can extract using Leaflet til layer property maxZoom, but gets tricky incorporating layer groups
	console.log('dashMap to be updated with animation'); //TODO: try http://blog.webkid.io/fancy-map-effects-with-css/
	dashMap.setView(here, 18, {animate: true});

	map = drawMap('track-canvas', {
		latlon: here,
		});
		
	dashJourneyLine = L.polyline([here], {color: '#00b2bd', weight:10/*, fill: true, fillColor: '#a4a3ac'*/}).addTo(dashMap); // TODO: I only want to create this line when journey is on (maybe have it dashed before that)
	trackJourneyLine = L.polyline([here], {color: '#f0f'}).addTo(map); // TODO: have this line dashed before journey starts
	trackMarker = L.marker(here, {icon:L.icon({iconUrl: locationPinIcon})}).addTo(map);
	dashMarker = L.marker(here, {icon:L.icon({iconUrl: 'ui/images/dash-marker.png'})}).addTo(dashMap);

	// TODO: decide between map.locate() and geolocation.watchPosition() here

	geoWatchID = navigator.geolocation.watchPosition( function(position) { // TODO: if this code stays, kill the watch at an appropriate time
		config.POSITION_LOGGING && console.log('now moved to (' + position.coords.latitude + ',' + position.coords.longitude + ')');
		var here = L.latLng(position.coords.latitude, position.coords.longitude);
		
		dashMarker.setLatLng(here).update();
		dashMap.panTo(here, {animate: true});
		dashJourneyLine.addLatLng(here);

		trackMarker.setLatLng(here).update();
		map.panTo(here, {animate: true});
		trackJourneyLine.addLatLng(here);

		// console.log('updated markers');

		if ( journey && journey.active() ) {
			journey.addPoint([position.coords.longitude, position.coords.latitude]);
		}

		if ( j2 && j2.isActive() ) {
			j2.track.addBreadcrumb([position.coords.longitude, position.coords.latitude]);
		}

		},
		function(error) {
			console.log('watch error code: ' + error.code + ' message: ' + error.message);
		},
		config.geoPositionOptions
		);
		// displayStatus(); // FIXME: make this a native system notifcation instead
}

function onCurrentLocationFail(e) { // not doing anything with e ATM
	
	sensibelStatus.remove('GPS');
	bellUI.popup('Problem: location not determined!', 'long');
	logActivity('Location not determined', 'error');
	console.log('pretending to be at ' + dummyLoc);

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
	// console.log('	renderingData.options is ' + renderingData.options);
	var rendering = L.map(id, renderingData.options);
	// L.mapbox.accessToken = config.provider.mapbox.token;
	// var rendering = L.mapbox.map(id, 'https://api.mapbox.com/v3/mapbox.dark.json', renderingData.options);
	// console.log('	container is ' + rendering.getContainer().attributes.getNamedItem('id').nodeValue);
	layer = config.layer[renderingData.layers[0]].tiles; //FIXME - this needs to support the full array
	// console.log('	layer is ' + layer);
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

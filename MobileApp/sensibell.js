// Globals
var sensortag, blend;
var SENSOR = blend; // new Sensor(blend); <-- FOR LATER, now it just has to work
// var sprite;
var geoWatchID;
var journey = new Journey('foo');
var dblClickBuffer = { 
	key:0, 
	stamp:0
};
var geoOptions = {
	maximumAge: 600000,
	enableHighAccuracy: true
};

/* Cordova event listeners */

document.addEventListener(
	'deviceready',
	function() {
		evothings.scriptsLoaded(initSensor);
		// evothings.scriptsLoaded(connectSensor);
	},
	false
);

document.addEventListener(
	'resume',
	function() {
		// evothings.scriptsLoaded(connectSensor);
	},
	false
);

// TODO: add stopScan for pause

function initialise() {
	if (SENSOR === sensortag) {
		// initialiseSprite();
		initialiseSensorTag();
	}
	else if(SENSOR === blend) {
		blend.initialize();
	}
	// console.log('SENSOR is ' + SENSOR.toString());

	initialiseGPS();
	if (window.LocalFileSystem) { //TODO: double-check in docs that this is the best FS support test
		window.requestFileSystem(window.LocalFileSystem.PERSISTENT, 0, gotFS, fsFail);
	}
	else {
		// TODO: stub, this is probably where we want to invoke alternate store/cache options
		logActivity('Hope you realise we are not supporting filesystem today :(');
	}
}

function gotFS(fileSystem) {
	fileSystem.root.getFile("FStest.txt", {create: true, exclusive: false}, gotFileEntry, fsFail);
	logActivity(fileSystem.root.name);
}

function gotFileEntry(fileEntry) {
	fileEntry.createWriter(gotFileWriter, fsFail);
}

function gotFileWriter(writer) {
	writer.onwriteend = function(evt) {
		console.log("contents of file now 'some sample text'");
		writer.truncate(11);  
		writer.onwriteend = function(evt) {
			console.log("contents of file now 'some sample'");
			writer.seek(4);
			writer.write(" different text");
			writer.onwriteend = function(evt) {
				console.log("contents of file now 'some different text'");
			};
		};
	};
	writer.write("some sample text");
}

function fsFail(error) {
	console.log(error.code);
	logActivity('FileSystem request failed :(');
}

function initialiseGPS(options) {
	if ( options === undefined ) {
		options = config.geoOptions;
	}
	if (navigator.geolocation) {
		geoWatchID = navigator.geolocation.watchPosition(
			function(position) {
				// logActivity('Geolocation change at (' + position.coords.latitude + ',' + position.coords.longitude + ')');
				journey.addPoint([position.coords.longitude, position.coords.latitude])
			},
			function(error) {
				logActivity('Geolocation change error ' + error.code + ': "' + error.message + '"');
			},
			options
		);
	}
	else {
		console.log('no js geo support');
	}
}

Date.prototype.getUTCTime = function() {
	return (this.getTime() + this.getTimezoneOffset() * 60000) / 1000;
}

Number.prototype.leadZeros = function(zeros) {
	// returns a string with _zeros_ leading zeros
	if ( this < Math.pow(10, zeros) ) {
		var prefix = '';
		for ( i = 1 ; i <= zeros ; i++ ) {
			prefix += '0';
		}
		return prefix + this.toString();
	}
	else {
		return this.toString();
	}
}

function logTimestampFormatDuJour(stamp) {
	return formatTimestamp(stamp, 'log');
}

function formatTimestamp(stamp, format) {
	year = stamp.getFullYear();
	month = (stamp.getMonth() + 1).leadZeros(1);
	dom = stamp.getDate().leadZeros(1);
	hour = stamp.getHours().leadZeros(1);
	minute = stamp.getMinutes().leadZeros(1);
	second = stamp.getSeconds().leadZeros(1);
	millisecond = stamp.getMilliseconds().leadZeros(2);

	switch(format) {
		case 'YYYY-MM-DD hh:nn:ss.sss':
		case 'log':
			return year + '-' +
				month + '-' +
				dom + ' ' +
				'<strong>' +
				hour + ':' +
				minute + ':' +
				second + '.' +
				'</strong>' +
				millisecond;
		case 'filename':
			return year +
				month +
				dom + 'T' + 
				hour +
				minute + 
				second;
		default: // use W3CDTF == 'YYYY-MM-DDThh:nn:ss.sssZ'
			return year + '-' +
				month + '-' +
				dom + 'T' +
				hour + ':' +
				minute + ':' +
				second + '.' +
				millisecond + 'Z';
	}
}

function checkDoublePress(key, interval) {
	var now = new Date().getUTCTime();
	if ( dblClickBuffer['key'] == key && now <= dblClickBuffer['stamp'] + interval ) {
		// console.log('Double click on aisle ' + key);
		return true;
	}
	else {
		dblClickBuffer['key'] = key;
		dblClickBuffer['stamp'] = now;
		// console.log('Initial click '  + dblClickBuffer['key'] + ' recorded ' + dblClickBuffer['stamp']);
		return false;
	}
}

function logPosition(val, success, options) {
	if ( options === undefined ) {
		options = config.geoOptions;
	}
	options['timeout'] = 5000; // FIXME: overriding because concerned about delayed feedback
	
	logActivity('*** KEY ' + val + ' ****');
	var msg = 'Key ' + val + ' triggered @ ';

	if (navigator.geolocation) {
		// console.log('supports ' + navigator.geolocation);
		return navigator.geolocation.getCurrentPosition(
			function(position) {
				logActivity(msg += '(' + position.coords.latitude + ',' + position.coords.longitude + ')');
				success.call(this, position);
			},
			function(error)	{
				logActivity(msg += error.code + ': "' + error.message + '"');
			},
			options
		);
	} 
	else {
		console.log('no js geo support');
	}
}

function clearWatch() {
	if ( typeof(geoWatchID) !== undefined ) {
		navigator.geolocation.clearWatch(geoWatchID);
		geoWatchID = null;
	}
}

function setPathColor(color) {
	document.documentElement.style.background = color;
	document.body.style.background = color;
	// console.log(color);
}

function statusUISwitch(connected) {
	button = document.getElementById('connectButton');
	menuItem = document.getElementById('menu.connect');

	if ( connected ) {
		// button.src = 'ui/images/CC2650-on.png';
		// button.onclick = disconnect;
		// menuItem.innerHTML = 'Disconnect';
		// menuItem.setAttribute('href', 'javascript:disconnect()');
		// displaySprite();
	}
	else {
		// button.src = 'ui/images/CC2650-off.png';
		// button.onclick = connect;
		// menuItem.innerHTML = 'Connect';
		// menuItem.setAttribute('href', 'javascript:connect()');
		// sprite.hide();
	}
}

function displayStatus(status, classes) {
	console.log('Status to "' + status + '"' + ( classes ? ' (' + classes + ')' : '' ) );
	if (!status) {
		status = 'Ready';
	}
	$('#status').text(status);
	classes = 'status' + ( classes ? ' ' + classes  :'' );
	$('#status').parents('.status').attr('class', classes); /* [0].classList.length ) ; */
}

function logActivity(msg) {
	console.log($('<div>' + msg + '</div>').text()); // strip out any HTML meant for the app screen console
	$('#activities').prepend(
		'<span class="timestamp meta">' + formatTimestamp(new Date(), 'log') + '</span>' +
		': ' +
		msg +
		'<br/>'
	);
}

function Journey(title) {
	
	this.makeTracks = function() {
		this['JSONtrail'] = {
			name: title,
			version: _VERSION,
			trail: []
		}
		console.log('ran Journey.maketracks()');
		// console.log(this.gpx);
	}
	//TODO: make this into a property of type JSONTrail and define that class too!

	this.addPoint = function(lonlat) {
		this.addData( 'position', lonlat, lonlat);
	}

	this.addData = function(measure, data, position) {
		logActivity('Adding ' + measure + ' of ' + data + ' to trail @ (' + position[0] + ',' + position[1] + ')');
		console.log('JSONTrail: ' + JSON.stringify(this.JSONtrail));
		this.JSONtrail.trail.push( {
			reading: measure,
			stamp: formatTimestamp(new Date(), 'W3CDTF'),
			'position': position,
			value: data
		}); // TODO - make this something an app can use like timestamped geoJSON
	}
	
	this.begin = function() {
		this.makeTracks(); // TODO: won't need this after making a JSONTrail type as described under makeTracks()
		
		connectSensor();
		
		initialiseGPS();
		
		if (window.LocalFileSystem) { //TODO: double-check in docs that this is the best FS support test
			window.requestFileSystem(window.LocalFileSystem.PERSISTENT, 0, gotFS, fsFail);
		}
		else {
			// TODO: stub, this is probably where we want to invoke alternate store/cache options
			logActivity('Hope you realise we are not supporting filesystem today :(');
		}
	}
	
	this.end = function() {
		disconnectSensor();
		// TODO:
		clearWatch(); // FIXME: maybe should separate this from disconnect()
		
		// console.log(this.gpx.serialise());
		// console.log(JSON.stringify(this.geoJSON.serialise()));
		console.log(JSON.stringify(this.JSONtrail));
		
		// L.geoJson(this.geoJSON.serialise()).addTo(map);
		var gJ = makegeoJSON(this.JSONtrail);
		L.geoJson(gJ).addTo(map);
		
		if (this.JSONtrail) {
			this.upload(); // FIXME - comment for testing only
		}
	}

	this.review = function() {
		var trail = ( this.JSONtrail ? this.JSONtrail : dummyTrail );
		var gJ = makegeoJSON(trail);
		
		// var gJ = dummyGeoJSON; // FIXME - testing only
		console.log(JSON.stringify(gJ));
		trackLayer = L.geoJson(gJ, {
			style: function(f) {
				return {
					color: '#f00'
					};
				}
			}
		);
		console.log(trackLayer.getBounds().toBBoxString());
		map.fitBounds(trackLayer.getBounds());
		trackLayer.addTo(map);
		// location.href = '#track'; // TODO: uncomment when map canvas is more reliable
	}

	this.upload = function() {
		// based on http://jsfiddle.net/tednaleid/7eWgb/
		
		var filename = formatTimestamp(new Date(), 'filename') + '-' + device.uuid + '.json';

		var bucket = config.AWS_S3.bucket;
		var uploadPath = 'http://' + bucket + '.s3.amazonaws.com/' + filename;

		console.log(uploadPath);
		var payload = JSON.stringify(makegeoJSON(this.JSONtrail));
		console.log(payload);

		var req = $.ajax({
			type: "PUT",
			url: uploadPath,
			dataType: 'json',
			async: true,
			data: payload
		});

		req.done( function (msg) {
			console.log(msg);
		});

		req.fail( function (xhr,failText) {
			console.log('Error: ' + xhr.status);
		});
	}

	// **************************************************
	// GPX functions that fail because DOM seems to fail with a security error on some handsets, use JSON equiv for now
	this.addPoint_GPX = function(lonlat) {
		trkseg = this.dom.querySelector("trk trkseg"); // [name='" + title + "']
		trkpt = this.dom.createElement('trkpt');
		trkpt.setAttribute('lon', lonlat[0]);
		trkpt.setAttribute('lat', lonlat[1]);
		time = this.dom.createElement('time');
		timeValue = this.dom.createTextNode(formatTimestamp(new Date(), 'W3CDTF'));
		time.appendChild(timeValue);
		trkpt.appendChild(time);
		trkseg.appendChild(trkpt);
	}
	
	this.makeTracks_GPX = function() {
		// FIXME: src below, clearly
		var src = '<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"	version="1.1" creator="OSMTracker for Android™ - http://osmtracker-android.googlecode.com/"	xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd ">';
		src += '<trk><name>' + title + '</name><trkseg>';
		// src += '<trkpt>'; //etc
		src += '</trkseg></trk>';
		src += '</gpx>';
		// this['gpx'] = {};
		this['gpx'] = {
			dom: (new DOMParser).parseFromString(src, 'application/xml'),

			serialise: function() {
				// return this.dom.toString();
				return (new XMLSerializer()).serializeToString(this.gpx.dom);
			}
		}

		this['geoJSON'] = {};
		this['geoJSON'].serialise = function() {
			return toGeoJSON.gpx(this.gpx.dom);
		}

		console.log('ran Journey.maketracks()');
		// console.log(this.gpx);
	}

}

function startJourney() {
	console.log('Start journey pressed');

	$('#journey-toggle').toggleClass('start end');
	$('#journey-toggle').text('End Journey');
	$('#journey-toggle').on('click',endJourney);
	
	journey.begin();
}

function endJourney() {
console.log(JSON.stringify(journey));
	console.log('End journey pressed');

	$('#journey-toggle').toggleClass('start end'); // FIXME; this doesn't seem to be toggling off 'start'
	$('#journey-toggle').text('Start Journey');
	// $('#journey-toggle').on('click', startJourney);
	
	$('#journey-review').toggleClass('disabled');
	$('#journey-review').on('click', reviewJourney);
console.log(JSON.stringify(journey));
	journey.end();
}

function reviewJourney() {
	console.log('Review journey pressed');
	journey.review();
}

function showSettings() {
	setPairingTarget();
}

function getPairingTarget() {
	return (
		settings.getItem('pairedDevice') ? 
		settings.getItem('pairedDevice') : 
		(
			config.IDPairingsHack[device.uuid] ?
			config.IDPairingsHack[device.uuid] :
			setPairingTarget()
		)
	);
}

function setPairingTarget() {
	var promptDefault;
	if ( (promptDefault = settings.getItem('pairedDevice')) === null ) {
		promptDefault = config.IDPairingsHack[device.uuid];
	}
	var response = window.prompt(
		'Which device do you want to pair with?',
		promptDefault
		);
	if (response !== null) {
		settings.setItem(
			'pairedDevice',
			response
			);
		console.log('settings->pairedDevice is now ' + settings.getItem('pairedDevice'));
	}
	return response;
}

/* ****** Generic UI code ******* */
function switchTab(jqTabItem/*, cb*/) {
	jqTabItem.find('a.ui-tabs-anchor').click();
/*
	if (arguments[1]) {
		window.alert('yo');
		cb();
	}
*/
}// TODO: a similar function that allows specifying the tab panel instead, so we don;t have to figure out (or even set) its corresponding navbar id

function adaptiveButton(id) {
	$('.inner.majora.adaptive').hide('fast', function() {
			$('#adaptive-' + id).parents('.inner.majora').show()
		});
}

/* ************** Will possibly be moved to a Sensor type class instance ************ */
function initSensor() {
	console.log('Shouldinit Blendo');
	blend.setSensor();
}

function resetBLE(callback) {
	logActivity('Resetting of bluetooth ..');
	evothings.ble.reset(
		callback.call(),
		function() {
			logActivity('resetfail', 'error');
		}
	);
}

function connectSensor() {
	if (SENSOR === sensortag) {
		console.log('Shouldconnect tag');
		connect();
	}
	else if(SENSOR === blend) {
		console.log('Shouldconnect Blendo');
		// console.log(JSON.stringify(blend.knownDevices));
		blend.connectFromScratch(blend.listen); // , {'B:01':buttonGood,'B:02':buttonBad} );
	}
}

function fauxConnected() {
	document.addEventListener('volumeupbutton', buttonGood, false);
	document.addEventListener('volumedownbutton', buttonBad, false);

	displayStatus('Faux connected', 'success');
	adaptiveButton('start');
	// TODO - any other unintended consequences of going sensorless while pretending ??
}

function buttonDispatcher(data, callbacks) {
	callbacks = callbacks || {
		'B:01': buttonGood,
		'B:02': buttonBad,
		};
	callbacks[data].call();
}

function disconnectSensor() {
	logActivity('Disconnecting sensor');
	if (SENSOR === sensortag) {
		console.log('Shouldeject tag');
		sensortag.disconnectDevice();
	}
	else if(SENSOR === blend) {
		console.log('Shouldeject Blendo');
		if (blend.connectee) {
			console.log('disconnecting ' + blend.deviceHandle);
			blend.disconnect(blend.deviceHandle);
		}
	}
	displayStatus('Disconnected');
	statusUISwitch(false); // necessary because no status change event is triggered by disconnectDevice()
}

function buttonGood() { //TODO stub
	logActivity('Good button pressed', 'action');
// TODO: abstract and break up
					val = '01';
					logPosition(val, function(loc) {
						console.log('tryog ' + loc.toString());
						L.circleMarker(L.latLng(loc.coords.latitude, loc.coords.longitude),{color:(val=='01'?'green':'red')}).addTo(map);
						if (journey) {
							journey.addData('button', val, [loc.coords.longitude, loc.coords.latitude] );
						}
					});


	
}

function buttonBad() { //TODO stub
	logActivity('Bad button pressed', 'action');
// TODO: abstract and break up
					val = '02';
					logPosition(val, function(loc) {
						console.log('tryog ' + loc.toString());
						L.circleMarker(L.latLng(loc.coords.latitude, loc.coords.longitude),{color:(val=='01'?'green':'red')}).addTo(map);
						if (journey) {
							journey.addData('button', val, [loc.coords.longitude, loc.coords.latitude] );
						}
					});


}

function makegeoJSON(track) {
	var geoJSON = { // skeleton
		"type": 'FeatureCollection',
		features: []
    }
    var lineString = [];
    for (i=0; i < track.trail.length; i++) {
		if ( track.trail[i].reading != 'position' ) { //FIXME - this uis a filter hack - points to bigger issues!
			geoJSON.features.push ( {
				type: 'Feature',
					geometry: {
						'type': 'Point',
						coordinates: track.trail[i].position
					},
					properties: {
						time: track.trail[i].stamp,
						measure: track.trail[i].reading,
						value: track.trail[i].value
					}
				}
			);
		}
		lineString.push(track.trail[i].position);
	}
	// Leaflet's GeoJSON doesn't support showing a sequence of points as aline, so we need to add it redundantly as a LineString
	geoJSON.features.push ( {
		type: 'Feature',
			geometry: {
				"type": 'LineString',
				coordinates: lineString
			}
		}
	);
	geoJSON['properties'] = {
		name: track.name,
		version: track.version
	};
	
	return geoJSON;
}

/* ************* Sensortag and sprite functions being deprecated *********** */
function errorHandler(error) {
	if (evothings.easyble.error.DISCONNECTED == error) {
		displayStatus('Disconnected');
		// sprite.hide();
	}
	else {
		displayStatus('Error: ' + error);
	}
}

function accelerometerHandler(data)	{
	var values = sensortag.getAccelerometerValues(data);
	var dx = values.x * 50;
	var dy = values.y * 50 * -1;
	// moveSprite(dx, dy);
}

function connect() {
	if (sensortag !== undefined) {
		console.log('Connecting device model ' + sensortag.getDeviceModel());
		sensortag.connectToNearestDevice();
	}
	else {
		logActivity('Sensortag is disabled in app config');
	}
}

function disconnect() {
	if (sensortag !== undefined) {
		sensortag.disconnectDevice();
		logActivity('Disconnecting device');
		displayStatus('Disconnected');
		statusUISwitch(false); // necessary because no status change event is triggered by disconnectDevice()
		// clearWatch(); // FIXME: maybe should separate this from disconnect()
		//journey.addPoint([172.72697824,-43.60028126]);
		console.log(journey.serialise());
		console.log(JSON.stringify(journey.geoJSON()));
		L.geoJson(journey.geoJSON()).addTo(map);
	}
	else {
		logActivity('Sensortag is disabled in app config');
	}
}

function statusHandler(status) {
	displayStatus(status);

	if ( status == evothings.tisensortag.ble.status.SENSORTAG_ONLINE ) {
		logActivity('device connected');
		statusUISwitch(true);
	}
	else {
		logActivity('device status is now ' + status);
		statusUISwitch(false);
	}
}

function keypressHandler(data) {
	var val = data[0];
	var speed = 1;

	if ( val != 0 )	{
		if ( checkDoublePress(val, speed) )	{
			val += 3;
		}
	}
			
	// Update background color.
	switch (val) {
		case 0: // no keys
			setPathColor('white');
			break;
		case 1: // user key
			setPathColor('blue');
			logPosition(val);
			break;
		case 2: // power key
			setPathColor('red');
			logPosition(val);
			break;
		case 3: // both keys
			setPathColor('magenta');
			break;
		case 4:
		case 5:
		case 6:
			logActivity('Double clicked ' + (val-3).toString() + ' to get ' + val );
			logPosition(val);
	}
}

function initialiseSprite()	{
	sprite = SpriteManager.makeSprite();
	sprite.setDOMElement(document.getElementById('sprite'));
}

function displaySprite() {
	sprite.whenLoaded(function() {
		sprite.show();
		sprite.setCenterX(SpriteManager.getPlayfieldWidth() / 2);
		sprite.setCenterY(SpriteManager.getPlayfieldHeight() / 2);
	})
}

function moveSprite(dx, dy)	{
	var x = sprite.getCenterX() + dx;
	var y = sprite.getCenterY() - dy;

	x = Math.min(x, SpriteManager.getPlayfieldWidth());
	x = Math.max(x, 0);

	y = Math.min(y, SpriteManager.getPlayfieldHeight());
	y = Math.max(y, 0);

	sprite.setCenterX(x);
	sprite.setCenterY(y);
}

function initialiseSensorTag() {
	// Create SensorTag CC2650 instance.
	sensortag = evothings.tisensortag.createInstance(evothings.tisensortag.CC2650_BLUETOOTH_SMART);

	// Set up callbacks and sensors.
	sensortag
		.statusCallback(statusHandler)
		.errorCallback(errorHandler)
		.accelerometerCallback(accelerometerHandler, 100)
		.keypressCallback(keypressHandler);
	
	SENSOR = sensortag; // ADDED because, not sure, SENSOR seems to have been reset by something in here
}


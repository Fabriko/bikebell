// Globals
var sensortag, blend;
var SENSOR = blend;
var sprite;
var geoWatchID;
var journey = new gpxTrack('foo');
var dblClickBuffer = { 
	key:0, 
	stamp:0
};
var geoOptions = {
	maximumAge: 600000,
	enableHighAccuracy: true
};

function initialise() {
	if (SENSOR === sensortag) {
		initialiseSprite();
		initialiseSensorTag();
	}
	else if(SENSOR === blend) {
		blend.initialize();
	}
	console.log('SENSOR is ' + SENSOR.toString());

	intialiseGPS();
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

function intialiseGPS(options) {
	if ( options === undefined ) {
		options = geoOptions;
	}
	if (navigator.geolocation) {
		console.log('supports ' + navigator.geolocation);
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
		
	logActivity('Device initialised');
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
				hour + ':' +
				minute + ':' +
				second + '.' +
				millisecond;
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

function logPosition(val, options) {
	if ( options === undefined ) {
		options = geoOptions;
	}
	var msg = 'Key ' + val + ' triggered @ ';
	if (navigator.geolocation) {
		console.log('supports ' + navigator.geolocation);
		navigator.geolocation.getCurrentPosition(
			function(position) {
				logActivity(msg += '(' + position.coords.latitude + ',' + position.coords.longitude + ')');
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
		navigator.geolocation.clearwatch(geoWatchID);
		geoWatchID = null;
	}
}

function setPathColor(color) {
	document.documentElement.style.background = color;
	document.body.style.background = color;
	// console.log(color);
}

function connect() {
	if (sensortag !== undefined) {
		sensortag.connectToNearestDevice();
		logActivity('Connecting');
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

function statusUISwitch(connected) {
	button = document.getElementById('connectButton');
	menuItem = document.getElementById('menu.connect');

	if ( connected ) {
		button.src = 'ui/images/CC2650-on.png';
		button.onclick = disconnect;
		menuItem.innerHTML = 'Disconnect';
		menuItem.setAttribute('href', 'javascript:disconnect()');
		displaySprite();
	}
	else {
		button.src = 'ui/images/CC2650-off.png';
		button.onclick = connect;
		menuItem.innerHTML = 'Connect';
		menuItem.setAttribute('href', 'javascript:connect()');
		sprite.hide();
	}
}

function errorHandler(error) {
	if (evothings.easyble.error.DISCONNECTED == error) {
		displayStatus('Disconnected');
		sprite.hide();
	}
	else {
		displayStatus('Error: ' + error);
	}
}

function accelerometerHandler(data)	{
	var values = sensortag.getAccelerometerValues(data);
	var dx = values.x * 50;
	var dy = values.y * 50 * -1;
	moveSprite(dx, dy);
}

function displayStatus(status) {
	document.getElementById('status').innerHTML = status;
}

function logActivity(msg) {
	console.log(msg);
	document.getElementById('activities').innerHTML =
		formatTimestamp(new Date(), 'log') +
		': ' + 
		msg + '<br/>' + 
		document.getElementById('activities').innerHTML;
}

document.addEventListener(
	'deviceready',
	function() {
		evothings.scriptsLoaded(initialise);
	},
	false
);
	
document.addEventListener(
	'DOMContentLoaded',
	function() {
		logActivity('Application loaded :: events will be logged here');
	},
	false
);

function gpxTrack(title) {
	src = '<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="OSMTracker for Android™ - http://osmtracker-android.googlecode.com/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd ">';
	src += '<trk><name>' + title + '</name><trkseg>';
	// src += '<trkpt>'; //etc
	src += '</trkseg></trk>';
	src += '</gpx>';
	this['dom'] = (new DOMParser).parseFromString(src, 'application/xml');

	this.serialise = function() {
		// return this.dom.toString();
		return (new XMLSerializer()).serializeToString(this.dom);
	}

	this.geoJSON = function() {
		return toGeoJSON.gpx(this.dom);
	}

	this.addPoint = function(lonlat) {
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
}

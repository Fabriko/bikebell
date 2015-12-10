/* ===================================== */
/* Not included: Symbols that may be revived or useful, worth keeping in repo */

/*
	// Handle to the connected device.
	deviceHandle: null,
*/
blend.deviceHandle = null;

/*
 	// Handles to characteristics and descriptor for reading and
	// writing data from/to the Arduino using the BLE shield.
	characteristicRead: null,
	characteristicWrite: null,
	descriptorNotification: null,
*/
blend.characteristicRead = null;
blend.characteristicWrite = null;
blend.descriptorNotification = null;

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

// TODO; no longer called but need to incorporate this into journey.start(), then kill
function initialiseGPS(options) {
	if ( options === undefined ) {
		options = config.geoOptions;
	}
	if (navigator.geolocation) {
		geoWatchID = navigator.geolocation.watchPosition(
			function(position) {
				// console.log('Geolocation change at (' + position.coords.latitude + ',' + position.coords.longitude + ')');
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
	

// **************************************************
// Journey GPX functions that fail because DOM seems to fail with a security error on some handsets, use JSON equiv for now
Journey.addPoint_GPX = function(lonlat) {
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

Journey.makeTracks_GPX = function() {
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

blend.on = function() {
		logActivity('LED on requested');
		app.write(
			'writeCharacteristic',
			app.deviceHandle,
			app.characteristicWrite,
			new Uint8Array([1])); // 1 = on
	}

blend.off = function()	{
		logActivity('LED off requested');
		app.write(
			'writeCharacteristic',
			app.deviceHandle,
			app.characteristicWrite,
			new Uint8Array([0])); // 0 = off
	}
	
blend.write = function(writeFunc, deviceHandle, handle, value)	{
		if (handle)	{
			ble[writeFunc](
				deviceHandle,
				handle,
				value,
				function() {
					console.log(writeFunc + ': ' + handle + ' success.');
				},
				function(errorCode) {
					console.log(writeFunc + ': ' + handle + ' error: ' + errorCode);
				}
			);
		}
	}
	
blend.getServices = function(deviceHandle)	{
	console.log('Scanning for services...');
	evothings.ble.readAllServiceData(deviceHandle, function(services) {
		// Find handles for characteristics and descriptor needed.
		for (var si in services) {
			var service = services[si];
			for (var ci in service.characteristics) {
				var characteristic = service.characteristics[ci];

				if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e') {
					app.characteristicRead = characteristic.handle;
				}
				else if (characteristic.uuid == '713d0003-503e-4c75-ba94-3148f18d941e') {
					app.characteristicWrite = characteristic.handle;
				}

				for (var di in characteristic.descriptors) {
					var descriptor = characteristic.descriptors[di];

					if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e' &&
						descriptor.uuid == '00002902-0000-1000-8000-00805f9b34fb') {
						app.descriptorNotification = descriptor.handle;
					}
				}
			}
		}

		if (app.characteristicRead && app.characteristicWrite && app.descriptorNotification) {
			console.log('RX/TX services found.');
			// app.startReading(deviceHandle);
		}
		else {
			console.log('ERROR: RX/TX services not found!');
		}
	},
	function(errorCode) {
		console.log('readAllServiceData error: ' + errorCode);
	});
}

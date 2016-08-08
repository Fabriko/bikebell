/* Globals */

// Hardware
sensor = new Sensor();

// oh, what a mess! some legacy stuff we can probably kill eventually
var app = sensor;
var blend = app; // FIXME, this sucks
var sensortag;
var SENSOR = blend; // new Sensor(blend); <-- FOR LATER, now it just has to work

// Data
var journey = new Journey('Sensibel-' + formatTimestamp(new Date()));
var dblClickBuffer = { 
	key:0, 
	stamp:0
};

document.addEventListener(
	'deviceready',
	function() {
		evothings.scriptsLoaded(setSensor);
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

function logPosition(val, success, options) {
	if ( options === undefined ) {
		options = config.geoPositionOptions;
	}
	
	logActivity('*** KEY ' + val + ' ****');
	var msg = 'Key ' + val + ' triggered ';

	if (navigator.geolocation) {
		// console.log('supports ' + navigator.geolocation);
		return navigator.geolocation.getCurrentPosition(
			function(position) {
				logActivity(msg += ' @(' + position.coords.latitude + ',' + position.coords.longitude + ')');
				success.call(this, position);
			},
			function(error)	{
				logActivity(msg += "but couldn't locate, error #" + error.code + ': "' + error.message + '"');
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

function displayStatus(status, classes) { // TODO: make classes an array, would be more useful that way
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
		this['title'] = title; // NB: presence of this property is used to indicate an active track
		this['JSONtrail'] = {
			name: title,
			version: _VERSION,
			trail: [],
		}
		if (riderName = settings.getItem('riderName') ) {
			this.JSONtrail['rider'] = riderName;
		}
		console.log('ran Journey.maketracks()');
		// console.log(this.gpx);
	}
	//TODO: make this into a property of type JSONTrail and define that class too!

	this.active = function() {
		return Boolean(this.title);
	}

	this.addPoint = function(lonlat) {
		this.addData( 'position', lonlat, lonlat);
	}

	this.addData = function(measure, data, position) {
		logActivity('Adding ' + measure + ' of ' + data.toString() + ' to trail "' + this.title + '" @(' + position[0] + ',' + position[1] + ')');
		this.JSONtrail.trail.push( {
			reading: measure,
			stamp: formatTimestamp(new Date(), 'W3CDTF'),
			'position': position,
			value: data,
		}); // TODO - make this something an app can use like timestamped geoJSON
		console.log('Journey: ' + JSON.stringify(this));
		console.log('JSONTrail: ' + JSON.stringify(this.JSONtrail));
	}
	
	this.start = function(onSuccess) {
		this.makeTracks();
		// TODO: put a watch in the position and map it - see deprecated initialiseGPS() in this file
		sensibelStatus.add('tracking');
		onSuccess && onSuccess.call();
	}
	
	this.finish = function(onSuccess, onFail) { // FIXME: deprecate

		sensibelStatus.remove('tracking');
		clearWatch();
		
		console.log(JSON.stringify(this.JSONtrail));
		
		if (this.hasTracks()) {
			var gJ = makegeoJSON(this.JSONtrail);
			L.geoJson(gJ).addTo(map);

			this.upload( function() {
				onSuccess && onSuccess.call();
			});
		}
		else {
			logActivity('No waypoints recorded, not uploading', 'warning');
			onFail && onFail.call();
		}
	}

	this.hasTracks = function() {
		return (this.JSONtrail && this.JSONtrail.trail.length);
	}

	this.review = function() {
		// TODO: this is still a bare beginning
		var trail = ( this.hasTracks() ? this.JSONtrail : dummyTrail );
		var gJ = makegeoJSON(trail);
		
		// var gJ = dummyGeoJSON; // FIXME - testing only
		console.log(JSON.stringify(gJ));

		// TODO: here I need to pull all the points I added from the map display

		trackLayer = L.geoJson(gJ, {
			style: function(feature) {
				// console.log('Feature of type ' + JSON.stringify(feature.geometry.type));
				return ( feature.geometry.type == "LineString" ? { color: '#f00' } : {} );
			},
			pointToLayer: function (feature, latlng) {
				if ( feature.properties.measure && feature.properties.measure == 'button' ) {
					return L.circleMarker(latlng, { // just pinched the concept from http://leafletjs.com/examples/geojson.html
						radius: 4,
						fillColor: ( feature.properties.value == '01' ? 'green' : 'red' ),
						color: "#000",
						weight: 1,
						opacity: 1,
						fillOpacity: 0.8
					});
				}
			},
		});
		console.log(trackLayer.getBounds().toBBoxString());
		map.fitBounds(trackLayer.getBounds());
		trackLayer.addTo(map);
		// location.href = '#track'; // TODO: uncomment when map canvas is more reliable
	}

	this.promptTitle = function() {
		var promptDefault = this.__deriveTitle();

		var response = window.prompt(
			'Edit the name of your journey?',
			promptDefault
			);

		return response;

	}

	this.__deriveTitle = function() {
		var newTitle = formatTimestamp(new Date(), 'trackname');



		return newTitle;
	}

	this.changeTitle = function(newTitle) {
		console.log('Renaming track');


		this.JSONtrail.name = newTitle;
		// this.title?? TODO
		console.log('New trackname: ' + newTitle);

	}

	this.upload = function(onSuccess, onFail) {
		// based on http://jsfiddle.net/tednaleid/7eWgb/
		logActivity('Uploading track "' + this.title + '" to AWS');

		var filename = formatTimestamp(new Date(), 'filename') + '-' + device.uuid + '.json';

		var bucket = config.AWS_S3.bucket;
		var uploadPath = 'http://' + bucket + '.s3.amazonaws.com/' + filename;

		console.log(uploadPath);
		var payload = JSON.stringify(makegeoJSON(this.JSONtrail));
		console.log(payload);

		var req = $.ajax({
			type: "PUT",
			url: uploadPath,
			/*	dataType: 'json',*/ // FIXME: failing because it doesn't vallidate as JSON, probably start lokoing at makegeoJSON
			async: true,
			data: payload,
		});

		req.done( function (msg) {
			logActivity('Upload to ' + uploadPath + ' succeeded: ' + msg);
			onSuccess && onSuccess.call();
		});

		req.fail( function (xhr, failText) {
			console.log('Error ' + xhr.status + ': ' + failText);
			onFail && onFail.call();
		});
	}

}

var Track = function() {
	
}

function adaptiveStart() {
	console.log('Big button Start journey pressed');
	journey.start( function() {
		logActivity('Journey ' + journey.title + ' STARTED');
		});
}

function adaptiveFinish() {
	console.log('Big button Finish journey pressed');

	var title = journey.promptTitle();
	if ( title !== null) {
		journey.changeTitle(title);

		journey.finish( function() {
			logActivity('Journey ENDED');
			sensor.disconnect();
			},
			function() {
			logActivity('Journey not ended', 'warning');
			//TODO: a flash notification here I think
			sensor.disconnect(); // FIXME: hmm, this is less confusing but may lead the user to wonder why their track never uploaded
			});
	}
}


function adaptiveReview() {
	console.log('Review journey pressed');
	journey.review();
	switchTab($('#nav-map'));
}

function showSettings() {
	// setPairingTarget();
	// $('#settings').dialog().open();
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

function setSensor() {
	console.log('We are going to set the sensor');
	sensor.set();
}

function connectSensor() {
	console.log("We'll now connect to " + sensor.target);
	sensor.connectFromScratch( function() {
		sensor.listen( function(connectedDevice) {
				connectedDevice.setNotification( function(data) {
					var input = new Uint8Array(data)[0];
					console.log('Pressed: ' + input);
					buttonDispatcher(input);
					});
			},
			function(errorCode)	{
				console.log('Connect error: ' + errorCode + '.');
			});
		}); // , {'B:01':buttonGood,'B:02':buttonBad} );
}

function fauxConnected() {
	document.addEventListener('volumeupbutton', buttonGood, false);
	document.addEventListener('volumedownbutton', buttonBad, false);

	displayStatus('Faux connected', 'success');
	adaptiveButton('start');
	// TODO - any other unintended consequences of going sensorless while pretending ??
}

function buttonDispatcher(value, callbacks) {
	callbacks = callbacks || {
		1: buttonGood,
		2: buttonBad,
		};
	if (callbacks.hasOwnProperty(value)) {
		callbacks[value].call();
	}
}

function buttonGood() {
	logActivity('Good button pressed', 'action');
	bellUI.popup('Sweet!', 'short'); // TODO: make this configurable by user
	processButton('01');
}

function buttonBad() {
	logActivity('Bad button pressed', 'action');
	bellUI.popup('Stink ..', 'short'); // TODO: make this configurable by user
	processButton('02');
}

function processButton(val) {
	logPosition(val, function(loc) {
		options = {
			color: (val=='01' ? 'green' : 'red'), // FIXME: use classes if possible
		};
		markPosition(map, loc.coords, options);

		recordWaypoint('button', val, loc.coords);
	});
}

function markPosition(map, latlon, options) {
	console.log('Marking position (' + latlon.latitude + ',' + latlon.longitude + ')');
	if (map) {
		L.circleMarker(
			L.latLng(latlon.latitude, latlon.longitude), options).addTo(map);
	}
	else {
		console.log('No map to mark!');
	}
}

function recordWaypoint(field, val, latlon) {
	if (journey && journey.active()) {
		console.log('Recording position (' + latlon.latitude + ',' + latlon.longitude + ')');
		journey.addData(field, val, [latlon.longitude, latlon.latitude] );
	}
	else {
		console.log('No journey to record (' + latlon.latitude + ',' + latlon.longitude + ') to!');
	}
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
				coordinates: lineString,
			}
		}
	);
	geoJSON['properties'] = {
		name: track.name,
		version: track.version,
		rider: track.rider,
	};
	
	return geoJSON;
}

function appStatus(initialState) {
	this.state = {};

	this.__reset = function(statuses) { // FIXME: something something scope something -should be private methods
		console.log(JSON.stringify(statuses));
		var defaultStatuses = {
			'net': false,
			'GPS': false,
			'BLE': false,
			'tracking': false,
			};
		this.state = Object.assign({}, defaultStatuses, ( statuses ? statuses : {} ));
		console.log(JSON.stringify(this.state));
		this.__reflect();

	};

	this.add = function(property) {
		if(this.state.hasOwnProperty(property)) {
			this.state[property] = true;
			this.__reflect();
		}
	};

	this.remove = function(property) {
		if(this.state.hasOwnProperty(property)) {
			this.state[property] = false;
			this.__reflect();
		}
	};

	this.__reflect = function() {
		console.log('Reflecting state ' + JSON.stringify(this.state));

		if(this.state.tracking) {
			adaptiveButton('stop');
		}

		if (this.state.GPS) {
			if(this.state.BLE) {
				if(this.state.tracking) {
					displayStatus('Tracking', 'tracking'); // ******* F
				}
				else {
					displayStatus('Connected', 'ready'); // ******* E
					adaptiveButton('start');
				}
			}
			else {
				if(this.state.tracking) {
					displayStatus('Disconnected', 'warning'); // ******** H
				}
				else {
					displayStatus('Not connected', 'warning'); // ********* D
					adaptiveButton('connect');
				}
			}

		}
		else {
			if(this.state.BLE) {
				if(this.state.tracking) {
					displayStatus('Lost GPS', 'warning'); // ******* C
				}
				else {
					displayStatus('Lost GPS', 'pending'); // ******* B
					adaptiveButton('wait');
				}
			}
			else {
				if(this.state.tracking) {
					displayStatus('Lost GPS + Disconnected', 'warning'); // ****** G
				}
				else {
					displayStatus('Finding GPS', 'pending');
					adaptiveButton('wait'); // ****** A
				}
			}
		}

	};

	this.__reset(initialState);

}

testState = {
	a: {}, // f,f,f
	b: {GPS: false, BLE: true,  tracking: false},
	c: {GPS: false, BLE: true,  tracking: true },
	d: {GPS: true,  BLE: false, tracking: false},
	e: {GPS: true,  BLE: true,  tracking: false},
	f: {GPS: true,  BLE: true,  tracking: true },
	g: {GPS: false, BLE: false, tracking: true },
	h: {GPS: true , BLE: false, tracking: true },
	};

var sensibelStatus = new appStatus();
console.log('State is - ' + JSON.stringify(sensibelStatus));

/*
	GPS		BLE		Journey	Review	Status	Message		Button		Callback	Log
a	x		x		x				Pending	Waiting GPS	(spinner)
b	x		/		x				Pending	Lost GPS	(spinner)
c	x		/		/				warning	Lost GPS	Stop
d	/		x		x				warning	Not connected Connect
e	/		/		x		.		Ready 	Connected	Start
f	/		/		/				trackingTracking	Stop
g	x		x		/				warning	Lost GPS & Dis	Stop
h	/		x		/				warning	Disconnected	Stop

buttons - wait, connect, start, stop, -->review
status: pending=grey, warning=red, ready=green, tracking=blue            , finished
*/

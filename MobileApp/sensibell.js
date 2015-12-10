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
		this['title'] = title; // NB: presence of this property is used to indicate an active track
		this['JSONtrail'] = {
			name: title,
			version: _VERSION,
			trail: [],
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
		logActivity('Adding ' + measure + ' of ' + data + ' to trail "' + this.title + '" @(' + position[0] + ',' + position[1] + ')');
		console.log('Journey: ' + JSON.stringify(this));
		console.log('JSONTrail: ' + JSON.stringify(this.JSONtrail));
		this.JSONtrail.trail.push( {
			reading: measure,
			stamp: formatTimestamp(new Date(), 'W3CDTF'),
			'position': position,
			value: data,
		}); // TODO - make this something an app can use like timestamped geoJSON
	}
	
	this.start = function(onSuccess) {
		this.makeTracks();
		// TODO: put a watch in the position and map it - see deprecated initialiseGPS() in this file
		onSuccess && onSuccess.call();
	}
	
	this.finish = function(onSuccess, onFail) { // FIXME: deprecate

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

	this.upload = function(onSuccess, onFail) {
		// based on http://jsfiddle.net/tednaleid/7eWgb/
		logActivity('Uploading track "' + this.title + '" to AWS');

		var filename = formatTimestamp(new Date(), 'filename') + '-' + device.uuid + '.json';

		var bucket = config.AWS_S3.bucket;
		var uploadPath = 'http://' + bucket + '.s3.amazonaws.com/' + filename;

		console.log(uploadPath);
		var payload = makegeoJSON(this.JSONtrail);
		console.log(JSON.stringify(payload));

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

function adaptiveStart() {
	console.log('Big button Start journey pressed');
	journey.start( function() {
		logActivity('Journey STARTED');
		displayStatus('Tracking', 'stop');
		adaptiveButton('stop');
	});
}

function adaptiveFinish() {
	console.log('Big button Finish journey pressed');
	journey.finish( function() {
		logActivity('Journey ENDED');
		SENSOR.disconn('review', 'Not connected');
	},
		function() {
		logActivity('Journey not ended', 'warning');
		//TODO: a flash notification here I think
	});
}

function adaptiveReview() {
	console.log('Review journey pressed');
	journey.review();
	switchTab($('#nav-map'));
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

function initSensor() {
	console.log('Shouldinit Blendo');
	blend.setSensor();
}

function connectSensor() {
	/*
	if (SENSOR === sensortag) {
		console.log('Shouldconnect tag');
		connect();
	}
	else if(SENSOR === blend) {
	*/
		console.log('Shouldconnect Blendo');
		blend.connectFromScratch(blend.listen); // , {'B:01':buttonGood,'B:02':buttonBad} );
	/*
	}
	*/
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

function buttonGood() {
	logActivity('Good button pressed', 'action');
	processButton('01');
}

function buttonBad() {
	logActivity('Bad button pressed', 'action');
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
		version: track.version
	};
	
	return geoJSON;
}

/* Globals */

// Hardware
sensor = new Sensor();

// oh, what a mess! some legacy stuff we can probably kill eventually
var app = sensor;
var blend = app; // FIXME, this sucks
var sensortag;
var SENSOR = blend; // new Sensor(blend); <-- FOR LATER, now it just has to work

// Data
var j2 = new J2('Sensibel-' + formatTimestamp(new Date()));

var dblClickBuffer = {
	key: 0,
	stamp: 0,
};

var dbConnection = window.openDatabase(config.databaseParams.name, config.databaseParams.version, config.databaseParams.title, config.databaseParams.size, function() {
    logActivity('Database ' + config.databaseParams.name + ' successfully opened or created.');
});
// query.drop('tracks');
dbConnection.transaction(function (tx) {
	// FIXME: stamp can has something like DEFAULT CURRENT_TIMESTAMP, however, sucky sucky SQLite docs
	var SQL = 'CREATE TABLE IF NOT EXISTS tracks ( \
		name TEXT PRIMARY KEY, \
		geoJSON TEXT, \
		stamp INTEGER, \
		uploaded INTEGER NULL \
		);'
    tx.executeSql(SQL, [], query.onSuccess, query.onFail);
});

// query.testInsert();
query.dump('tracks');
// settings.setItem('file.prefix', 'dev-'); // console.log(settings.getItem('file.prefix'));
// settings.removeItem('file.prefix');

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
				bellUI.popup("Couldn't locate :(", 'short'); // FIXME: do something more useful with this
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

function J2(title) {
	var __this = this;
	this['track'] = null;
	this['title'] = title;
	this['status'] = 'pending';

	this.start = function(onSuccess) {
		this.track = new T2(this);
		this.track.create();
		// this.track.properties
		this.status = 'active';
		sensibelStatus.add('tracking');

		// TODO: put a watch in the position and map it - see deprecated initialiseGPS() in this file
		onSuccess && onSuccess.call();
		};

	this.isActive = function() {
		return (this.status == 'active');
		};

	this.finish = function(onSuccess, onFail) {

		this.track.close();
		
		this.status = 'saved';
		sensibelStatus.remove('tracking');
		clearWatch();

		console.log(JSON.stringify(this.track.cache));

		if (this.track.hasTracks()) {
			L.geoJson(this.track.cache).addTo(map);
			
			// TODO: add annotation actions (here I think)

			this.track.upload( function() {
				// upload flag in DB to true
				dbConnection.transaction(function (tx) {
					// query.dump('tracks');
					var qry = 'UPDATE tracks SET uploaded=1 WHERE name=?';
					tx.executeSql(qry, [__this.title], query.onSuccess, query.onFail);
					// console.log(qry + ' **** ' + __this.title);
					// evothings.printObject(tx);
					});
					
				__this.status = 'uploaded';
				onSuccess && onSuccess.call();
			});
		}
		else {
			logActivity('No waypoints recorded, not uploading', 'warning');
			onFail && onFail.call();
		}

		};
		
	this.abort = function() {
		// TODO
		this.status = 'saved';
		sensibelStatus.remove('tracking');
		};

	this.review = function() { // CHECKME: I don't think this is currently being invoked, hasn't been tested since j2
		// TODO: this is still a bare beginning
		var gJ = this.track.cache;

		console.log(JSON.stringify(gJ));

		// TODO: here I need to pull all the points I added from the map display
		
		// TODO: make the points click-and-annotatable

		var trackLayer = L.geoJson(gJ, {
			style: function(feature) {
				// console.log('Feature of type ' + JSON.stringify(feature.geometry.type));
				return ( feature.geometry.type == 'LineString' ? { color: '#f00' } : {} );
			},
			// TODO: test if this stanza has any effect on the map
			pointToLayer: function (feature, latlng) {
				if (feature.properties.measure && feature.properties.measure == 'button') {
					return L.circleMarker(latlng, { // just pinched the concept from http://leafletjs.com/examples/geojson.html
						radius: 4,
						fillColor: ( feature.properties.value == '01' ? 'green' : 'red' ),
						color: "#000",
						weight: 1,
						opacity: 1,
						fillOpacity: 0.8,
					});
				}
			},
		});
		console.log(trackLayer.getBounds().toBBoxString());
		map.fitBounds(trackLayer.getBounds());
		trackLayer.addTo(map);
		// location.href = '#track'; // TODO: uncomment when map canvas is more reliable
		
		// TODO:add the track title as a heading here
	}

	console.log('Initialised J2 object');

	/* *** TODO
	Methods: /isActive, -finish, abort, review
	Properties: __stats? title, status
	*/
	};

function T2(jy) {
	var __this = this
	this.cache = {};

	this.create = function() {
		var created = new Date().toUTCString(); // CHECKME: might be better off storing in UTC (also track.finished)
		var skeleton = {
			'type':     'FeatureCollection',
			'features': [{
				'type': 'Feature',
				'geometry': {
					'type': 'LineString',
					'coordinates': [],
					}
				}],
			'properties': {
				'name': jy.title,
				'version': _VERSION,
				'started': created,
				},
		};

		dbConnection.transaction(function (tx) {
			var qry = 'INSERT INTO tracks(name, geoJSON, stamp) VALUES (?,?,?)';
			tx.executeSql(qry, [jy.title, JSON.stringify(skeleton), Date.now()], function(transaction, result){
				__this.cache = skeleton;
				if (riderName = settings.getItem('riderName') ) {
					console.log('Adding rider name metadata: ' + riderName);
					__this.updateMetadata({'rider': riderName});	
				}
				query.onSuccess(transaction, result);
				}, query.onFail);
			});
		};

	this.sync = function() {
		dbConnection.transaction(function (tx) {
			var qry = 'UPDATE tracks SET geoJSON=? WHERE name=?';
			tx.executeSql(qry, [JSON.stringify(__this.cache), jy.title], query.onSuccess, query.onFail);
			});
		};
		
	this.updateMetadata = function(properties) {
		$.each(properties, function(key, val) {
			__this.cache.properties[key] = val;
			__this.sync();
			});
		};

	this.addBreadcrumb = function(lonlat) {
		this.addData('position', lonlat);
	}
	
	this.hasTracks = function() {
		return (this.cache.features[0].geometry.coordinates.length && (this.cache.features[0].geometry.coordinates.length > 0)); // FIXME - not keen on relying on first position in this.cache.features array to identify the linestring (trail)
		};
	
	this.addData = function(measure, position, data) {
		isBreadcrumb = (measure == 'position');
		var logThis = config.POSITION_LOGGING || !isBreadcrumb;
		logThis && logActivity('Adding ' + (isBreadcrumb ? '' : measure + ' of ' + data.toString() + ' ') + 'to trail "' + jy.title + '" @(' + position[0] + ',' + position[1] + ')');
		
		this.cache.features[0].geometry.coordinates.push(position); // FIXME - not keen on relying on first position in this.cache.features array to identify the linestring (trail)
		if (!isBreadcrumb) {
			this.cache.features.push({
				type: 'Feature',
					geometry: {
						'type':        'Point',
						'coordinates': position,
					},
					properties: {
						'time':    formatTimestamp(new Date(), 'W3CDTF'), // FIXME ??
						'measure': measure,
						'value':   data,
					}
				});
		}
		
		this.sync();
		
		logThis && ( function() { // that is one pretentious if statement ;)
			console.log('Track2: ' + JSON.stringify(__this.cache));
			})();
		};
		
	this.close = function() {
		this.updateMetadata({'ended': new Date().toUTCString()}); // CHECKME: might be better off storing in UTC (also track.started)
	}

	this.upload = function(onSuccess, onFail) {
		// based on http://jsfiddle.net/tednaleid/7eWgb/
		logActivity('Uploading track "' + jy.title + '" to AWS');

		var filename = ( settings.getItem('file.prefix') ? settings.getItem('file.prefix') : '' ) + formatTimestamp(new Date(), 'filename') + '-' + device.uuid + '.json';

		var bucket = config.AWS_S3.bucket;
		var uploadPath = 'http://' + bucket + '.s3.amazonaws.com/' + filename;

		console.log(uploadPath);
		var payload = JSON.stringify(this.cache);
		console.log('Payload: ' + payload);

		if(config.UPLOAD_ON_FINISH) {
			var req = $.ajax({
				type: 'PUT',
				url: uploadPath,
				/*	dataType: 'json',*/ // FIXME: failing because it doesn't validate as JSON <-- CHECKME
				async: true,
				data: payload,
			});

			req.done( function (msg) {
				logActivity('Upload succeeded: ' + uploadPath);
				if (msg) {
					logActivity('Upload message: ' + msg);
				}
				onSuccess && onSuccess.call();
			});

			req.fail( function (xhr, failText) {
				console.log('Error ' + xhr.status + ': ' + failText);
				onFail && onFail.call();
			});
		}
		else {
			console.log('Upload suppressed by config.UPLOAD_ON_FINISH');
			onFail && onFail.call(); // ??? FIXME - good idea?
		}
	};
	
	// NB. this does not change the (parent) journey *title* which is used as a database id (in the 'name' column :/)
	this.rename = function(newTitle) {
		console.log('Renaming track');
		this.updateMetadata({'name': newTitle});
		logActivity('New trackname: ' + newTitle);
	}

	this.promptName = function() {
		var promptDefault = __defaultTitle();

		return window.prompt(
			'Edit the name of your journey?',
			promptDefault
			);
	}

	var __defaultTitle = function() {
		return formatTimestamp(new Date(), 'trackname');
	}

	/* *** TODO
	Methods: /create?, upload, /sync, /addMetadata, /addData, /hasTracks, /rename, /promptName, /__defaultName, close, addMedia, __save, load
	Properties: source, __stats
	*/
	
	};
	
function adaptiveStart() {
	console.log('Big button Start journey pressed');
	j2.start( function() {
		logActivity('J2 ' + j2.title + ' STARTED');
		logActivity(JSON.stringify(j2.track.cache));
		});
}

function adaptiveFinish() {
	console.log('Big button Finish journey pressed');

	var title = j2.track.promptName();
	if (title !== null) {
		j2.track.rename(title);

		j2.finish( function() {
			logActivity('Journey2 ENDED');
			sensor.disconnect();
			query.lastTrack();
			},
			function() {
				logActivity('Journey2 not ended', 'warning');
				//TODO: a flash notification here I think
				sensor.disconnect(); // FIXME: hmm, this is less confusing but may lead the user to wonder why their track never uploaded
			});
	}
}

function adaptiveReview() {
	console.log('Review journey2 pressed');
	j2.review();
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
	if (j2 && j2.isActive()) {
		console.log('Recording position (' + latlon.latitude + ',' + latlon.longitude + ')');
		j2.track.addData(field, [latlon.longitude, latlon.latitude], val);
	}
	else {
		console.log('No journey to record (' + latlon.latitude + ',' + latlon.longitude + ') to!');
	}
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

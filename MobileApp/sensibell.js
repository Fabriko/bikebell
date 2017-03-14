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
	key: 0,
	stamp: 0,
};

var categories = populateCategories();
configManagementHacks();

document.addEventListener('deviceready', function() {

	if (navigator.camera) {
		$('#picture').removeClass('disabled');
		$('#picture').click( function() {
			navigator.camera.getPicture( function(result) {
				console.log(result);
				// make a directory
				logActivity('External dir: ' + cordova.file.externalApplicationStorageDirectory);
				logActivity('App storage dir: ' + cordova.file.applicationStorageDirectory);

				var dataDirectoryLocation = ( device.platform.match(/android/i) ? cordova.file.externalDataDirectory : cordova.file.dataDirectory );

				logActivity("We'll use " + dataDirectoryLocation);

				/*
				window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
					// cordova.file.applicationStorageDirectory
					fs.root.getDirectory('sensibel-test', { create: true, exclusive: false, }, function(dir) { logActivity('ok dir'); logActivity(dir.fullPath); }, function() { logActivity('dir create fail'); });
				}, function() { logActivity('fs fail'); } );
				*/

				window.resolveLocalFileSystemURL(dataDirectoryLocation, function (fs) {
						logActivity('gonna try creating dir..');
						fs.getDirectory('sensibel-test', {
							create: true,
							exclusive: false,
							}, function(dir) {
								logActivity('ok dir');
								logActivity(dir.fullPath);
							}, function() {
								logActivity('dir create fail');
							});
					}, function() {
						logActivity('fs fail');
					});

					// generate a UUID
					// copy cached file
					// store filename in DB
					// upload to CDN
				},
				function() {
					console.log('camera failed or whatever FIXME');
				},
				{
					// select from https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-camera/index.html#module_camera.CameraOptions
				});
			});
	}
	});

document.addEventListener('deviceready', function() {
	evothings.scriptsLoaded( function() {
		setSensor();
		console.log('Set to ' + sensor.target);
		});
	$('#adaptive-connect').click();
	}, false);

document.addEventListener('deviceready', function() {
	if (navigator.connection.type && navigator.connection.type != Connection.UNKNOWN && navigator.connection.type != Connection.NONE) {
		bellUI.popup('Online via connection type ' + navigator.connection.type, 'long');
		logActivity('Attempting to sync to remote datastore ..');
		localStore.sync(remoteStore).on('complete', // FIXME: sometimes this triggers twice .. ???
			function (info) {
				logActivity(" .. succeeded!");
				}).on('error',
			function (err) {
				logActivity(" .. failed, we'll try again later.");
			});
	}
	else {
		bellUI.popup('Not online', 'long', { fallback: window.alert });
	}

	document.addEventListener('online',	function() {
		logActivity('*** app now ONLINE ***');
		logActivity('Now online, so syncing to remote datastore ..');
		localStore.sync(remoteStore).on('complete',
			function (info) {
				logActivity(" .. succeeded!");
				}).on('error',
			function (err) {
				logActivity(" .. failed, we'll try again later.");
			});
		}, false);

	}, false);

// Note: There is only one point to this. I'm just curious if this (and more importantly 'online') is triggered outside a documentready as the docs seem to indicate won't work
// https://www.npmjs.com/package/cordova-plugin-network-information
document.addEventListener('offline', function() {
    logActivity('*** app gone OFFLINE ***');
	}, false);

document.addEventListener('pause', function() {
    logActivity('*** app PAUSED ***');
	}, false);

document.addEventListener('resume',	function() {
	// TODO: add stopScan for pause
	logActivity('*** app RESUMED ***');

	if (navigator.connection.type && navigator.connection.type != Connection.UNKNOWN && navigator.connection.type != Connection.NONE) {
		logActivity('Resumed, so attempting to sync to remote datastore ..');
		localStore.sync(remoteStore).on('complete',
			function (info) {
				logActivity(" .. succeeded!");
				}).on('error',
			function (err) {
				logActivity(" .. failed, we'll try again later.");
			});
	}
	}, false);

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
			function(error) {
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

function Journey(title) {
	var __this = this;
	this['track'] = null;
	this['title'] = title;
	this['status'] = 'pending';

	this.start = function(onSuccess) {
		this.track = new Track(this);
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

			__this.status = 'uploaded'; // legacy term, but basically doneski
		}
		else {
			logActivity('No waypoints recorded, not uploading', 'warning');
			// TODO: maybe delet ethe empty track document?
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

	console.log('Initialised Journey object');

	/* *** TODO
	Methods: /isActive, -finish, abort, review
	Properties: __stats? title, status
	*/
	};

function Track(parentJourney) {
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
					},
				'properties': {
					'coordinateProperties': { // refer https://github.com/mapbox/geojson-coordinate-properties
						'times': [],
						},
					},
				}],
			'properties': {
				'schema':  '0.02',
				'name':    parentJourney.title,
				'version': _VERSION,
				'device':  settings.getItem('pairedDevice'),
				'started': created,
				'rider':   settings.getItem('riderName'),
				},
		};

		skeleton['_id'] = config.dataStore.prefix + Date.now();
		console.log(JSON.stringify(skeleton));
		localStore.put(skeleton).then(
			function(result) {
				console.log('yay');
				console.log(result);
				__this.cache = skeleton;
				localStore.sync(remoteStore, {live: true}).on('change',
					function (info) {
						console.log('info: ' + JSON.stringify(info));
					});
			}).catch(
			function(err) {
				console.log('boo');
				console.log('err: ' + err.name + JSON.stringify(err));
				// TODO - a better fail
			});
		};

	// currently wraps this.sync() but will not be required after migration to PouchDB
	this.store = function() {
		localStore.get(__this.cache._id).then(
			function(doc) {
				localStore.put(Object.assign({}, __this.cache, {'_rev': doc._rev})).then(
					function(result) {
						console.log('yay update!');
						console.log(result);
					}).catch(
					function(err) {
						console.log('boo update for rev' + doc._rev + ' doc ' + __this.cache._id);
						console.log('err: ' + err.name + JSON.stringify(err));
						// TODO - a better fail
					});
				});
		};

	this.updateMetadata = function(properties) {
		$.each(properties, function(key, val) {
			__this.cache.properties[key] = val;
			__this.store();
			});
		};

	this.addBreadcrumb = function(lonlat) {
		this.addData('position', lonlat);
	}

	this.hasTracks = function() {
		return (this.cache.features[0].geometry.coordinates.length && (this.cache.features[0].geometry.coordinates.length > 0)); // FIXME - not keen on relying on first position in this.cache.features array to identify the linestring (trail)
		};

	this.addData = function(measure, position, data) {
		var isBreadcrumb = ( measure == 'position' );
		var logThis = config.POSITION_LOGGING || !isBreadcrumb;
		var pointFeature = null;
		var timeStamp = new Date();

		logThis && logActivity('Adding ' + ( isBreadcrumb ? '' : measure + ' of ' + data.toString() + ' ') + 'to trail "' + parentJourney.title + '" @(' + position[0] + ',' + position[1] + ')' );

		var features = this.cache.features[0]; // FIXME - not keen on relying on first position in this.cache.features array to identify the linestring (trail)
		features.geometry.coordinates.push(position);
		features.properties.coordinateProperties.times.push(timeStamp.valueOf());

		if (!isBreadcrumb) {
			pointFeature = {
				'type': 'Feature',
					'geometry': {
						'type':        'Point',
						'coordinates': position,
					},
					'properties': {
						'time':    formatTimestamp(timeStamp, 'W3CDTF'), // FIXME ??
						'measure': measure,
						'value':   data,
					}
				};
			this.cache.features.push(pointFeature);
		}

		this.store();

		logThis && ( function() { // that is one pretentious if statement ;)
			console.log('Track2: ' + JSON.stringify(__this.cache));
			})();

		return pointFeature; // this will be null for breadcrumbs
		};

	this.close = function() {
		this.updateMetadata({'ended': new Date().toUTCString()}); // CHECKME: might be better off storing in UTC (also track.started)
	}

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
	journey.start( function() {
		logActivity('Journey ' + journey.title + ' STARTED');
		logActivity(JSON.stringify(journey.track.cache));
		});
}

function adaptiveFinish() {
	console.log('Big button Finish journey pressed');

	var title = journey.track.promptName();
	if (title !== null) {
		journey.track.rename(title);

		journey.finish( function() {
			logActivity('Journey2 ENDED');
			sensor.disconnect();
			// query.lastTrack();
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

function isFakingConnection() {
	return settings.getItem('connectAuthenticity') == 'fake';
}

function fauxConnected() {
	document.addEventListener('volumeupbutton', buttonGood, false);
	document.addEventListener('volumedownbutton', buttonBad, false);

	sensibelStatus.add('BLE');
	// adaptiveButton('start');
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
		/*
		var options = {
			color:     (val == '01' ? 'green' : 'red'), // FIXME: use classes if possible
			className: (val == '01' ? 'good' : 'bad'),
		};
		*/

		var waypoint = recordWaypoint('button', val, loc.coords);
		// console.log('WAYPOINT ' + JSON.stringify(waypoint));
		// markPosition(map, loc.coords, options);
		markWaypoint(map, waypoint);
	});
}

function markWaypoint(map, waypoint) {
	console.log('Marking waypoint (' + waypoint.geometry.coordinates[1] + ',' + waypoint.geometry.coordinates[0] + ') on map');
	var isGood = ( waypoint.properties.value == '01' );

	var options = {
		'color':     ( isGood ? 'green' : 'red' ), // FIXME: use classes if possible
	};

	if (map) {
		var uid = UUishID(true); // FIXME: if I end up using a precise enough UTC timestamp in geoJSON, that can serve as an identifier suffix
		var headline = '<h3>' + ( isGood ? 'Sweet!' : 'Stink' ) + '</h3>';
		// var formattedDate = $.formatDateTime('yy hh:ii', new Date(feature.properties.time.replace('Z','+13:00')));

		var commentValue = ( waypoint.properties.hasOwnProperty('comment') ? waypoint.properties.comment : '' );
		var metadata = ' \
			<p><strong>Position:</strong> ' + waypoint.geometry.coordinates[1] + ',' + waypoint.geometry.coordinates[0] + '</p> \
			<p><strong>Time:</strong> ' + waypoint.properties.time + '</p> \
			';
		if (commentValue.length > 0) {
			metadata += '<p><strong>Comment:</strong> ' + commentValue + '</p>';
		}

		var modalLink = '<p><a id="annotate-' + uid + '" data-rel="popup" href="#popup-' + uid + '" data-position-to="window" data-transition="slideup">Add notes</a></p>';

		// TODO: insert a Streetview(TM) image (if online) or other aide memoire here ??

		var notePlaceHolder = 'What was so ' + ( isGood ? 'good' : 'bad') + ' here?';
		var categoriesValue = ( waypoint.properties.hasOwnProperty('categories') ? waypoint.properties.categories : '' );
		var categoriesOptions = '';
		$.each(categories, function(index, value) {
			categoriesOptions += '<option value="' + value + '"' + ( categoriesValue == value ? ' selected="selected"' : '' ) + '>' + value + '</option>';
			});
		//  FIXME: add @data-title to div element, doesn't seem to work
		var modalContent = ' \
			<div data-role="popup" id="popup-' + uid + '" class="ui-content waypoint" data-dismissible="false" data-overlay-theme="a"> \
				<h4>Adding notes</h4> \
				<form> \
					<div class="field"> \
					<label for="note-"' + uid + '">Comment:</label> \
					<textarea data-setting="comment" placeholder="' + notePlaceHolder + '" name="note-"' + uid + '" id="note-"' + uid + '">' + commentValue + '</textarea> \
					</div> \
					<div class="field"> \
					<label for="category-"' + uid + '">Category:</label> \
					<select data-setting="category" name="category-"' + uid + '" id="category-' + uid + '"> \
					<option data-placeholder="true"></option> \
					' + categoriesOptions + ' \
					</select> \
					</div> \
					<div class="actions"> \
					<input type="reset" value="Cancel" id="' + uid + '-action-cancel" /> \
					<input type="submit" value="Save" id="' + uid + '-action-save" /> \
					</div> \
				</form> \
			</div> \
			';

		// $('#annotate-' + uid).button(); // FIXME: doesn't work :(
		var $popupContent = $('<div>' + headline + metadata + modalLink + modalContent + '</div>');
		var $modal = $popupContent.find('#popup-' + uid);
		$modal.submit( function(event) {
				event.preventDefault();
				// console.log('Before: ' + JSON.stringify(waypoint));
				$(this).find('[data-setting]:input').each( function() { // FIXME: ideally flag and only save the fields that were changed
					waypoint.properties[$(this).data('setting')] = $(this).val();
					// alert($(this).data('setting'));
				});
				// FIXME: sync limited to active journey and can only be done before upload, but works as limited app is now
				if (journey && journey.isActive()) {
					journey.track.sync();
				}
				$(this).popup('close');
				bellUI.popup('Notes saved'); // TODO: make popup success themed (green?)
				// console.log('After: ' + JSON.stringify(waypoint));
			});
		$modal.find(':reset').click( function(event) {
			event.preventDefault();
			$modal.popup('close');
			bellUI.popup('Notes cancelled'); // TODO: make popup fail themed (red?)
			});
		$modal.find('select').selectmenu();
		$modal.popup();

		L.circleMarker(L.latLng(waypoint.geometry.coordinates[1], waypoint.geometry.coordinates[0]), options)
			.bindPopup(L.popup({'className':'notes ' + ( isGood ? 'good' : 'bad')}).setContent($popupContent[0]))
			.addTo(map)
			;
	}
	else {
		console.log('No map to mark!');
	}
}

function recordWaypoint(field, val, latlon) {
	var waypoint = null;
	if (journey && journey.isActive()) {
		console.log('Recording position (' + latlon.latitude + ',' + latlon.longitude + ')');
		waypoint = journey.track.addData(field, [latlon.longitude, latlon.latitude], val);
	}
	else {
		console.log('No journey to record (' + latlon.latitude + ',' + latlon.longitude + ') to!');
	}
	return waypoint; // null on error
}

function appStatus(initialState) {
	this.state = {};

	this.__reset = function(statuses) { // FIXME: something something scope something -should be private methods
		console.log(JSON.stringify(statuses));
		var defaultStatuses = {
			'net': null,
			'GPS': null,
			'BLE': null,
			'tracking': null,
			};
		this.state = Object.assign({}, defaultStatuses, ( statuses ? statuses : {} ));
		console.log(JSON.stringify(this.state));
		this.__reflect();
	};

	var backup = function(state) {
		return JSON.parse(JSON.stringify(state)); // clones it fastly, according to http://stackoverflow.com/a/5344074
	}

	this.add = function(property) {
		if(this.state.hasOwnProperty(property)) {
			var prior = backup(this.state);
			this.state[property] = true;
			this.__reflect(prior);
		}
	};

	this.remove = function(property) {
		if(this.state.hasOwnProperty(property)) {
			var prior = backup(this.state);
			this.state[property] = false;
			this.__reflect(prior);
		}
	};

	this.__reflect = function(previousState) {
		console.log('Reflecting state ' + JSON.stringify(this.state));
		if (previousState) {
			console.log('.. coming from state ' + JSON.stringify(previousState));
		}

		if(this.state.tracking) {
			adaptiveButton('stop');
		}

		if (this.state.GPS) {
			if(this.state.BLE) {
				if(this.state.tracking) {
					displayStatus('Tracking', 'tracking'); // ******* F
				}
				else {
					if (isFakingConnection()) {
						displayStatus('Faux connected', 'success');
					}
					else {
						displayStatus('Connected', 'ready'); // ******* E
					}
					adaptiveButton('start');
				}
			}
			else {
				if(this.state.tracking) {
					displayStatus('Disconnected', 'warning'); // ******** H
				}
				else { // TODO - adapt message depending on previous state as per GPS below
					displayStatus('Not connected', 'warning'); // ********* D
					adaptiveButton('connect');
				}
			}

		}
		else { // !GPS
			if(this.state.BLE) {
				if(this.state.tracking) {
					displayStatus('Lost GPS', 'warning'); // ******* C
				}
				else { // ******* B
					if (this.state.GPS === null) {
						displayStatus('Finding GPS', 'pending');
					}
					else if (previousState) {
						if (previousState.GPS === null) {
							displayStatus('GPS timed out', 'warning');
						}
						else {
							displayStatus('Lost GPS', 'warning');
						}
					}
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
b	x		/		x				Pending	Waiting GPS	(spinner)
c	x		/		/				warning	Lost GPS	Stop
d	/		x		x				warning	Not connected Connect
e	/		/		x		.		Ready 	Connected	Start
f	/		/		/				trackingTracking	Stop
g	x		x		/				warning	Lost GPS & Dis	Stop
h	/		x		/				warning	Disconnected	Stop

buttons - wait, connect, start, stop, -->review
status: pending=grey, warning=red, ready=green, tracking=blue            , finished
*/

function populateCategories() { // TODO: this should sync with an online store if online
	return [
		'Infrastructure',
		'Environmental',
		'Wayfinding',
		'Social',
		'Safety',
		'Near miss',
		'Traffic',
		'Bike mechanics',
		];
	}

// ** Any temporary changes we might need when we break the application API in a new version, or any development parameters
function configManagementHacks() {
	// settings.setItem('file.prefix', 'dev-'); // console.log(settings.getItem('file.prefix'));
	// settings.removeItem('file.prefix');

	initialiseUsingDefault('connectAuthenticity', (config.useFauxConnection ? 'fake' : 'real') );
	// initialiseUsingDefault('bucketName', config.AWS_S3.bucket);
}

function initialiseUsingDefault(settingName, defaultValue) {
	if ( !settings.hasItem(settingName, true) ) {
		settings.setItem(settingName, defaultValue);
		console.log('settings:' + settingName + ' was set to ' + defaultValue);
		return defaultValue;
	}
	else {
		return settings.getItem(settingName);
	}
}

/* Globals */

// Kludge setting
var POUCH_FIND_SUPPORTS_LOGIC_JUNCTIVE_OPS = false; // this helps us work around some non-supported logical operators in local PouchDB - "$and" as well as, it seems, probably "$or" and "$nor" at least
// (error: unknown operator "$and" - should be one of $eq, $lte, $lt, $gt, $gte, $exists, $ne, $in, $nin, $size, $mod, $regex, $elemMatch, $type or $all)
// this doesn't happen on Cloudant (server)
// https://github.com/pouchdb/pouchdb/issues/6366 is probably(?) relevant

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

var categories;

populateCategories();
configManagementHacks();

document.addEventListener('deviceready', function() {

	if (navigator.camera) {
		$('#camera').show();
		$('#picture').removeClass('disabled');
		$('#picture, #camera img').click( function() {
			var photo = new CapturedMedia();
			photo.grab();
			});
	}

	evothings.scriptsLoaded( function() {
		setSensor();
		console.log('Set to ' + sensor.target);
		});
	$('#adaptive-connect').click();


	if (SBUtils.isOnline()) {
		bellUI.popup('Online via connection type ' + navigator.connection.type, 'long');
		logActivity('Attempting to sync to remote datastore ..');
		syncData(function() {
			syncMedia(!POUCH_FIND_SUPPORTS_LOGIC_JUNCTIVE_OPS);
			});
	}
	else {
		bellUI.popup('Not online', 'long', { fallback: window.alert });
	}

	document.addEventListener('online',	function() {
		logActivity('*** app now ONLINE ***');
		logActivity('Now online, so syncing to remote datastore ..');

		if (SBUtils.uploadHappy()) {
			CapturedMedia.checkUploads(); // TODO - stub and should call next block in its success callback when implemented
			syncData(function() {
				syncMedia(!POUCH_FIND_SUPPORTS_LOGIC_JUNCTIVE_OPS);
				});
		}
		}, false);


	document.addEventListener('offline', function() {
		logActivity('*** app gone OFFLINE ***');
		}, false);

	document.addEventListener('pause', function() {
		logActivity('*** app PAUSED ***');
		}, false);

	document.addEventListener('resume',	function() {
		// TODO: add stopScan for pause
		logActivity('*** app RESUMED ***');

		if (SBUtils.isOnline()) {
			logActivity('Resumed, so attempting to sync to remote datastore ..');
			syncData();
		}
		}, false);

	});

function logPosition(logSuccessOps, logFailOps, options) { // NB: initial val parameter has been removed, also logFailOps parameter inserted before options parameter
	logFailOps = logFailOps || function() {
		bellUI.popup("Couldn't locate :(", 'short'); // FIXME: do something more useful with this
		};

	if ( options === undefined ) {
		options = config.geoPositionOptions;
	}

	if (navigator.geolocation) {
		// console.log('supports ' + navigator.geolocation);
		return navigator.geolocation.getCurrentPosition(
			function(position) {
				logActivity('positioned@ (' + position.coords.latitude + ',' + position.coords.longitude + ')');
				logSuccessOps.call(this, position);
			},
			function(error) {
				logActivity("couldn't locate, error #" + error.code + ': "' + error.message + '"');
				logFailOps();
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
			return;
		}

		onSuccess && onSuccess.call();

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
				'schema':  '0.03',
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
				__this.id = skeleton._id;
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

	this.addMedia = function(position, properties) {

		logActivity('Adding media reference to trail "' + parentJourney.title + '" @(' + position[0] + ',' + position[1] + ')' );

		// FIXME - fails when there are no features yet!
		// console.log(JSON.stringify(this.cache));
		var features = this.cache.features[0]; // FIXME - not keen on relying on first position in this.cache.features array to identify the linestring (trail)

		var geometry = {
			'type':        'Point',
			'coordinates': position,
			};

		if (!properties.hasOwnProperty('time')) {
			var timeStamp = new Date();
			properties.time = formatTimestamp(timeStamp, 'W3CDTF');
		}

		var pointFeature = turf.feature(geometry, properties);
		this.cache.features.push(pointFeature);

		this.store();
		console.log('Track2: ' + JSON.stringify(this.cache));

		return pointFeature;
		};

	this.addData = function(measure, position, data) {
		var isBreadcrumb = ( measure == 'position' );
		var logThis = config.POSITION_LOGGING || !isBreadcrumb;
		var pointFeature = null;
		var timeStamp = new Date(); // FIXME - I should be using the geolocation API Position.timestamp

		logThis && logActivity('Adding ' + ( isBreadcrumb ? '' : measure + ' of ' + data.toString() + ' ') + 'to trail "' + parentJourney.title + '" @(' + position[0] + ',' + position[1] + ')' );

		// FIXME - fails when there are no features yet!
		// console.log(JSON.stringify(this.cache));
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
	this.rename = function(newTitle, onRenameSuccess) {
		console.log('Renaming track');
		this.updateMetadata({'name': newTitle});
		logActivity('New trackname: ' + newTitle);
		onRenameSuccess && onRenameSuccess();
	}

	this.promptName = function(onPromptSuccess) {
		var promptDefault = __defaultTitle();

		__this.rename(window.prompt(
			'Edit the name of your journey?',
			promptDefault
			), onPromptSuccess);
	}

	var __defaultTitle = function() {
		return formatTimestamp(new Date(), 'trackname');
	}

	/* *** TODO
	Methods: /create?, upload, /sync, /addMetadata, /addData, /hasTracks, /rename, /promptName, /__defaultName, close, addMedia, __save, load
	Properties: source, __stats
	*/

	};

function syncData(onSyncSuccess, onSyncFailure) {
	if (localStore) {
		localStore.sync(remoteStore).on('complete',
			function (info) {
				logActivity(" .. succeeded syncing to remote datastore!");
				onSyncSuccess && onSyncSuccess.call();
				}
			).on('error',
			function (err) {
				logActivity(" .. failed syncing to remote datastore, we'll try again later.");
				onSyncFailure && onSyncFailure.call();
				}
			);
	}
}

function syncMedia(remoteQuery) { // we are happy to treat remoteQuery as false if not supplied!
	// FIXME: Completion of all callbacks in the loops of this function should be followed by a call to syncData(), however, I don't currently know how to detect their completion

	// TODO: need to look at allowing cleanup of local media after upload, according to user preferences

	logActivity('Going to sync media files then notarise them, remoteQuery is ' + (remoteQuery ? 'true' : 'false'));

	var metadataSource = ((remoteQuery || !localStore) ? new MangoHTTP(config.dataStore.endpoint, config.dataStore.database, {auth_user: config.dataStore.username, auth_pass: config.dataStore.password,}) : localStore);
	// TODO - get the MangoHTTP .find() and .index() interfaces close to PouchDB's, then we can apply the same methods to source and will work regardless of prototype

	var fastestDocumentSource = localStore || metadataSource; // we're going to use localStore if it is available in some contexts below regardless of remoteQuery (in fact, we don't support fetch remotely (MangoHTTP.fetch()) yet!) (FIXME)

	var userName = settings.getItem('riderName');  // TODO: this value should really be more abstractly available in Personalization 2.0

	logActivity('userName is ' + userName); // logActivity('Now fudged to ' + (userName=''));

	// request object is code-formatted for strict JSON in a departure from style because it's easier that way to move between online query tools (thanks Douglas C :( )
	var request = {
		"selector": {
			"properties.rider": userName,
			"features": {
				"$and": [
					{
						"$elemMatch": {
							"geometry.type": "LineString"
						}
					},
					{
						"$elemMatch": {
							"properties.type": {
								"$in": ["image/jpeg"] // FIXME - cater for other media types
							},
							"properties.remote_id": {
								"$exists": false
							}
						}
					}
				]
			}
		},
		"fields": [
			"_id",
			"_rev"
		],
		"sort": [
			{
				"_id": "asc"
			}
		]
	};

	// FIXME: this index is not being engaged by the query, so tweak it!
	var syncIndex = {
		index: {
			fields: [
				'properties.rider',
				'features',
				],
			}/*,
		missing_is_null: true */
		};

	metadataSource.createIndex(syncIndex, function() {
		logActivity('Created an index');
		// logActivity(JSON.stringify(request));
		metadataSource.find(request, function(result) {
			logActivity('Successful find! Moving on ..');
			// logActivity(JSON.stringify(result));

			result.docs.forEach( function(val, idx) {
				logActivity(val._id);

				fastestDocumentSource.get(val._id, {
					'rev': val._rev,
					})
					.then( function(doc) {

						// loop through any unuploaded media records
						doc.features.forEach( function(feature) { // TODO use arr.filter() here. it's better (predicate just below)
							logActivity('Properties.type: ' + feature.properties.type);
							logActivity('Properties.remote_id: ' + feature.properties.remote_id);

							if (feature.properties.hasOwnProperty('type') && ['image/jpeg'].includes(feature.properties.type) && typeof(feature.properties.remote_id) == 'undefined') {

								// create capturedMedia - we wanna get loaded!
								var oldPhoto = new CapturedMedia(feature.properties.name);

								oldPhoto.loadFile( function() {
									// __this['journey'] = sensibelStatus.state.tracking ? journey : null; // FIXME ?
									logActivity('capturedMedia ' + feature.properties.name + ' load-ed properly');

									// if(feature.properties.name.indexOf('661302d5-') == 0) { // for selective testing
									oldPhoto.beamup( function() {
										// logActivity('Beam is real');
										var responseJSON = JSON.parse(this.responseText);

										logActivity('Need to notate ' + responseJSON.data.id + ' on ' + feature.properties.name + ' in journey ' + doc._id);

										Object.assign(feature.properties, {
											'remote_id': responseJSON.data.id,
											'URL': 'http://imgur.com/' + responseJSON.data.id,
											});

										// Note: updating/putting for every feature seems less efficient than putting the whole document up only after beamup() callbacks have completed, but I'm not sure how safe bulding up a single updated doc would really be if it took some time and got interrupted. It would probably work, but we'd have images uploaded multiple times until a full successful journey load happens.
										// Simplest way I can think of to make a delayed single upload would be to wrap this put() in a check to see if it's the last in the forEach() index. We won't need to check the rev then, so that's simpler.
										localStore.put(doc)
											.then( function(response) {
												logActivity('We put it!');

												// TODO: cleanup local file depending on config

												doc._rev = response.rev; // for next revision
												}, function(err) {
												logActivity('Could not update metadata, maybe next time.');
												});

										});
									// }

									}, function() {
										logActivity('capturedMedia load-ed NOT properly');
									}
									);
								logActivity('Journey feature updated to: ' + JSON.stringify(feature.properties));
							}
							});
					}, function(err) {
						logActivity('> error fetching doc! <');
						// TODO
					});
				});
			// have tried with .then() in here
			});
	});

	// this and the journey media uploads (both asynchronous) should be able to be dispatched in parallel

	// request object is code-formatted for strict JSON in a departure from style because it's easier that way to move between online query tools (thanks Douglas C :( )
	var floatingRequest = {
		"selector": {
			"properties.rider": userName,
			"properties.type": {
					"$in": ["image/jpeg"]
				},
			"properties.remote_id": {
				"$exists": false
			}
		},
		"fields": [
			"_id",
			"_rev"
		],
		"sort": [
			{
				"_id": "asc"
			}
		]
	};

	// FIXME: this index is not being engaged by the query either, so tweak it!
	var floatingSyncIndex = {
		index: {
			fields: [
				'properties.rider',
				'properties.type',
				'properties.remote_id',
				],
			}
		};

	metadataSource.createIndex(floatingSyncIndex, function() {
		logActivity('Created an index for floating media');
		// logActivity(JSON.stringify(request));
		metadataSource.find(floatingRequest, function(result) {
			logActivity('Successful floating media find! Moving on ..');
			// logActivity(JSON.stringify(result));

			result.docs.forEach( function(val, idx) {
				logActivity(val._id);

				fastestDocumentSource.get(val._id, {
					'rev': val._rev,
					})
					.then( function(doc) {

						// loop through any unuploaded media records
						logActivity('Floating properties.type: ' + doc.properties.type);
						logActivity('Floating properties.remote_id: ' + doc.properties.remote_id);

						// create capturedMedia - we wanna get loaded!
						var oldPhoto = new CapturedMedia(doc.properties.name);

						oldPhoto.loadFile( function() {
							// __this['journey'] = sensibelStatus.state.tracking ? journey : null; // FIXME ?
							logActivity('floating capturedMedia ' + doc.properties.name + ' load-ed properly');

							// if(feature.properties.name.indexOf('661302d5-') == 0) {
							oldPhoto.beamup( function() {
								// logActivity('Beam is real');
								var responseJSON = JSON.parse(this.responseText);

								logActivity('Need to notate ' + responseJSON.data.id + ' on ' + doc.properties.name);

								Object.assign(doc.properties, {
									'remote_id': responseJSON.data.id,
									'URL': 'http://imgur.com/' + responseJSON.data.id,
									});

								localStore.put(doc)
									.then( function(response) {
										logActivity('We floating put it!');

										// TODO: cleanup local file, depending on config

										}, function(err) {
										logActivity('Could not update floating file metadata, maybe next time.');
										});

								});

							}, function() {
								logActivity('floating capturedMedia load-ed NOT properly');
							}
							);
						}, function(err) {
							logActivity('> error fetching floating doc! <');
							// TODO
						});
				});
			});
	});

	// TODO: run a DB sync

	// TODO: run a DB sync
	// (yup, see comment at top)
}

function adaptiveStart() {
	console.log('Big button Start journey pressed');
	journey.start( function() {
		logActivity('Journey ' + journey.title + ' STARTED');
		logActivity(JSON.stringify(journey.track.cache));
		});
}

function adaptiveFinish() {
	console.log('Big button Finish journey pressed');

	journey.track.promptName( function(){
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
	);
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
	logActivity('*** KEY ' + val + ' ****  triggered');

	logPosition(function(loc) {
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
		// var wayPopup = L.popup({'className':'notes ' + ( isGood ? 'good' : 'bad')});
		var headline = '<h3>' + ( isGood ? 'Sweet!' : 'Stink' ) + '</h3>';
		// var formattedDate = $.formatDateTime('yy hh:ii', new Date(feature.properties.time.replace('Z','+13:00')));

		var commentValue = ( waypoint.properties.hasOwnProperty('comment') ? waypoint.properties.comment : '' );
		var metadata = ' \
			<p><strong>Position:</strong> (' + SBUtils.round(waypoint.geometry.coordinates[1], 5) + ', ' + SBUtils.round(waypoint.geometry.coordinates[0], 5) + ')</p> \
			<p><strong>Time:</strong> ' + waypoint.properties.time + '</p> \
			';

		//		if (journey && journey.isActive()) {
		var notePlaceHolder = 'What was so ' + ( isGood ? 'good' : 'bad') + ' here?';
		var categoriesValue = ( waypoint.properties.hasOwnProperty('categories') ? waypoint.properties.categories : '' );
		var categoriesOptions = '';
		$.each(categories, function(index, value) {
			categoriesOptions += '<option value="' + value + '"' + ( categoriesValue == value ? ' selected="selected"' : '' ) + '>' + value + '</option>';
			});

		var editing = '\
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
			';
		//		}


		var $popupContent = $('<div>' + headline + metadata + editing + '</div>');

		var $edits = $popupContent.find('form'); // '#popup-' + uid);
		$edits.submit( function(event) {
			event.preventDefault();
			// console.log('Before: ' + JSON.stringify(waypoint));
			$(this).find('[data-setting]:input').each( function() { // FIXME: ideally flag and only save the fields that were changed
				waypoint.properties[$(this).data('setting')] = $(this).val();
				// alert($(this).data('setting'));
				});
			
			// FIXME: legacy restrictions below?
			//				if (journey && journey.isActive()) {
			journey.track.store();
			//				}
			
			bellUI.popup('Notes saved'); // TODO: make popup success themed (green?)
			// TODO: close the leaflet popup - below fails I think because it's not visible in scope
			// wayPopup.closePopup();
			// console.log('After: ' + JSON.stringify(waypoint));
			});
		$edits.find(':reset').click( function(event) {
			event.preventDefault();
			bellUI.popup('Notes cancelled'); // TODO: make popup fail themed (red?)
			// TODO: close the leaflet popup - below fails I think because it's not visible in scope
			// wayPopup.closePopup();
			});
		$edits.find('select').selectmenu();

		L.circleMarker(L.latLng(waypoint.geometry.coordinates[1], waypoint.geometry.coordinates[0]), options)
			.bindPopup(L.popup({'className':'notes ' + ( isGood ? 'good' : 'bad')}).setContent($popupContent[0]))
			.addTo(map)
			;
	}
	else {
		console.log('No map to mark!');
	}
}

function markMediapoint(mediapoint, targetMap) { // this is going to be very similar to markWaypoint(), just I want a slightly different interface (mediapoint, targetMap?) and this being MVP ..
	logActivity('Marking mediapoint (' + mediapoint.geometry.coordinates[1] + ',' + mediapoint.geometry.coordinates[0] + ') on map');

	var mediaType = mediapoint.properties.type;
	var mediaCategory = mediaType.split('/').shift();
	targetMap = targetMap || map;

	if (targetMap) {
		var headline = '<h3>' + mediaCategory + '</h3>';
		// var formattedDate = $.formatDateTime('yy hh:ii', new Date(feature.properties.time.replace('Z','+13:00')));

		var metadata = ' \
			<p><strong>Position:</strong> ' + mediapoint.geometry.coordinates[1] + ',' + mediapoint.geometry.coordinates[0] + '</p> \
			<p><strong>Time:</strong> ' + mediapoint.properties.time + '</p> \
			';

		var mediaThumb = ( !cordova.file ? '' : function() {
			var dataDirectoryLocation = ( SBUtils.isAndroid() ? cordova.file.externalDataDirectory : cordova.file.dataDirectory ) + '/' + config.capturedMedia.LOCAL_DIRECTORY;

			var stashedLocation = dataDirectoryLocation + '/' + mediapoint.properties.name;

			logActivity("We'll retrieve from  " + stashedLocation);

			return ('<img style="max-width:150px;" src="' + stashedLocation + '" type="' + mediapoint.properties.type + '" />');
			}() );


		var $popupContent = $('<div>' + headline + mediaThumb + '</div>');

		var mediaIcon = L.icon({
			iconUrl: 'libs/jquery-mobile/images/icons-png/camera-black.png',
			});

		L.marker(L.latLng(mediapoint.geometry.coordinates[1], mediapoint.geometry.coordinates[0]), {
			icon: mediaIcon,
			})
		.bindPopup(L.popup({
			'className':'media ' + mediaCategory,
			}).setContent($popupContent[0]))
		.addTo(targetMap);

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

function populateCategories() {
	logActivity('Loading categories from document ' + config.dataStore.sources.settings);
	localStore.get(config.dataStore.sources.settings)
		.then(function(doc) {
			logActivity('Loaded categories from document ' + config.dataStore.sources.settings + '. NB: this will not update until the app restarts.');
			// TODO: possibly check schema in future before interpreting
			logActivity('Categories will be: ' + JSON.stringify(doc.settings.categories));
			categories = doc.settings.categories;
			})
		.catch(function(err) {
			logActivity('Unable to access categories source: ' + config.dataStore.sources.settings);
			// let's hard code this to a standard list to head off any serious problems with this new feature
			categories = [
				'Infrastructure',
				'Environmental',
				'Wayfinding',
				'Social',
				'Safety',
				'Near miss',
				'Traffic',
				'Bike mechanics',
				];
			});
	}

// ** Any temporary changes we might need when we break the application API in a new version, or any development parameters
function configManagementHacks() {
	// settings.setItem('riderName', 'Carl');
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

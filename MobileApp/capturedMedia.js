// requires: cordova, File plugin, Camera plugin

function CapturedMedia(mediaName) {

	var __this = this;

	this['location'] = this['type'] = this['name'] = this['feature'] = null;
	this['fileObject'] = this['fileEntry'] = this['localURI'] = null;

	this.stash = function(URI, stashSuccessOps, stashFailOps) {
		stashSuccessOps = stashSuccessOps || function() {
			logActivity('Success stashing image to ' + dir + '/' + fileName);
			};
		stashFailOps = stashFailOps || function() {
			logActivity('Failed stashing image to ' + dir + '/' + fileName);
			};

		if(cordova.file) {
			logActivity('External dir: ' + cordova.file.externalApplicationStorageDirectory);
			logActivity('App storage dir: ' + cordova.file.applicationStorageDirectory);

			var dataDirectoryLocation = ( SBUtils.isAndroid() ? cordova.file.externalDataDirectory : cordova.file.dataDirectory );

			logActivity("We'll use " + dataDirectoryLocation);

			window.resolveLocalFileSystemURL(dataDirectoryLocation, function (fs) {
				// logActivity('gonna try creating dir..');
				fs.getDirectory(config.capturedMedia.LOCAL_DIRECTORY, {
					create: true,
					exclusive: false,
					}, function(dir) {
						logActivity('Success creating or opening media directory ' + dir.fullPath);
						var fileName = __this.uuid + '.jpg';

						window.resolveLocalFileSystemURL(URI, function(fileEntry) {
							console.log("got file: " + fileEntry.fullPath);
							__this.name = fileName;
							fileEntry.moveTo(dir, fileName, function(fe) {
								// __this.localURI = fileEntry.toURL();
								// __this.fileObject = fe.file(/* stashSuccessOps */ function(fo){logActivity('File object init to: ' + JSON.stringify(__this.fileObject));}, stashFailOps);



				fe.file(/* stashSuccessOps */ function(fo){
					__this.fileObject = fo;
					logActivity('File object init to: ' + JSON.stringify(__this.fileObject));

					/*
					var readerTmp = new FileReader();

					readerTmp.onloadend = function(e) {
						__this.b64 = readerTmp.result;

						logActivity('Just set to ' + __this.b64);
						};

					readerTmp.readAsDataURL(fo);
					*/

					stashSuccessOps.call();
					}, stashFailOps);



								__this.fileEntry = fe;

logActivity('File entry init to: ' + JSON.stringify(__this.fileEntry)); // FE object


								__this.localURI = fe.toURL();


								logActivity('CapturedMedia.fileEntry URL is ' + fe.toURL());
								}, stashFailOps);
							}, function() {
							// If don't get the FileEntry (which may happen when testing
							// on some emulators), copy to a new FileEntry.
							logActivity('Failed to resolve URI ' + URI + ' as fileEntry: ' + err + '(https://www.w3.org/TR/2011/WD-file-system-api-20110419/#idl-def-FileError)');
							stashFailOps();
							});
					}, function(err) {
						logActivity('Failed creating or accessing media directory ' + dataDirectoryLocation + '/' + config.capturedMedia.LOCAL_DIRECTORY + ': ' + err + '(https://www.w3.org/TR/2011/WD-file-system-api-20110419/#idl-def-FileError)');
						stashFailOps();
					});
				}, function() {
					logActivity('Failed to resolve media directory ' + dataDirectoryLocation + ': ' + err + '(https://www.w3.org/TR/2011/WD-file-system-api-20110419/#idl-def-FileError)');
					stashFailOps();
				});
			}
			else {
				logActivity('cordova.file is not supported here, image stuck at ' + URI);
				logActivity("We'll see how we go using the default storage details");

				// __this.localURI = URI;
				var fileName = URI.split('/').pop();
				__this.name = fileName;

				stashSuccessOps();
				/*
				window.resolveLocalFileSystemURL(URI, function(fileEntry) {
					__this.fileObject = fileEntry.file(stashSuccessOps, stashFailOps);
					}, stashFailOps);
				*/

			}
		};

	this.plot = function(targetMap) {
		logActivity('Plotting on map ...');
		markMediapoint(__this.feature, targetMap);
	}

	this.snap = function(grabSuccessOps, grabFailOps) {

		grabSuccessOps = grabSuccessOps || function() {
			logActivity('Default CapturedMedia.grab: grabSuccessOps() being called ..');
			logActivity('Preparing to notarise.');
			__this.notarise();
			logActivity('Notarised.');
			bellUI.popup('Picture stored');
			if (SBUtils.uploadHappy()) {
				logActivity('Happily ready to upload');
				__this.beamup( function() {
					var responseJSON = JSON.parse(this.responseText);
					__this.addProperties({
						'remote_id': responseJSON.data.id,
						'URL': 'http://imgur.com/' + responseJSON.data.id,
						});
					});
			}
			};
		grabFailOps = grabFailOps || function() {
			logActivity('Default CapturedMedia.grab: grabFailOps() being called ..');
			};

		__this.type = 'image/jpeg';
		logPosition( function(loc) {
			__this.location = [loc.coords.longitude, loc.coords.latitude]; // FIXME: temporary, we actually will want to pass and use the whole loc object, like the next commented line: ..
			// __this.location = loc;
			navigator.camera.getPicture( function(path) {
				console.log('Stored in ' + path);
				// __this.description TODO

				// store filename in DB
				__this.stash(path, function() {
					grabSuccessOps();



					}, grabFailOps);

				},
				function() {
					console.log('camera failed or whatever FIXME');
					grabFailOps();
				},
				{
					// select from https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-camera/index.html#module_camera.CameraOptions
				});
			}, function() {
			bellUI.popup("Can't geolocate captured media");

			// FIXME: what gets notarised when we don't know the location yet?
			__this.location = dummyLoc; // TODO: approximate from last position and tag as uncertain

			navigator.camera.getPicture( function(path) {
				console.log('Stored in ' + path);
				// __this.description TODO
				__this.stash(path, grabSuccessOps, grabFailOps);
				},
				function() {
					console.log('camera failed or whatever FIXME');
					grabFailOps();
				},
				{
					// select from https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-camera/index.html#module_camera.CameraOptions
				});
			} /* , {} geo options go here */ );
	};

	this.addProperties = function(additionalProperties) {
		if(this.journey) {
			logActivity('Part of ' + this.journey.track.id);

			if(journey.isActive()) {
				logActivity('AN ACTIVE journey');

				turf.propEach(this.journey.track.cache, function (currentProperties, currentIndex) {
					if (currentProperties.name == __this.uuid + '.jpg') {
						Object.assign(currentProperties, additionalProperties);
						logActivity('Rev ' + doc._rev);
					}
					});
				this.journey.track.store();
			}

			else {

				// FIXME: not tested
				// get doc with that id
				localStore.get(this.journey.track.id)
					.then(function(doc) {
						logActivity(JSON.stringify(doc.features));

						turf.propEach(doc, function (currentProperties, currentIndex) {
							// logActivity(currentIndex + '. ' + JSON.stringify(currentProperties));
							if (currentProperties.name == __this.uuid + '.jpg') {
								Object.assign(currentProperties, additionalProperties);
								// Object.assign(doc.features[currentIndex].properties, additionalProperties);
								// logActivity(JSON.stringify(currentProperties));
								logActivity('Rev ' + doc._rev);


								localStore.put(doc)
									.then(function(response) {
										logActivity(JSON.stringify(response));
										logActivity('Media file identifiers added to ' + __this.journey.track.id);
										})
									.catch(function (err) {
										logActivity('Failed adding media file identifiers to ' + __this.journey.track.id);
										logActivity(err);
										// TODO: how to handle this?
										});
							}
							});



						})
					.catch(function (err) {
						logActivity("Didn't find doc with id == " + __this.journey.track.id);
						// TODO: how to handle this?
						});
				}
		}
		else {
			logActivity('Floating file id: ' + __this.uuid);
			localStore.get(__this.uuid)
				.then(function(doc) {
					Object.assign(doc.properties, additionalProperties, {
						'rider': settings.getItem('riderName'),
						});
					logActivity(JSON.stringify(doc));
					localStore.put(doc)
						.then(function(response) {
							logActivity('Floating media file updated.');
							})
						.catch(function (err) {
							logActivity('Update of floating media file failed.');
							// TODO: how to handle this?
						})
					});

		}
		};

	this.notarise = function(additionalProperties) {
		additionalProperties = additionalProperties || {};
		var standardProperties = {
			'type': __this.type,
			'name': __this.name,
			}; // TODO , __this.description);
		var properties = Object.assign({}, standardProperties, additionalProperties);
		// TODO: annotation popup

		if(sensibelStatus.state.tracking) {
			__this.feature = journey.track.addMedia(__this.location, properties);
			if (map) {
				__this.plot(map); // FIXME: this is not actually tested
			}
		}
		else {

			logActivity('Adding ' + __this.name + ' as floating media to Couch (1)');

			// must add 'time' here if omitted, which is a bit repetitive (refactor?)
			if (!properties.hasOwnProperty('time')) {
				var timeStamp = new Date();
				properties.time = formatTimestamp(timeStamp, 'W3CDTF');
				};

			logActivity('properties: ' + JSON.stringify(properties));
			logActivity('this.location: ' + JSON.stringify(__this.location));

			__this.feature = turf.point(__this.location, properties);
			// TODO: annotation popup

			logActivity('Adding ' + __this.name + ' as floating media to Couch');
			console.log(JSON.stringify(__this.feature));

			localStore.put(Object.assign({'_id': __this.uuid,}, __this.feature)).then(
				function(result) {
					if (map) {
						__this.plot(map);
					}
					console.log('yay point');
					console.log(result);
					localStore.replicate.to(remoteStore).then(
						function (info) {
							logActivity('Succeeded replicating floating file ' + __this.uuid + ' up:');
							console.log('info: ' + JSON.stringify(info));
						}, function(err) {
							logActivity('Replicating floating file ' + __this.uuid + ' up failed:');
							console.log(err);
						});
				}).catch(
				function(err) {
					logActvity('boo point');
					console.log('err: ' + err.name + JSON.stringify(err));
					// TODO - a better fail
				});
		}
	}

	this.beamup = function(onBeamSuccess, onBeamFail) {
		// background: https://gist.github.com/hughbris/65b3baa55b58acb7beaaad885a63a458
		var target = config.capturedMedia.REMOTE_API.endpoint + '/image';
		logActivity('Uploading image ' + __this.name + ' to ' + target);

		if(typeof(__this.fileObject) !== undefined) {
			logActivity('File object: ' + JSON.stringify(__this.fileObject));

			var rdr = new FileReader();

			rdr.onloadend = function(evt) {
				var imageBlob = new Blob([new Uint8Array(evt.target.result)], {
					'type': 'image/jpeg',
					});

				// https://blog.garstasio.com/you-dont-need-jquery/ajax/ - thank you!!
				var dataFields = new FormData();
				dataFields.append('image', imageBlob);
				dataFields.append('type', 'file');
				if (config.capturedMedia.hasOwnProperty('album')) {
					logActivity('Album will be ' + config.capturedMedia.album);
					dataFields.append('album', config.capturedMedia.album);
				}
				var post = new XMLHttpRequest();
				post.open('POST', target);
				post.setRequestHeader('Authorization', 'Bearer ' + config.capturedMedia.REMOTE_API.OAuth.access_token);
				post.send(dataFields);

				// FIXME: Imgur API is triggering this when the API key expires! also tested onloadend, need to check HTTP status or response body *groan*
				post.onload = function(evt) {
					logActivity('Uploaded image from ' + __this.name + ' to ' + target);
					// grab its ID and notarise that
					var responseJSON = JSON.parse(post.responseText);
					logActivity(JSON.stringify(responseJSON.data));
					onBeamSuccess && onBeamSuccess.call(post, evt);
					};

				post.onerror = function(err) { // untested
					logActivity('Failed uploading image from ' + __this.name + ': ' + JSON.stringify(err));
					logActivity('Output: ' + post.responseText);
					onBeamFail && onBeamFail(post, err);
					};

				};
			// rdr.error = function {} // TODO
			rdr.readAsArrayBuffer(__this.fileObject);
		}
		else {
			logActivity("Upload won't work without file system stuff, maybe implement a fixer later");
		}
	}

	this.loadFile = function(onLoadSuccess, onLoadFail) {
		logActivity('Loading media ..');

		if(cordova.file) {
			var dataDirectoryLocation = ( SBUtils.isAndroid() ? cordova.file.externalDataDirectory : cordova.file.dataDirectory ) + '/' + config.capturedMedia.LOCAL_DIRECTORY;

			logActivity("We'll retrieve from  " + dataDirectoryLocation);

			var stashedLocation = dataDirectoryLocation + '/' + __this.name;
			logActivity(stashedLocation);

			window.resolveLocalFileSystemURL(stashedLocation, function(fileEntry) {
				logActivity(JSON.stringify(fileEntry));

				fileEntry.file(function(fo) {
					__this.fileObject = fo;
					onLoadSuccess && onLoadSuccess.call();
					});
				});
		}
		else {
			onLoadFail && onLoadFail.call();
		}

		};

	var init = function() {
		// synonyms for methods, hmmm...
		__this.record = __this.take = __this.capture = __this.grab = __this.snap;
		__this.send = __this.upload = __this.beamup;

		if (mediaName) {
			__this.name = mediaName;
			__this['uuid'] = mediaName.replace('.jpg', ''); // FIXME: this is pretty hacky
		}
		else {
			__this['uuid'] = SBUtils.UUishID();
			__this['journey'] = sensibelStatus.state.tracking ? journey : null;
			logActivity('capturedMedia creat-ed');
		}

		logActivity('capturedMedia init-ed');
		}();

}

CapturedMedia.checkUploads = function() { // TODO
	logActivity('Here should be checking uploads - TODO');
	};
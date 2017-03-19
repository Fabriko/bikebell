// requires: cordova, File plugin, Camera plugin

function CapturedMedia() {

	var __this = this;
	this['location'] = this['type'] = this['name'] = null;

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
						var fileName = SBUtils.UUishID() + '.jpg';

						window.resolveLocalFileSystemURL(URI, function(fileEntry) {
							console.log("got file: " + fileEntry.fullPath);
							__this.name = fileName;
							fileEntry.moveTo(dir, fileName, stashSuccessOps, stashFailOps);
							}, function() {
							// If don't get the FileEntry (which may happen when testing
							// on some emulators), copy to a new FileEntry.
							logActivity('Failed to resolve URI ' + URI + ' as fileEntry: ' + err + '(https://www.w3.org/TR/2011/WD-file-system-api-20110419/#idl-def-FileError)');
							if(stashFailOps) {
								stashFailOps();
							}
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
				
				var fileName = URI.split('/').pop();
				__this.name = fileName;

				stashSuccessOps();
				// stashFailOps();
			}
		};

	this.snap = function(grabSuccessOps, grabFailOps) {

		grabSuccessOps = grabSuccessOps || function() {
			logActivity('Default CapturedMedia.grab: grabSuccessOps() being called ..');
			__this.notarise();
			};
		grabFailOps = grabFailOps || function() {
			logActivity('Default CapturedMedia.grab: grabFailOps() being called ..');
			};

		__this.type = 'image/jpeg';
		logPosition( function(loc) {
			__this.location = [loc.coords.latitude, loc.coords.longitude]; // FIXME: temporary, we actually will want to pass and use the whole loc object, like the next commented line: ..
			// __this.location = loc;
			navigator.camera.getPicture( function(path) {
				console.log('Stored in ' + path);
				// __this.description TODO

				// store filename in DB
				__this.stash(path, grabSuccessOps, grabFailOps);

				// upload to CDN

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
			__this.location = config.dummyLoc; // TODO: approximate from last position and tag as uncertain
			
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

	this.notarise = function(additionalProperties) {
		additionalProperties = additionalProperties || {};
		var standardProperties = {
			'type': __this.type,
			'name': __this.name,
			}; // TODO , __this.description);
		var properties = Object.assign({}, standardProperties, additionalProperties);
		// TODO: annotation popup

		if(sensibelStatus.state.tracking) {
			journey.track.addMedia(__this.location, properties);
		}
		else {
			// must add 'time' here if omitted, which is a bit repetitive (refactor?)
			if (!properties.hasOwnProperty('time')) {
				var timeStamp = new Date();
				properties.time = formatTimestamp(timeStamp, 'W3CDTF');
				};

			var geoJSON = turf.point(__this.location, properties);
			// TODO: annotation popup
			
			logActivity('TODO: we need to add this as floating media to Couch');
			console.log(JSON.stringify(geoJSON));
		}
	}

	this.beamup = function(){}; // TODO
	this.load = function(){}; // TODO

	this.init = function(){
		__this.record = __this.take = __this.capture = __this.grab = __this.snap;
		__this.send = __this.upload = __this.beamup;
		}();

}

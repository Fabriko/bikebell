// requires: cordova, File plugin, Camera plugin

function CapturedMedia() {

	var __this = this;

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
				stashFailOps();
			}
		};

	this.snap = function(grabSuccessOps, grabFailOps) {
		grabSuccessOps = grabSuccessOps || function() {
			logActivity('Default CapturedMedia.grab: grabSuccessOps() being called ..');
			};
		grabFailOps = grabFailOps || function() {
			logActivity('Default CapturedMedia.grab: grabFailOps() being called ..');
			};

		navigator.camera.getPicture( function(loc) {
			console.log('Stored in ' + loc);
			// make a directory
			
			// generate a UUID /
			// copy cached file /
			// store filename in DB
			// upload to CDN
			__this.stash(loc, grabSuccessOps, grabFailOps);

			},
			function() {
				console.log('camera failed or whatever FIXME');
				grabFailOps();
			},
			{
				// select from https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-camera/index.html#module_camera.CameraOptions
			});
	};

	this.beamup = function(){}; // TODO
	this.load = function(){}; // TODO

	this.init = function(){
		__this.record = __this.take = __this.capture = __this.grab = __this.snap;
		__this.send = __this.upload = __this.beamup;
		}();

}

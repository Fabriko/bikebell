// requires: cordova, File plugin, Camera plugin

function CapturedMedia() {

	var __this = this;

	this.stash = function(URI, directoryEntry, newName, successCallback, failCallback) {
		newName = newName || fileEntry.name;
		successCallback = successCallback || function() {
			logActivity('Success stashing image to ' + dir + '/' + fileName);
			};
		failCallback = failCallback || function() {
			logActivity('Failed stashing image to ' + dir + '/' + fileName);
			};
		window.resolveLocalFileSystemURL(URI, function(fileEntry) {
			console.log("got file: " + fileEntry.fullPath);
			fileEntry.moveTo(directoryEntry, newName, successCallback, failCallback);
			}, function() {
			// If don't get the FileEntry (which may happen when testing
			// on some emulators), copy to a new FileEntry.
			logActivity('Failed to resolve URI ' + URI + ' as fileEntry: ' + err + '(https://www.w3.org/TR/2011/WD-file-system-api-20110419/#idl-def-FileError)');
			if(failCallback) {
				failCallback();
			}
			});
		};

	this.snap = function(grabSuccessOps, grabFailOps) {
		grabSuccessOps = grabSuccessOps || function() {
			logActivity('CapturedMedia.grab: grabSuccessOps() being called ..');
			};

		navigator.camera.getPicture( function(loc) {
			console.log('Stored in ' + loc);
			// make a directory
			
			// generate a UUID /
			// copy cached file /
			// store filename in DB
			// upload to CDN

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
								__this.stash(loc, dir, fileName, grabSuccessOps);
							}, function(err) {
								logActivity('Failed creating or accessing media directory ' + dataDirectoryLocation + '/' + config.capturedMedia.LOCAL_DIRECTORY + ': ' + err + '(https://www.w3.org/TR/2011/WD-file-system-api-20110419/#idl-def-FileError)');
							});
					}, function() {
						logActivity('Failed to resolve media directory ' + dataDirectoryLocation + ': ' + err + '(https://www.w3.org/TR/2011/WD-file-system-api-20110419/#idl-def-FileError)');
					});
			}
			else {
				logActivity('cordova.file is not supported here, image stuck at ' + loc);
			}
			},
			function() {
				console.log('camera failed or whatever FIXME');
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

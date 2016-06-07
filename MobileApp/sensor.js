// JavaScript code for the blend Sensibell app.

// API docs: http://evothings.com/doc/raw/plugins/com.evothings.ble/com.evothings.module_ble.html

// this is pretty damn handy: http://evothings.com/arduino-ble-quick-walk-through/

function Sensor() {
	__this = this;

	this.init = function() {
		this['target'] = null;
		this['connectedDevice'] = null;
	}

	this.set = function() {

		do {
			this.target = getPairingTarget();
		}
		while (!this.target);

		logActivity('This is handset device ' + device.uuid + ' wanting to pair with ' + ( this.target ? this.target : '[unpaired]' )); // shouldn't need that last ternary while above do/while is in place
	}

	this.connectFromScratch = function(success) { // TODO: success param not implemented 
		if ( typeof(this.target) === undefined ) {  // TODO: test this predicate
			this.set();
		}

		if(config.useFauxConnection) {
			logActivity('(Fake) Connecting, certainly not to ' + this.target, 'notice');
			fauxConnected();
			/* // current thinking: this is neither a success or fail
				if (onSuccess) {
					onSuccess.call();
				}
			*/
		}
		else {
			console.log('connectFromScratch to ' + this.target);
			console.log('Scanning for ' + this.target);

			evothings.easyble.startScan(
				function(foundDevice) {
					// evothings.printObject(foundDevice);
					foundDevice.name = foundDevice.name || (foundDevice.advertisementData ? foundDevice.advertisementData.kCBAdvDataLocalName : null);
					if(foundDevice.hasName(__this.target)) {
						// evothings.printObject(foundDevice);
						logActivity('Target EasyBLE device FOUND: ' + foundDevice.name + ' with address ' + foundDevice.address, 'success');
						evothings.easyble.stopScan();
						__this.connect(foundDevice, function() {
							success.call();
							});
/*
						if (success) {
							success.call(foundDevice);
						}
*/
					}
					else {
						// evothings.printObject(deviceInfo);
						logActivity('Foreign device found: ' + deviceInfo.name + ' with address ' + deviceInfo.address, 'notice');
					}
				},
				function (error) {
					logActivity('BLE Scan error: ' + error, 'error');
					// failure(target); TODO
				}
			);
		}
	}

	this.connect = function(foundDevice, onSuccess, onFail) {
 		logActivity('Connecting to ' + foundDevice.name + ' ...');
		//TODO; we need a spinner or whatever here
		foundDevice.connect(
			function(connectedDevice) {
				__this.connectedDevice = connectedDevice;
				logActivity('CONNECTED to ' +  connectedDevice.name);
				sensibelStatus.add('BLE');
				onSuccess && onSuccess.call();
			},
			function(errorCode)	{
				statusMessage = ( errorCode == 'EASYBLE_ERROR_DISCONNECTED' ? 'Disconnected' : 'Not connected' );
				__this.connectedDevice = null;
				logActivity('Connect error with ' + foundDevice.name + ': ' + errorCode, 'error');
				sensibelStatus.remove('BLE');
				onFail && onFail.call();
			});
	}

	this.listen = function(success, fail) {
		logActivity('Listening to notifications for ' + this.target);
		// evothings.printObject(this.connectedDevice.advertisementData);

		// FIXME - I don't understand what goes on here
		this.connectedDevice.readServices(
			null, // null means read info for all services
			function(connectedDevice) {
				__this.addMethodsToDeviceObject(connectedDevice);
				success(connectedDevice);
			},
			function(errorCode)	{
				fail(errorCode);
			});
	}

	// The addMethodsToDeviceObject method is almost completely copied from code supplied by a colleague who is nameless until I ask permission to credit him (or her)
	// The comments are left intact. I don;t claim to understand it, but agree with the comment that it's weird!
	/**
	 * Add instance methods to the device object.
	 * @private
	 */
	this.addMethodsToDeviceObject = function(connectedDevice) {
		/**
		 * Object that holds info about a Sensibell device.
		 * @namespace evothings.sensibell.sensibellDevice
		 */

		/**
		 * @function setNotification
		 * @description Set a notification callback.
		 * @param {Uint8Array} uint8array - The data to be written.
		 * @memberof evothings.sensibell.sensibellDevice
		 * @instance
		 * @public
		 */
		connectedDevice.setNotification = function(callback) {
			// Debug logging.
			//console.log('setNotification');

			// Must write this descriptor value to enable enableNotification().
			// Yes, it's weird.
			// Without it, enableNotification() fails silently;
			// we never get the data we should be getting.
			connectedDevice.writeDescriptor(
				'91a6b702-bcb7-4c9b-c546-75aa0000c47e',
				'00002902-0000-1000-8000-00805f9b34fb',
				new Uint8Array([1,0]),
				function() {
					console.log('writeDescriptor success');
				},
				function(errorCode) {
					console.log('writeDescriptor error: ' + errorCode);
				});

			connectedDevice.enableNotification(
				'91a6b702-bcb7-4c9b-c546-75aa0000c47e',
				callback,
				function(errorCode) {
					console.log('enableNotification error: ' + errorCode);
				});
		};
	}

	this.disconnect = this.disconn = function() {
		if (config.useFauxConnection) {
			document.removeEventListener('volumeupbutton', buttonGood);
			document.removeEventListener('volumedownbutton', buttonBad);
			logActivity('Closing fake connection');
			logActivity('DISCONNECTED in a fake way.', 'notice');
		}
		else {
			// TODO: some check of the target device being disconnected
			logActivity('Closing connection to ' + this.target + ' (FIXME: without checking)');
			this.connectedDevice.close();
			logActivity('DISCONNECTED from ' + this.target, 'notice');
		}

		sensibelStatus.remove('BLE');
	}

	this.init();

}


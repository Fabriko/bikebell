// JavaScript code for the blend Sensibell app.

// API docs: http://evothings.com/doc/raw/plugins/com.evothings.ble/com.evothings.module_ble.html

// this is pretty damn handy: http://evothings.com/arduino-ble-quick-walk-through/

function Sensor() {

	this.init = function() {
		this['target'] = null;
		this['connectee'] = null; // FIXME - legacy, kill kill eventually kill
	}

	this.set = function() {

		displayStatus('Not connected', 'warning');

		do {
			this.target = getPairingTarget();
		}
		while (!this.target);

		logActivity('This is handset device ' + device.uuid + ' wanting to pair with ' + ( this.target ? this.target : '[unpaired]' )); // shouldn't need that last ternary while above do/while is in place
	}

	this.scan = function(success/*, failure*/) {
		SENSOR = SENSOR || this.setSensor(); // FIXME: I'm not sure this works (assign properly to SENSOR) if there's no value
		console.log(SENSOR.target);
		evothings.easyble.stopScan();
		evothings.easyble.reportDeviceOnce(true);
		evothings.easyble.startScan(
			function(deviceInfo) {
				// evothings.printObject(deviceInfo);
				if(deviceInfo.hasName(SENSOR.target)) {
					// evothings.printObject(deviceInfo);
					deviceInfo.name = SENSOR.target; // seems .name is not reliably set on scan, even though .hasName() works
					logActivity('Target EasyBLE device FOUND: ' + deviceInfo.name + ' - ' + deviceInfo.address, 'success');
					evothings.easyble.stopScan();
					if (success) {
						success.call(SENSOR.target);
					}
				}
				else {
					// evothings.printObject(deviceInfo);
					deviceInfo.name = (
						deviceInfo.name ? 
						deviceInfo.name :
						(deviceInfo.advertisementData ? deviceInfo.advertisementData.kCBAdvDataLocalName : null)
						);
					logActivity('Foreign device found: ' + deviceInfo.name + ' with address ' + deviceInfo.address, 'notice');
				}
			},
			function (error) {
				logActivity('BLE Scan error: ' + error, 'error');
				// failure(target); TODO
			}
		);
	}

	this.conn = function(target, onSuccess, onFail) {
		logActivity('Connecting to ... ' + target);
		//TODO; we need a spinner or whatever here
		evothings.arduinoble.connect(
			target,
			function(connectedDevice) {
				app.connectee = connectedDevice;
				logActivity('CONNECTED to ' +  target);
				displayStatus('Connected', 'success');
				adaptiveButton('start');
				onSuccess && onSuccess.call();
			},
			function(errorCode)	{
				statusMessage = ( errorCode == 'EASYBLE_ERROR_DISCONNECTED' ? 'Disconnected' : 'Not connected' );
				app.connectee = null;
				logActivity('Connect error with ' + target + ': ' + errorCode, 'error');
				displayStatus(statusMessage, 'warning');
				adaptiveButton('connect');
				onFail && onFail.call();
			});
	}

	this.connectFromScratch = function(success) {
		SENSOR = SENSOR || this.setSensor(); // FIXME: I'm not sure this works (assign properly to SENSOR) if there's no value

		if(config.useFauxConnection) {
			logActivity('(Fake) Connecting, certainly not to ' + SENSOR.target, 'notice');
			app.connectee = null;
			fauxConnected();
			/* // current thinking: this is neither a success or fail
				if (onSuccess) {
					onSuccess.call();
				}
			*/
		}
		else {
			console.log('connectFromScratch to ' + SENSOR.target);

			this.scan(
				function(target) { //FIXME; param necessary?
					console.log('Target for scan was ' + SENSOR.target);
					console.log('Success callback is ' + ( typeof(success) == 'function' ? 'set' : 'not set') );
					SENSOR.conn(SENSOR.target, success);
				});
		}
	}

	this.listen = function(callbacks) {
		logActivity('Listening to notifications for ' + app.connectee.name);
		evothings.printObject(app.connectee.advertisementData);

		// Turn notifications on.
		// FIXME - I don't understand what goes on here
		app.connectee.writeDescriptor(
			'713d0002-503e-4c75-ba94-3148f18d941e',
			'00002902-0000-1000-8000-00805f9b34fb',
			new Uint8Array([1,0]),
			function() {
				console.log('writeDescriptor: 00002902-0000-1000-8000-00805f9b34fb success.');
			},
			function(errorCode) {
				console.log('writeDescriptor: 00002902-0000-1000-8000-00805f9b34fb error: ' + errorCode);
			}
		);

		app.connectee.enableNotification(
			'713d0002-503e-4c75-ba94-3148f18d941e', // i.e. Read
			function(data) {
				input = evothings.ble.fromUtf8(data);
				logActivity('READ data from ' + app.connectee.name + ': ' + input);

				if (input.length > 4) { // FIXME: truncating input data because sometimes it buffers
					input = input.trim().substr(0,4);
					logActivity('Truncated input data to ' + input, 'information');
				}

				// FIXME: - use mapping of values to callbacks passed in instead, like callbacks[input].call()
				buttonDispatcher(input);
			},
			function(errorCode)	{
				logActivity('BLE enableNotification error: ' + errorCode);
			});
	}

	this.disconn = function(nextButton, statusMessage) {
		nextButton = nextButton || 'connect';
		statusMessage = statusMessage || 'Disconnected';
		if (config.useFauxConnection) {
			document.removeEventListener('volumeupbutton', buttonGood);
			document.removeEventListener('volumedownbutton', buttonBad);
			logActivity('Closing fake connection');
			logActivity('DISCONNECTED in a fake way.', 'notice');
		}
		else {
			// TODO: some check of the target device being disconnected
			// displayStatus('Disconnecting');
			logActivity('Closing connection to ' + app.connectee.name + ' (FIXME: without checking)');
			evothings.arduinoble.close();
			logActivity('DISCONNECTED from ' + app.connectee.name, 'notice');
		}
			displayStatus(statusMessage, 'warning');
			adaptiveButton(nextButton);
	}

	this.init();

}


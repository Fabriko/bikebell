function resetBLE(callback) {
	logActivity('Resetting of bluetooth ..');
	evothings.ble.reset(
		callback.call(),
		function() {
			logActivity('resetfail', 'error');
		}
	);
}

/* ********************* */
// temporary functions for diagnosing device/connection problems

function basicScan(target) {
	evothings.easyble.stopScan();
	evothings.easyble.reportDeviceOnce(true);
	evothings.easyble.startScan(
		function(deviceInfo) {
			// evothings.printObject(deviceInfo);
			if(deviceInfo.hasName(target)) {
				logActivity('Target EasyBLE device FOUND: ' + deviceInfo.name + ' - ' + deviceInfo.address);
				evothings.easyble.stopScan();
				console.log('found a match for ' + target + ', run callback now if you like');
			}
			else {
				logActivity('Foreign device found: ' + deviceInfo.name + ' with address ' + deviceInfo.address);
			}
			/*
			if (!app.knownDevices[deviceInfo.address]) {
				app.knownDevices[deviceInfo.address] = deviceInfo;
			}
			evothings.printObject(app.knownDevices);
			*/
		},
		function (error) {
			logActivity('BLE Scan error: ' + error);
		}
	);
}

function basicConnect(target) {
	//displayStatus('Connecting');
	logActivity('Connecting to ... ' + target);
	evothings.arduinoble.connect(
		target,
		function(connectedDevice) {
			logActivity('CONNECTED to ' +  target);
			// displayStatus('Connected');
			app.connectee = connectedDevice;
			// evothings.printObject(app.connectee);
			// app.deviceHandle = connectInfo.deviceHandle;
			// app.getServices(connectInfo.deviceHandle);
				// app.on();
		},
		function(errorCode)	{
			logActivity('Connect error with ' + target + ': ' + errorCode);
			// displayStatus('Not connected');
			// app.connectee = null;
		});
	
}

function basicDisconnect(target) {
	// TODO: some check of the target device being connected
	// displayStatus('Disconnecting');
	logActivity('Closing connection to ' + target + ' (FIXME: without checking)');
	evothings.arduinoble.close();
	logActivity('DISCONNECTED from ' + target);
	// displayStatus('Disconnected');
}

// works but unstable, reconnects
function basicRead(target) {
	logActivity('Listening to notifications for ' + target);
	evothings.printObject(app.connectee.advertisementData);

		// Turn notifications on.
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
			logActivity('READ this data: ' + evothings.ble.fromUtf8(data));
		},
		function(errorCode)	{
			logActivity('BLE enableNotification error: ' + errorCode);
		});
}

function basicWrite(signalFIXME) { // TODO: total STUB and stab
	logActivity('Gonna send signal ' + signalFIXME);
	app.connectee.writeDataArray(new Uint8Array([1])); //FIXME
	logActivity('Signal sent (?)');
}

// JavaScript code for the blend Sensibell app.

// API docs: http://evothings.com/doc/raw/plugins/com.evothings.ble/com.evothings.module_ble.html

// this is pretty damn handy: http://evothings.com/arduino-ble-quick-walk-through/

/**
 * The BLE plugin is loaded asynchronously so the ble
 * variable is set in the onDeviceReady handler.
 */
var ble = null;

var app = {
	// Discovered devices.
	knownDevices: {},

	// Reference to the device we are connecting to.
	connectee: null,

	// Handle to the connected device.
	deviceHandle: null,

	// Handles to characteristics and descriptor for reading and
	// writing data from/to the Arduino using the BLE shield.
	characteristicRead: null,
	characteristicWrite: null,
	descriptorNotification: null,

	// Data that is plotted on the canvas.
	dataPoints: [],

	initialize: function()
	{
		// document.addEventListener('deviceready', app.onDeviceReady, false);
		logActivity('Initialising Blend ..');
		ble = evothings.ble;
//		app.onDeviceReady();
		logActivity('.. Blend set.');
	},

	// Called when device plugin functions are ready for use.
	onDeviceReady: function()
	{
		ble = evothings.ble; // Evothings BLE plugin

		// app.startScan();
	},

	startScan: function() {
		evothings.ble.stopScan();
		logActivity('Scanning for blends .. really want ' + app.target);
		evothings.ble.startScan(
			function(deviceInfo) {
				if (app.knownDevices[deviceInfo.address]) {
					console.log('Known device ' + deviceInfo.name);
				}
				else {
					logActivity('Detected device: ' + deviceInfo.name);
					app.knownDevices[deviceInfo.address] = deviceInfo;
				}
				if (deviceInfo.name == app.target && !app.connectee) { // FIXME: check the !app.connectee predicate is actually delivering what we want
					logActivity('Found target ' + app.target);
					// app.connectee = deviceInfo;
					app.connect(deviceInfo);
				}
				evothings.ble.stopScan();
			},
			function(errorCode) {
				console.log('startScan error: ' + errorCode);
				evothings.ble.stopScan();
			}
		);
	},

	scan: function(success/*, failure*/) {
		SENSOR = SENSOR || this.setSensor(); // FIXME: I'm not sure this works (assign properly to SENSOR) if there's no value
console.log(SENSOR.target);
		evothings.easyble.stopScan();
		evothings.easyble.reportDeviceOnce(true);
		evothings.easyble.startScan(
			function(deviceInfo) {
				// evothings.printObject(deviceInfo);
				if(deviceInfo.hasName(SENSOR.target)) {
// evothings.printObject(deviceInfo);
deviceInfo.name = SENSOR.target;
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
				/*
				if (!app.knownDevices[deviceInfo.address]) {
					app.knownDevices[deviceInfo.address] = deviceInfo;
				}
				evothings.printObject(app.knownDevices);
				*/
			},
			function (error) {
				logActivity('BLE Scan error: ' + error, 'error');
				// failure(target); TODO
			}
		);
	},

	conn: function(target, onSuccess, onFail) {
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
	},

	connectFromScratch: function(success) {
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
	},

	setSensor: function() {
		displayStatus('Not connected', 'warning');
		do {
			SENSOR.target = getPairingTarget();
		}
		while (!SENSOR.target);

		logActivity('This is handset device ' + device.uuid + ' wanting to pair with ' + ( SENSOR.target ? SENSOR.target : '[unpaired]' )); // shouldn't need that last ternary while above do/while is in place

		logActivity('Setting Blend ..');

		ble = evothings.ble; // FIXME: this does SFA, amiright?

		logActivity('.. Blend SET.');
	},

	listen: function(callbacks) {
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
	},

	connect: function(deviceInfo) {
		var stateMsgMap = {
			0: 'Disconnected',
			1: 'Connecting',
			2: 'Connected',
			3: 'Disconnecting'
		};
		evothings.ble.stopScan();
		logActivity('Connecting to ...' + deviceInfo.name);
		evothings.ble.connect(
			deviceInfo.address,
			function(connectInfo) {
				displayStatus(stateMsgMap[connectInfo.state]);
				if (connectInfo.state == 2) { // Connected
					logActivity('Connected to ' +  deviceInfo.name);
					app.connectee = deviceInfo;
					app.deviceHandle = connectInfo.deviceHandle;
					app.getServices(connectInfo.deviceHandle);
					// app.on();
				}
				if (connectInfo.state == 0) { // Disconnected
					logActivity('Disconnected from ' +  deviceInfo.name);
					app.connectee = null;
				}
			},
			function(errorCode)	{
				console.log('Connect error with ' + deviceInfo.name + ': ' + errorCode);
				displayStatus(stateMsgMap[0]);
				app.connectee = null;
			});
	},
	
	disconn: function(nextButton, statusMessage) {
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
	},

	disconnect: function(handle) {
		evothings.ble.close(handle);
		app.connectee = null;
		app.knownDevices = {};
	},

	on: function() {
		logActivity('LED on requested');
		app.write(
			'writeCharacteristic',
			app.deviceHandle,
			app.characteristicWrite,
			new Uint8Array([1])); // 1 = on
	},

	off: function()	{
		logActivity('LED off requested');
		app.write(
			'writeCharacteristic',
			app.deviceHandle,
			app.characteristicWrite,
			new Uint8Array([0])); // 0 = off
	},

	write: function(writeFunc, deviceHandle, handle, value)	{
		if (handle)	{
			ble[writeFunc](
				deviceHandle,
				handle,
				value,
				function() {
					console.log(writeFunc + ': ' + handle + ' success.');
				},
				function(errorCode) {
					console.log(writeFunc + ': ' + handle + ' error: ' + errorCode);
				}
			);
		}
	},

	startReading: function(deviceHandle) {
		console.log('Enabling notifications');

		// Turn notifications on.
		app.write(
			'writeDescriptor',
			deviceHandle,
			app.descriptorNotification,
			new Uint8Array([1,0])
		);

		// Start reading notifications.
		evothings.ble.enableNotification(
			deviceHandle,
			app.characteristicRead,
			function(data) {
				val = String.fromCharCode(
					[new DataView(data,2).getUint8(0, true)],
					[new DataView(data,3).getUint8(0, true)]
				);
				console.log('Read:' + String.fromCharCode(
					[new DataView(data,0).getUint8(0, true)],
					[new DataView(data,1).getUint8(0, true)],
					[new DataView(data,2).getUint8(0, true)],
					[new DataView(data,3).getUint8(0, true)]
				));
				
				// flash a LED - doesn't seem to work with current firmware
				/*
				if ( parseInt(val) ) {
					if ( parseInt(val) == 1 ) {
						app.on();
					}
					else if ( parseInt(val) == 2 ) {
						app.off();
					}
				}
				*/
				

					logPosition(val, function(loc) {
						console.log('tryog ' + loc.toString());
						L.circleMarker(L.latLng(loc.coords.latitude, loc.coords.longitude),{color:(val=='01'?'green':'red')}).addTo(map);
						if (journey) {
							journey.addData('button', val, [loc.coords.longitude, loc.coords.latitude] );
						}
					});
			},
			function(errorCode) {
				console.log('enableNotification error: ' + errorCode);
			}
		);
	},

	getServices: function(deviceHandle)	{
		console.log('Scanning for services...');
		evothings.ble.readAllServiceData(deviceHandle, function(services) {
			// Find handles for characteristics and descriptor needed.
			for (var si in services) {
				var service = services[si];
				for (var ci in service.characteristics) {
					var characteristic = service.characteristics[ci];

					if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e') {
						app.characteristicRead = characteristic.handle;
					}
					else if (characteristic.uuid == '713d0003-503e-4c75-ba94-3148f18d941e') {
						app.characteristicWrite = characteristic.handle;
					}

					for (var di in characteristic.descriptors) {
						var descriptor = characteristic.descriptors[di];

						if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e' &&
							descriptor.uuid == '00002902-0000-1000-8000-00805f9b34fb') {
							app.descriptorNotification = descriptor.handle;
						}
					}
				}
			}

			if (app.characteristicRead && app.characteristicWrite && app.descriptorNotification) {
				console.log('RX/TX services found.');
				app.startReading(deviceHandle);
			}
			else {
				console.log('ERROR: RX/TX services not found!');
			}
		},
		function(errorCode) {
			console.log('readAllServiceData error: ' + errorCode);
		});
	},

};
// End of app object.

// Initialise app.
// app.initialize();

blend = app; // FIXME

/* ********************* */
// temporary functions for diagnosing connection problems

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

/*
	app.connectee.writeCharacteristic(
		'713d0003-503e-4c75-ba94-3148f18d941e',
		new Uint8Array([1]),
		function() {
			console.log('BLE characteristic written.');
		},
		function(errorCode) {
			console.log('BLE writeDescriptor error: ' + errorCode);
		});
*/
}

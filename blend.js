// JavaScript code for the blend Sensibell app.

// API docs: http://evothings.com/doc/raw/plugins/com.evothings.ble/com.evothings.module_ble.html

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
		logActivity('initialising in harmony with blend');
		app.onDeviceReady();
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
					console.log('known device ' + deviceInfo.name);
				}
				else {
					logActivity('Detected device/s: ' + deviceInfo.name);
					app.knownDevices[deviceInfo.address] = deviceInfo;
					if (deviceInfo.name == app.target && !app.connectee) {
						logActivity('Found target ' + app.target);
						app.connectee = deviceInfo;
						app.connect(deviceInfo.address);
					}
				}
				evothings.ble.stopScan();
			},
			function(errorCode) {
				console.log('startScan error: ' + errorCode);
				evothings.ble.stopScan();
			}
		);
	},

	connect: function(address) {
		evothings.ble.stopScan();
		logActivity('Connecting to ...' + app.connectee.name);
		evothings.ble.connect(
			address,
			function(connectInfo) {
				if (connectInfo.state == 2) { // Connected
					logActivity('Connected to ' +  app.connectee.name);
					app.deviceHandle = connectInfo.deviceHandle;
					app.getServices(connectInfo.deviceHandle);
				}
			},
			function(errorCode)	{
				console.log('Connect error with ' + app.connectee.name + ':' + errorCode);
			});
	},
	
	disconnect: function(handle) {
		evothings.ble.close(handle);
		app.connectee = null;
		app.knownDevices = {};
	},

	// FIXME: don't think these (on.off) get fired ever
	on: function()
	{
		logActivity('LED on requested');
		app.write(
			'writeCharacteristic',
			app.deviceHandle,
			app.characteristicWrite,
			new Uint8Array([1])); // 1 = on
	},

	off: function()
	{
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
				if (journey) {
					journey.addData('button', val, true); //FIXME: not hardcoding reading here, use data0
					logPosition(val);
				}
			},
			function(errorCode) {
				console.log('enableNotification error: ' + errorCode);
			}
		);
	},


	getServices: function(deviceHandle)
	{
		console.log('Scanning for services...');

		evothings.ble.readAllServiceData(deviceHandle, function(services)
		{
			// Find handles for characteristics and descriptor needed.
			for (var si in services)
			{
				var service = services[si];

				for (var ci in service.characteristics)
				{
					var characteristic = service.characteristics[ci];

					if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e')
					{
						app.characteristicRead = characteristic.handle;
					}
					else if (characteristic.uuid == '713d0003-503e-4c75-ba94-3148f18d941e')
					{
						app.characteristicWrite = characteristic.handle;
					}

					for (var di in characteristic.descriptors)
					{
						var descriptor = characteristic.descriptors[di];

						if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e' &&
							descriptor.uuid == '00002902-0000-1000-8000-00805f9b34fb')
						{
							app.descriptorNotification = descriptor.handle;
						}
					}
				}
			}

			if (app.characteristicRead && app.characteristicWrite && app.descriptorNotification)
			{
				console.log('RX/TX services found.');
				app.startReading(deviceHandle);
			}
			else
			{
				console.log('ERROR: RX/TX services not found!');
			}
		},
		function(errorCode)
		{
			console.log('readAllServiceData error: ' + errorCode);
		});
	},

};
// End of app object.

// Initialise app.
// app.initialize();

blend = app; // FIXME

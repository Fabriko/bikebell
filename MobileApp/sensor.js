var knownDevices = {};

knownDevices['Sensibel'] = {}; // TODO: stub

knownDevices['iBeacon'] = {
//	'name'    : 'MyTag',
	'services': {
		's1': {
			'uuid'           : '00001800-0000-1000-8000-00805f9b34fb',
			'characteristics': {
				'c6': {
					'uuid'      : '00002a00-0000-1000-8000-00805f9b34fb',
					'properties': evothings.easyble.PROPERTY_READ,
					'writeType' : evothings.easyble.WRITE_TYPE_DEFAULT,
					},
				'c7': {
					'uuid'      : '00002a01-0000-1000-8000-00805f9b34fb',
					'properties': evothings.easyble.PROPERTY_READ,
					'writeType' : evothings.easyble.WRITE_TYPE_DEFAULT,
					},
				'c8': {
					'uuid'      : '00002a04-0000-1000-8000-00805f9b34fb',
					'properties': evothings.easyble.PROPERTY_READ,
					'writeType' : evothings.easyble.WRITE_TYPE_DEFAULT,
					},
				},
			},
		// NB missing s2 for now TODO
		's4': {
			'uuid'           : '0000fff0-0000-1000-8000-00805f9b34fb',
			'characteristics': {
				'c18': {
					'uuid'       : '0000fff1-0000-1000-8000-00805f9b34fb',
					'properties' : evothings.easyble.PROPERTY_READ,
					'writeType'  : evothings.easyble.WRITE_TYPE_DEFAULT,
					'descriptors': {
						'd21': {
							'uuid': '00002902-0000-1000-8000-00805f9b34fb',
							},
						},
					},
				'c7': {
					'uuid'      : '00002a01-0000-1000-8000-00805f9b34fb',
					'properties': evothings.easyble.PROPERTY_READ,
					'writeType' : evothings.easyble.WRITE_TYPE_DEFAULT,
					},
				'c8': {
					'uuid'      : '00002a04-0000-1000-8000-00805f9b34fb',
					'properties': evothings.easyble.PROPERTY_READ,
					'writeType' : evothings.easyble.WRITE_TYPE_DEFAULT,
					},
				},
			},
		},
	};

function Sensor() {
	var __this = this;

	// var init = function() {
		this['target'] = null;
		this['connectedDevice'] = null;
		this['services'] = null;
		this['deviceClass'] = bluetoothle;
	// };

	logActivity('Gonna test if bluetoothle exists');
	if (bluetoothle) {
		logActivity('Yup');
	}
	else {
		logActivity('Nope');
	}

	this.set = function() {

		do {
			this.target = getPairingTarget();
		}
		while (!this.target);

		logActivity('This is handset device ' + device.uuid + ' wanting to pair with ' + ( this.target ? this.target : '[unpaired]' ) + ( isFakingConnection() ? ' [FAKED]' : '' ) ); // shouldn't need that last ternary while above do/while is in place

	};

	this.connectFromScratch = function(onConnectSuccess, onConnectFail) {

logActivity('connectFromScratch()');

		if ( typeof(this.target) === undefined ) {  // TODO: test this predicate
			this.set();
		}

		if(isFakingConnection()) {
			logActivity('(Fake) Connecting, certainly not to ' + this.target, 'notice');
			fauxConnected();
			/* // current thinking: this is neither a success or fail
				if (onSuccess) {
					onSuccess.call();
				}
			*/
		}
		else {
			console.log('connectFromScratch to ' + __this.target);


			logActivity('We want to initialiZe ..');
			new Promise(function (resolve) {
				bluetoothle.initialize(resolve, { request: true, statusReceiver: false });
				})
				.then(function(result) {
					logActivity(JSON.stringify(result));
					if (result.status == 'enabled') {
						logActivity('Enabled yo');

						// TODO: put this within a timeout
						logActivity('Scanning for ' + __this.target);

						bluetoothle.startScan(function(foundDevice) {
							logActivity('We got ' + JSON.stringify(foundDevice));


							if(foundDevice.name == __this.target) {
								logActivity('Target bluetoothle device FOUND: ' + foundDevice.name + ' with address ' + foundDevice.address, 'success');

								bluetoothle.stopScan(function() {
									logActivity('Scan stopped good');

									bluetoothle.connect(function(result) {
										logActivity('Connect success!');
										onConnectSuccess && onConnectSuccess.call(__this, foundDevice);
										}, function(err) {
										logActivity('Connect fail!' + JSON.stringify(err));
										}, { address: foundDevice.address });

									}, function(err) {
									logActivity('Scan stopping failed!');
									});



							}


							}, function(err) {
							logActivity('Scan error ' + JSON.stringify(err));
							}, { 'services': [] });

					}
					else {
						logActivity('Enabled NO');
						onConnectFail && onConnectFail.call();
					}
					}, function(err) {
					logActivity(JSON.stringify(err));
					onConnectFail && onConnectFail.call();
					});


		}
	};


	this.listen = function(device_id, service_uuid, characteristic_uuid) {


logActivity('Discover ' + device_id + '!');
bluetoothle.discover(function(result) {
	logActivity('Discover success ' + JSON.stringify(result));
	}, function(err) {
	logActivity('Discover fail ' + JSON.stringify(err));
	}, { address: device_id });

/*
		logActivity('Gonna start listening goo');


		ble.startNotification(device_id, service_uuid, characteristic_uuid, function(buffer) {
			// Decode the ArrayBuffer into a typed Array based on the data you expect
			var data = new Uint8Array(buffer)[0];
			logActivity("Button state changed to " + data[0]);
//			buttonDispatcher(input);
			}, function(err) {
				logActivity('Failed to notify changed state.');
				logActivity(JSON.stringify(err));
				}
			);
*/

	};

	this.disconnect = this.disconn = function() { // TODO: not ported yet to ble
		if (isFakingConnection()) {
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
	};

	// init();

}


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
		this['deviceClass'] = ble;
	// };

	logActivity('Gonna test if ble exists');
	if (ble) {
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
			logActivity('Scanning for ' + __this.target);

			// TODO: test bluetooth on and go to settings if not

logActivity(JSON.stringify(ble));

			ble.stopScan(
				function() {

					logActivity('Starting scan .. ');
					ble.startScanWithOptions([], {'reportDuplicates': true}, function(foundDevice) {
						logActivity('Device: ' + JSON.stringify(foundDevice));

						if(foundDevice.name == __this.target) {
							logActivity('Target BLE central device FOUND: ' + foundDevice.name + ' with id ' + foundDevice.id, 'success');

		/*
							ble.connect(foundDevice.id,
								function(per) { logActivity("Connect success"); logActivity(JSON.stringify(per));},
								function(per) { logActivity("Connect fail"); logActivity(JSON.stringify(per)); }
								);
		*/
							onConnectSuccess && onConnectSuccess.call(__this, foundDevice);


						}


					},
					function() {
						logActivity("startScan failed");
						onConnectFail && onConnectFail.call();
						}
						);



					},
				function() {
					logActivity("stopScan failed");
					onConnectFail && onConnectFail.call();
					}
				);
		}
	};


	this.listen = function(device_id, service_uuid, characteristic_uuid) {


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


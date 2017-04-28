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

			ble.stopScan();
			ble.startScan(
				[], // TODO - filter better
				function(foundDevice) {





					console.log('a goody?');
					// logActivity(JSON.stringify(foundDevice));
logActivity(foundDevice.address);
					foundDevice.name = foundDevice.name || (foundDevice.advertising ? foundDevice.advertising.name : null);
					console.log(foundDevice.name + ' == ' + __this.target);
					if(foundDevice.address == 'E4:7E:40:CC:C0:E2') {
						// evothings.printObject(foundDevice);
						logActivity('Target BLE central device FOUND: ' + foundDevice.name); // + ' with address ' + foundDevice.address, 'success');

//						ble.connect('E4:7E:40:CC:C0:E2', function() { // __this.target
								__this.connectedDevice = foundDevice;

								logActivity('CONNECTED to ' +  __this.connectedDevice.address);
								sensibelStatus.add('BLE');


						ble.stopScan();

								onConnectSuccess && onConnectSuccess.call();
								
								
/*								
								
								
							}, function(errorCode) {
								logActivity('Failed in connection to ' + __this.target);




                               statusMessage = ( errorCode == 'EASYBLE_ERROR_DISCONNECTED' ? 'Disconnected' : 'Not connected' );
                               __this.connectedDevice = null;
                               logActivity('Connect error with ' + foundDevice.name + ': ' + errorCode, 'error');
                               sensibelStatus.remove('BLE');
                               onConnectFail && onConnectFail.call();



							});


*/
							
							
							

	/*
						if (success) {
							success.call(foundDevice);
						}
	*/
					}
					else {
						// evothings.printObject(deviceInfo);
						logActivity('Foreign device found: ' + foundDevice.name); // + ' with address ' + foundDevice.address, 'notice');
					}
// deviceObject.stopScan();
				},
				function (error) {
					logActivity('BLE CEntral Scan error: ' + error, 'error');



                               onConnectFail && onConnectFail.call();
					
					
					
					// failure(target); TODO
				}
			);
		}
	};
	
	
	this.listen = function( service_uuid, characteristic_uuid) {


logActivity('Gonna start listening goo');




		ble.startNotification('E4:7E:40:CC:C0:E2', service_uuid, characteristic_uuid, function(buffer) {
			// Decode the ArrayBuffer into a typed Array based on the data you expect
			var data = new Uint8Array(buffer)[0];
			console.log('Pressed: ' + input);
			alert("Button state changed to " + data[0]);
			buttonDispatcher(input);
		}, function() {
			logActivity('Failed to notify changed state.');
		});

		
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


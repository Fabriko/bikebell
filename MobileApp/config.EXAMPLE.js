var config = {
	// TODO: sensor: blend
	
	AWS_S3: {
		credentials: {},
		bucket: 'yer.bucket.name'
	},
	
	IDPairingsHack: {
		'<device1-id>': '<sensor1-name>',
		'<device2-id>': '<sensor2-name>'
	},

	// FIXME: not loading when needed, use gloabl geoOptions at top of sensibell.js for time being
	geoOptions: {
		timeout: 15000,
		// maximumAge: 60000,
		enableHighAccuracy: true
	},
	
	enableButtonsWithoutGPS: false

}

var dummyLoc = [51.505, -0.09];

var dummyGeoJSON = {};

// OR ..
var gJreq = $.getScript('http://leafletjs.com/examples/sample-geojson.js');

gJreq.done( function (msg) {
	console.log(msg);
	dummyGeoJSON = freeBus;
	}
);

gJreq.fail( function (xhr,failText) {
	console.log('Error getting dummy/sample geoJSON: ' + xhr.status);
	}
);

dummyTrail = {
    "name": "foo",
    "version": 'vDummyTrail',
    "trail": [{
        "reading": "position",
        "stamp": "2015-09-12T19:47:15.123Z",
        "value": [51.505, -0.09],
        "position": [51.505, -0.09]
    }, {
        "reading": "button",
        "stamp": "2015-09-12T19:48:15.456Z",
        "value": '02',
        "position": [51.505, -0.12]
    }, {
        "reading": "position",
        "stamp": "2015-09-12T19:49:15.789Z",
        "value": [51.505, -0.15],
        "position": [51.505, -0.15]
    }]
};

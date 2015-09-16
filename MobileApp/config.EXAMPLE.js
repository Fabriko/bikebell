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
	}

}

// var dummyLoc = [];

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


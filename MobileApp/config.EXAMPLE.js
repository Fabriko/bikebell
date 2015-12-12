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

	geoOptions: {
		timeout: 15000,
		// maximumAge: 60000,
		enableHighAccuracy: true,
	},
	
	geoPositionOptionOverrides: {
		// NB: use geoPositionOptions defined below, generally not this property directly
		// this setting will override geoOptions for positioning calls like getCurrentPosition()
		timeout: 1000, // we want a faster timeout for one-off position calls, as opposed to calls establishing a fix
	},

	enableButtonsWithoutGPS: false,
	useFauxConnection: false,

	layer: {

		osm: {
			tiles: L.tileLayer(
				'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
					attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
				}),
		},

		CartoDB_DarkMatter: {
			tiles: L.tileLayer(
				'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
					attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="http://cartodb.com/attributions">CartoDB</a>',
					maxZoom: 19,
				}),
		},

		Thunderforest_OpenCycleMap: {
			tiles: L.tileLayer(
				'http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png', {
					attribution: '© <a href="http://www.opencyclemap.org">OpenCycleMap</a>, © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
				}),
		},
		
	},
	
	provider: {
		mapbox: {
			token: 'MY MAPBOX EXAMPLE KEY',
		},
	},

	rendering: {
		'track-canvas': {
			layers: ['Thunderforest_OpenCycleMap'],
				
		},
		'dash-canvas': {
			layers: ['CartoDB_DarkMatter'],
		},
	},
	
}

// merge geoPositionOptionOverrides into geoOptions to get geoPositionOptions
config.geoPositionOptions = Object.assign({}, config.geoOptions, config.geoPositionOptionOverrides);

var locationPinIcon = 'data:image/svg+xml;charset=US-ASCII,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22iso-8859-1%22%3F%3E%3C!DOCTYPE%20svg%20PUBLIC%20%22-%2F%2FW3C%2F%2FDTD%20SVG%201.1%2F%2FEN%22%20%22http%3A%2F%2Fwww.w3.org%2FGraphics%2FSVG%2F1.1%2FDTD%2Fsvg11.dtd%22%3E%3Csvg%20version%3D%221.1%22%20id%3D%22Layer_1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20x%3D%220px%22%20y%3D%220px%22%20%20width%3D%2214px%22%20height%3D%2214px%22%20viewBox%3D%220%200%2014%2014%22%20style%3D%22enable-background%3Anew%200%200%2014%2014%3B%22%20xml%3Aspace%3D%22preserve%22%3E%3Cpath%20fill%3D%22%23F0F%22%20d%3D%22M8.851%2C10.101c-0.18-0.399-0.2-0.763-0.153-1.104C9.383%2C8.49%2C9.738%2C7.621%2C9.891%2C6.465C10.493%2C6.355%2C10.5%2C5.967%2C10.5%2C5.5%20c0-0.437-0.008-0.804-0.502-0.94C9.999%2C4.539%2C10%2C4.521%2C10%2C4.5c0-2.103-1-4-2-4C8%2C0.5%2C7.5%2C0%2C6.5%2C0C5%2C0%2C4%2C1.877%2C4%2C4.5%20c0%2C0.021%2C0.001%2C0.039%2C0.002%2C0.06C3.508%2C4.696%2C3.5%2C5.063%2C3.5%2C5.5c0%2C0.467%2C0.007%2C0.855%2C0.609%2C0.965%20C4.262%2C7.621%2C4.617%2C8.49%2C5.303%2C8.997c0.047%2C0.341%2C0.026%2C0.704-0.153%2C1.104C1.503%2C10.503%2C0%2C12%2C0%2C12v2h14v-2%20C14%2C12%2C12.497%2C10.503%2C8.851%2C10.101z%22%2F%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3Cg%3E%3C%2Fg%3E%3C%2Fsvg%3E';

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

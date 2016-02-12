function GPXData(contents) {
	this['dom'] = (new DOMParser).parseFromString(contents, 'application/xml');
	
	nodes = this.dom.querySelectorAll('trkpt[lat]');
	if (nodes) {
		this['startpoint'] = L.latLng(
			parseFloat(nodes[0].getAttribute('lat')),
			parseFloat(nodes[0].getAttribute('lon'))
		);
		this['endpoint'] = L.latLng(
			parseFloat(nodes[nodes.length - 1].getAttribute('lat')),
			parseFloat(nodes[nodes.length - 1].getAttribute('lon'))
		);
		this['started'] = new Date(Date.parse(nodes[0].querySelector('time').textContent));
		this['ended'] = new Date(Date.parse(nodes[nodes.length - 1].querySelector('time').textContent));
	}

	if ( boundsmeta = this.dom.querySelector('gpx > metadata > bounds') ) {
		minlat = parseFloat(boundsmeta.getAttribute('minlat'));
		minlon = parseFloat(boundsmeta.getAttribute('minlon'));
		maxlat = parseFloat(boundsmeta.getAttribute('maxlat'));
		maxlon = parseFloat(boundsmeta.getAttribute('maxlon'));
		
		if ( !(isNaN(minlat) || isNaN(minlon) || isNaN(maxlat) || isNaN(maxlon) ) ) {
			console.log('Plucking values from bounds metadata, hooray for detail!');
			this['bounds'] = L.latLngBounds( [maxlat, minlon], [minlat, maxlon] );
		}
	}
	
	extremes = {
		north: -90,
		east: -180,
		south: 90,
		west: 180
	}; //initialise all to zero values
	
	points = [];
	for (i = 0; i < nodes.length; i++) {
		lat = parseFloat(nodes[i].getAttribute('lat'));
		lon = parseFloat(nodes[i].getAttribute('lon'));
		if ( !(isNaN(lat) || isNaN(lon) ) ) { // yes we'll rule the whole location invalid for consideration ..
			if ( !boundsmeta ) {
				if ( extremes.north < lat ) {
					extremes.north = lat;
					// console.log('New northmost: ' + lat + ',' + lon);
				}
				if ( extremes.south > lat ) {
					extremes.south = lat;
					// console.log('New southmost: ' + lat + ',' + lon);
				}
				if ( extremes.east < lon ) {
					extremes.east = lon;
					// console.log('New eastmost: ' + lat + ',' + lon);
				}
				if ( extremes.west > lon ) {
					extremes.west = lon;
					// console.log('New westmost: ' + lat + ',' + lon);
				}
			}
			points.push(L.latLng(lat, lon));
			// console.log(lat + ',' + lon);
		}
	}
	
	this['path'] = L.polyline(points);
	
	if ( !boundsmeta ) {
		this['bounds'] = L.latLngBounds( [extremes.north, extremes.west], [extremes.south, extremes.east] );
	}
	this['centroid'] = this.bounds.getCenter();
	
	// TODO: fire an event

	this.render = function() {

		if ( map === undefined ) {
			map = L.map('track-canvas');

			L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
					attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
				}).addTo(map);
		}

		map.fitBounds(this.bounds);
		map.onLoadZoom = map.getZoom();
		// reverse geocode for title
		this['description'] = reverseGeocode(this.centroid, map.onLoadZoom); //TODO: needs work like async
		
		// add to map
		this.path.setStyle( {
			color: '#83f',
			width: '5px',
			opacity: 0.7
			}
		).addTo(map);
		
		L.marker(this.startpoint, {
			icon: L.icon({
				iconUrl: 'js-lib/leaflet-gpx/pin-icon-start.png',
				iconAnchor: L.point(17, 48)
				})
			})
			.addTo(map)
			.bindPopup('<h2>Start</h2><p>' + this.started + ' @ ' +  '(' + this.startpoint.lat + ',' + this.startpoint.lng + ')</p>');  // FIXME
		L.marker(this.endpoint, {
			icon: L.icon({
				iconUrl: 'js-lib/leaflet-gpx/pin-icon-end.png',
				iconAnchor: L.point(17, 48)
				})
			})
			.addTo(map)
			.bindPopup('<h2>End</h2><p>' + this.ended + ' @ ' +  '(' + this.endpoint.lat + ',' + this.endpoint.lng + ')</p>'); // FIXME

		console.log( this.bounds );
		console.log( this.centroid);
		console.log( this.description);
		console.log( this.endpoint);
	}

	this.formatAttributes = function() {
		attributeLabels = {
			startpoint: 'Starting Point',
			started: 'Start Time',
			endpoint: 'End Point',
			ended: 'End Time',
			bounds: 'Extremities'
		}
		
		markup = '<dl class="values">\n';
		for ( prop in attributeLabels ) {
			if (attributeLabels.hasOwnProperty(prop)) {
				markup += '<dt>' + attributeLabels[prop] + '</dt>\n';
				markup += '<dd>' + this[prop] + '</dd>\n';
			}
		}					
		markup += '</dl>\n';
		
		return markup;
	}
}

// L.geoJson.prototype.formatAttributes = function() {
// FIXME: this should be an extension for L.geoJson but isn't working as such, so for now ..
formatAttributes = function(GJ) {
		attributeLabels = {
			name: 'Track name',
			version: 'App version',
		}
	
		markup = '<dl class="values">\n';
		for ( prop in attributeLabels ) {
			if (attributeLabels.hasOwnProperty(prop)) {
				markup += '<dt>' + attributeLabels[prop] + '</dt>\n';
				markup += '<dd>' + GJ.properties[prop] + '</dd>\n';
			}
		}					
		markup += '</dl>\n';
		return markup;
	};

function reverseGeocode(location, zoom, provider) {
	console.log('reverseGeocode((' + location.lat + ',' + location.lng + '), ' + zoom + (provider === undefined ? '' : provider) + ')');
	if ( provider === undefined ) {
		provider = 'Nominatim';
	}
	switch(provider) {
		case 'Nominatim': // through to the 'keeper
		default: {
			var urlTemplate = 'http://nominatim.openstreetmap.org/reverse?format=json&lon={x}&lat={y}';
			if (zoom) {
				urlTemplate += '&zoom={z}';
			}
			break;
		}
	}
	
	serviceURL = urlTemplate
		.replace('{x}',location.lng)
		.replace('{y}',location.lat)
		.replace('{z}', zoom)
	;
	
	serviceRequest = new XMLHttpRequest();
	serviceRequest.open('GET', serviceURL, false);

	console.log('Gonna look up ' + serviceURL);
	serviceRequest.send();
	
	payload = JSON.parse(serviceRequest.response);
	console.log(payload);
	
	return payload.display_name;
}

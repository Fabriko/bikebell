// L.geoJson.prototype.formatAttributes = function() {
// FIXME: this should be an extension for L.geoJson but isn't working as such, so for now ..
formatAttributes = function(GJ) {
	
	var attributeLabels = {
		name: 'Track name',
		rider: 'Rider',
		startpoint: 'Starting Point',
		started: 'Start Time',
		endpoint: 'End Point',
		ended: 'End Time',
		bounds: 'Extremities',
		device: 'Device name',
		version: 'App version',
		};
		
	var timeFields = [
		'started',
		'ended',
		];

	var markup = '<dl class="values">\n';
	$.each(GJ.properties, function(key, value) { // FIXME: ideally re-order these as per attributeLabels, not so random!
		// console.log(timeFields.includes(key));
		value = ( timeFields.includes(key) ? $.formatDateTime('D MM d, yy hh:ii', new Date(value)) : value );
		var label = attributeLabels.hasOwnProperty(key) ? attributeLabels[key] : key;
		markup += '<dt>' + label + '</dt>\n';
		markup += '<dd>' + value + '</dd>\n';
		});
	markup += '</dl>\n';

	return markup;
	};

// thanks http://stackoverflow.com/a/12675966
Array.prototype.last = function() {
    return this[this.length-1];
}

// Polyfill util from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes#Polyfill
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement /*, fromIndex*/) {
    'use strict';
    if (this == null) {
      throw new TypeError('Array.prototype.includes called on null or undefined');
    }

    var O = Object(this);
    var len = parseInt(O.length, 10) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1], 10) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
        return true;
      }
      k++;
    }
    return false;
  };
}

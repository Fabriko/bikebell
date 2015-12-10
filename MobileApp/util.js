// from https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(target) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert first argument to object');
      }

      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null) {
          continue;
        }
        nextSource = Object(nextSource);

        var keysArray = Object.keys(nextSource);
        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
          var nextKey = keysArray[nextIndex];
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
          if (desc !== undefined && desc.enumerable) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    }
  });
}

Date.prototype.getUTCTime = function() {
	return (this.getTime() + this.getTimezoneOffset() * 60000) / 1000;
}

Number.prototype.leadZeros = function(zeros) {
	// returns a string with _zeros_ leading zeros
	if ( this < Math.pow(10, zeros) ) {
		var prefix = '';
		for ( i = 1 ; i <= zeros ; i++ ) {
			prefix += '0';
		}
		return prefix + this.toString();
	}
	else {
		return this.toString();
	}
}

function logTimestampFormatDuJour(stamp) {
	return formatTimestamp(stamp, 'log');
}

function formatTimestamp(stamp, format) {
	year = stamp.getFullYear();
	month = (stamp.getMonth() + 1).leadZeros(1);
	dom = stamp.getDate().leadZeros(1);
	hour = stamp.getHours().leadZeros(1);
	minute = stamp.getMinutes().leadZeros(1);
	second = stamp.getSeconds().leadZeros(1);
	millisecond = stamp.getMilliseconds().leadZeros(2);

	switch(format) {
		case 'YYYY-MM-DD hh:nn:ss.sss':
		case 'log':
			return '<strong>' +
				hour + ':' +
				minute + ':' +
				second + '.' +
				'</strong>' +
				Math.round(stamp.getMilliseconds()/10).leadZeros(1);
		case 'filename':
			return year +
				month +
				dom + 'T' + 
				hour +
				minute + 
				second;
		default: // use W3CDTF == 'YYYY-MM-DDThh:nn:ss.sssZ'
			return year + '-' +
				month + '-' +
				dom + 'T' +
				hour + ':' +
				minute + ':' +
				second + '.' +
				millisecond + 'Z';
	}
}

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
	var year = stamp.getFullYear();
	var month = (stamp.getMonth() + 1).leadZeros(1);
	var dom = stamp.getDate().leadZeros(1);
	var hour = stamp.getHours().leadZeros(1);
	var minute = stamp.getMinutes().leadZeros(1);
	var second = stamp.getSeconds().leadZeros(1);
	var millisecond = stamp.getMilliseconds().leadZeros(2);

	var dow = stamp.getDay();

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
		case 'trackname':
			var days = { // yeech!
				0: 'Sun',
				1: 'Mon',
				2: 'Tue',
				3: 'Wed',
				4: 'Thu',
				5: 'Fri',
				6: 'Sat',
				7: 'Sun',
				};
			var months = { // ditto
				1: 'Jan',
				2: 'Feb',
				3: 'Mar',
				4: 'Apr',
				5: 'May',
				6: 'Jun',
				7: 'Jul',
				8: 'Aug',
				9: 'Sep',
				10: 'Oct',
				11: 'Nov',
				12: 'Dec',
				};
			return days[dow] + ' ' +
				parseInt(dom) + ' ' +
				months[parseInt(month)] + ', ' +
				year + ' @' +
				parseInt(hour) + ':' +
				minute;
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

var outcome = {
	onSuccess: function() {
		var msg = 'It worked!';
		console.log(msg);
		},
	onFail: function() {
		var msg = 'It failed :(';
		console.log(msg);
		},
	};

Storage.prototype.hasItem = function(itemName, rejectEmpty) {
	var setting = this.getItem(itemName);
	return ( (setting !== null) && (rejectEmpty ? setting.length > 0 : true) );
}
/*
testStorageHasItem = function() {
	window.localStorage.setItem('test.foo', 'foo');
	console.log(window.localStorage.hasItem('test.foo')); // true
	console.log(window.localStorage.hasItem('test.foo', false)); // true
	console.log(window.localStorage.hasItem('test.foo', true)); // true

	window.localStorage.setItem('test.empty','');
	console.log(window.localStorage.hasItem('test.empty')); // true
	console.log(window.localStorage.hasItem('test.empty', false)); // true
	console.log(window.localStorage.hasItem('test.empty', true)); // false

	window.localStorage.removeItem('test.bar');
	console.log(window.localStorage.hasItem('test.bar' )); // false
	console.log(window.localStorage.hasItem('test.bar', false)); // false
	console.log(window.localStorage.hasItem('test.bar', true)); // false
}();
*/

SBUtils = {

	// based off http://stackoverflow.com/a/2117523
	'UUishID': function(short) {
		short = ( typeof short === undefined || short );
		var mask = ( short ? 'xxxxxxxxxxxx' : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' );
		return mask.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0,
				v = ( c == 'x' ? r : (r&0x3|0x8) );
			return v.toString(16);
			});
		},

	'isAndroid': function() {
		return device.platform.match(/android/i);
		},

	'uploadHappy': function() {
// return true; // FIXME - this is failing because Connection isn't defined for some reason
		return navigator.connection && navigator.connection.type && 
			config.PREFERENCES.media.upload_on_connection_types.includes(navigator.connection.type);
		},

	'isOnline': function(checkUnfettered) { // TODO: checkUnfettered is not implemented and will just return nothing, so effectively false
		// Connection constant values for reference: 'ethernet', 'wifi', '4g', '3g', '2g', 'cellular'
		return navigator.connection && navigator.connection.type &&
			navigator.connection.type != Connection.UNKNOWN &&
			navigator.connection.type != Connection.NONE &&
			function () {
				if (checkUnfettered) {
					// http://stackoverflow.com/a/14030276
					// TODO: create a PHP script and return some unlikely stuff and compare (e.g. 204 <device-id>)
				}
				else {
					return true;
				}
				}();
		},

	};

UUishID = SBUtils.UUishID;

function logActivity(msg) {
	console.log($('<div>' + msg + '</div>').text()); // strip out any HTML meant for the app screen console
	$('#activities').prepend(
		'<span class="timestamp meta">' + formatTimestamp(new Date(), 'log') + '</span>' +
		': ' +
		msg +
		'<br/>'
	);
}

// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {

      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If len is 0, return false.
      if (len === 0) {
        return false;
      }

      // 4. Let n be ? ToInteger(fromIndex).
      //    (If fromIndex is undefined, this step produces the value 0.)
      var n = fromIndex | 0;

      // 5. If n ≥ 0, then
      //  a. Let k be n.
      // 6. Else n < 0,
      //  a. Let k be len + n.
      //  b. If k < 0, let k be 0.
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }

      // 7. Repeat, while k < len
      while (k < len) {
        // a. Let elementK be the result of ? Get(O, ! ToString(k)).
        // b. If SameValueZero(searchElement, elementK) is true, return true.
        // c. Increase k by 1. 
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        k++;
      }

      // 8. Return false
      return false;
    }
  });
}


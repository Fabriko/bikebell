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

// based off http://stackoverflow.com/a/2117523
function UUishID(short) {
	short = ( typeof short === undefined || short );
	var mask = ( short ? 'xxxxxxxxxxxx' : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' );
	return mask.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0,
		    v = ( c == 'x' ? r : (r&0x3|0x8) );
		return v.toString(16);
		});
}

var query = {
	onSuccess: function(transaction, resultSet) {
		// console.log('Query completed: ' + JSON.stringify(resultSet.rows)); //  + transaction.toString()
		console.log(resultSet.rowsAffected + ' rows affected');
		if(config.DB_LOGGING && resultSet.rows.length > 0) {
			for(var i = 0; i < resultSet.rows.length; i++) {
				console.log('Result ' + i + ': ' + JSON.stringify(resultSet.rows.item(i)));
			}
		}

		},

	onFail: function(transaction, error) {
		console.log('Query failed: ' + error.message);
		},
	};

query.testInsert = function() {
	dbConnection.transaction(function (tx) {
		var qry = 'INSERT INTO tracks(name, geoJSON, stamp) VALUES (?,?, ?)';
		tx.executeSql(qry, ['test-' + new Date().toUTCString(), JSON.stringify({hello:'world'}), Date.now()], fooFunc, query.onFail);
	});
	
	var fooFunc = function() {	dbConnection.readTransaction(function (tx) {
		var qry = 'SELECT * FROM tracks ORDER BY stamp DESC;';
		tx.executeSql(qry, [], function(transaction, resultSet) {
			console.log('Select completed: ' + JSON.stringify(resultSet.rows));
			if(config.DB_LOGGING && resultSet.rows.length > 0) {
				for(var i = 0; i < resultSet.rows.length; i++) {
					console.log('Result ' + i + ': ' + resultSet.rows.item(i).geoJSON);
					console.log(JSON.parse(resultSet.rows.item(i).geoJSON).hello)
				}
			}}, query.onFail);
			});
		};
}

query.dump = function(table) {
	dbConnection.readTransaction(function (tx) {
		tx.executeSql('SELECT * FROM ' + table, [], query.onSuccess, query.onFail);
	});
}

query.drop = function(table) {
	dbConnection.transaction(function (tx) {
		tx.executeSql('DROP TABLE IF EXISTS ' + table, [], query.onSuccess, query.onFail);
	});
}
	
query.lastTrack = function() {
	dbConnection.readTransaction(function (tx) {
		tx.executeSql('SELECT * FROM tracks ORDER BY stamp DESC LIMIT 1;', [], query.onSuccess, query.onFail);
	});
}

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

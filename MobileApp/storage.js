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

// ***************************************************

var tdb = new PouchDB('my_test_database');

var remoteCouch = config.DATASTORE.endpoint;
console.log(remoteCouch);

var my_test_data = {
	'_id':    new Date().toISOString(),
	'field1': 'my value 1',
	'field2': 'my value 2'
};

tdb.put(my_test_data).then(
	function(result) {
		console.log('yay');
		console.log(result);
	}).then(
	function(result) {
		console.log('yay again');
		tdb.sync( remoteCouch, {live: false}).on('change', 
			function (info) {
				console.log('info: ' + JSON.stringify(info));
			});
	}).catch(
	function(err) {
		console.log('boo');
		console.log('err: ' + err.name + JSON.stringify(err));
	});

tdb.spit = function() {
}

tdb.allDocs( {includeDocs: true} ).then(
	function(result) {
		console.log(result.rows);
	}).catch(
	function(err) {
		console.log('noooo');
		console.log(err);
	});

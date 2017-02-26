var localStore = new PouchDB(config.dataStore.database);

var remoteStore = config.dataStore.endpoint + '/' + config.dataStore.database;

// console.log(remoteStore);

/*
localStore.spit = function() {
}

localStore.allDocs( {includeDocs: true} ).then(
	function(result) {
		console.log(result.rows);
	}).catch(
	function(err) {
		console.log('noooo');
		console.log(err);
	});
*/

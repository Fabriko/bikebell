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

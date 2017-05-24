var localStore = new PouchDB(config.dataStore.database);

var remoteStore = config.dataStore.endpoint.replace(/(:\/\/)/, '$1' + config.dataStore.username + ':' + config.dataStore.password + '@') + '/' + config.dataStore.database;
// logActivity(remoteStore); // FIXME: this var name is bad because this is a string and localStore is an object

PouchDB.debug.enable('pouchdb:find');

function MangoHTTP(endpoint, database, opts) {
	var __this = this;

	// logActivity('MangoHTTP created with endpoint ' + endpoint + ' database ' + database + ' user ' + opts.auth_user + ' pass ' + opts.auth_pass );

	this.API_ROOT = endpoint + '/' + database;

	this.createIndex = function(indexJSON, onIndexSuccess, onIndexFail){
		logActivity('Sending to ' + this.API_ROOT + '/_index');

		var post = new XMLHttpRequest();
		post.withCredentials = true;
		post.open('POST', this.API_ROOT + '/_index');
		post.setRequestHeader('Authorization', 'Basic ' + btoa(opts.auth_user + ':' + opts.auth_pass));
		post.setRequestHeader('Content-Type', 'application/json');
		post.send(JSON.stringify(indexJSON));

		post.onload = function(evt) {
			if (String(typeof(onIndexSuccess)) != 'function') {
				onIndexSuccess = function(evt) {
					logActivity('Created?? index from DB');
					var responseJSON = JSON.parse(post.responseText);
					logActivity(JSON.stringify(responseJSON));
					};
			}
			onIndexSuccess.call(evt);
			};

		post.onerror = function(err) { // untested
			if (String(typeof(onIndexFail)) != 'function') {
				onIndexFail = function(err) {
					logActivity('Failed?? creating index');
					logActivity('Output: ' + post.responseText);
					};
			}
			onIndexFail.call(err);
			};



		}; // TODO


	this.find = function(query, onQuerySuccess, onQueryFail) { // onQuerySuccess, onQueryFail are untested
		// curl -i -d @query.json -X POST https://user:pass@example.org/field_tests/_find
		logActivity('Sending to ' + this.API_ROOT + '/_find');
		/*
		var foo = $.ajax(this.API_ROOT + '/_find', {
			method: 'POST',
			data: query,
			contentType: 'application/json',
			username: config.dataStore.username,
			password: config.dataStore.password,
			processData: false,
			});
		foo.done( function(res) {
			console.log(JSON.stringify(res));
		    });
		foo.fail( function(jxhr, code, err) {
			console.log(code);
		    });
		};
		*/

		var post = new XMLHttpRequest();
		// post.withCredentials = true;
		post.open('POST', this.API_ROOT + '/_find');
		post.setRequestHeader('Authorization', 'Basic ' + btoa(opts.auth_user + ':' + opts.auth_pass));
		post.setRequestHeader('Content-Type', 'application/json');
		post.send(JSON.stringify(query));

		post.onload = function(evt) {
			logActivity('Retrieved data from DB');
			var responseJSON = JSON.parse(post.responseText);
			logActivity(JSON.stringify(responseJSON));
			onQuerySuccess && onQuerySuccess.call(post, responseJSON);
			};

		post.onerror = function(err) { // untested (hasn't errored)
			logActivity('Failed retrieving data from DB');
			logActivity('Output: ' + post.responseText);
			onQueryFail && onQueryFail.call(err);
			};
		};
}

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

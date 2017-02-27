# Bike bell sensor app

Cordova app for [Fabriko's bike bell sensor](../README.md) :)

## OK so whatever it is, how do I run it?

There are _at least_ two paths ..

* You can install the [Evothings](http://evothings.com) stack (desktop workbench app runs as a server, phone client apps run within the same network) - LINK TODO
* You can build it using [Cordova](https://cordova.apache.org) - config.xml etc missing TODO
* _Run it on an emulator. I was never able to get that running (not impressed, looking at you, Google)._ YMMV :(

## Software, languages, libraries, resources, and standards used

* Javascript, HTML, CSS, SVG
* [JQuery](http://jquery.com/)
* [Leaflet](http://leafletjs.com)
* [geoJSON](http://geojson.org/geojson-spec.html)
* [Cordova](https://cordova.apache.org) / [Phonegap](http://phonegap.com)
* [Evothings](http://evothings.com) Studio and client
* [PhoneGap Toast Plugin](https://github.com/EddyVerbruggen/Toast-PhoneGap-Plugin)
* [Openstreetmap](http://openstreetmap.org)
* [IBM Cloudant](http://cloudant.com) server running [CouchDB](https://couchdb.apache.org) (or at least supporting its API)
* [PouchDB](https://pouchdb.com) syncing Javascript client for CouchDB API
* [jsbeautifier.org](http://jsbeautifier.org)
* [git](http://git-scm.com) and [Github](http://github.com)

## FAQs
### What are the app requirements?
Android, BLE, GPS

### Will there be an iOS version, or other platforms?
Can you run it on my _[stylish\_machine]_? We've done this using Cordova mostly because we want to produce it for the greatest number of device platforms. So iThings, maybe Windows and others. Having said that, we are yet to try building for another platform.

### Where is the data stored?
Currently we have a DBaaS instance at [IBM Cloudant](http://cloudant.com) in the cloud. I tried building my own virtual server running [Couchbase]() but failed because I thought it required similar resources to MySQL/Postgres :~/

It's also synced and stored on devices running the app (and the [journey viewer](../DataAnalysis/)) because of the wonderfully simple [PouchDB](https://pouchdb.com) client library and [API](https://pouchdb.com/api.html).

### Will the app work with offline maps?
As of around 0744df, subject to lots of testing (this is hard).

## Evolving list of inpsiring resources
* [offline map tiles for Cordova](https://github.com/gregallensworth/L.TileLayer.Cordova)
* [Mapbox.js API](https://www.mapbox.com/mapbox.js)
* [Roads to Rome](http://roadstorome.moovellab.com) - ["cities" especially](http://roadstorome.moovellab.com/cities)
* [Animated cycling through map markers](https://www.mapbox.com/mapbox.js/example/v1.0.0/cycle-markers/)

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
* [Amazon S3](https://aws.amazon.com/s3/)
* [jsbeautifier.org](http://jsbeautifier.org)
* [git](http://git-scm.com) and [Github](http://github.com)

## FAQs
### What are the app requirements?
Android, BLE, GPS, online

### Will there be an iOS version, or other platforms?
Can you run it on my _[stylish\_machine]_? We've done this using Cordova mostly because we want to produce it for the greatest number of device platforms. So iThings, maybe Windows and others. Having said that, we are yet to try building for another platform.

### Where is the data stored?
Currently [Amazon S3](https://aws.amazon.com/s3/) in the cloud. There were problems with our experience, so possibly another provider or our own server (an ownCloud instance on a cloud VM, but we'd need an SSL certificate in production).

### Will the app work with offline maps?
I think we can do this using solutions <<-- yep, TODO

## Evolving list of inpsiring resources
* [offline map tiles for Cordova](https://github.com/gregallensworth/L.TileLayer.Cordova)
* [Mapbox.js API](https://www.mapbox.com/mapbox.js)
* [Roads to Rome](http://roadstorome.moovellab.com) - ["cities" especially](http://roadstorome.moovellab.com/cities)
* [Animated cycling through map markers](https://www.mapbox.com/mapbox.js/example/v1.0.0/cycle-markers/)

/* ****** Generic UI code ******* */

/*
// from https://wordpress.org/support/topic/map-not-displaying-correctly-when-embeded-in-a-hidden-div
$(document).ready(function() {
	map.invalidateSize();
	$('.ui-tabs').on('tabsactivate', function(event, ui) {
		map.invalidateSize();
	});
});
*/

document.addEventListener(
	'DOMContentLoaded',
	function () {
		
		// set any underlay images defined in config.rendering object structure as ['underlay']
		for (var identifier in config.rendering) {
			// console.log(identifier + ': ' + $('#' + identifier + ' .underlay').length);
			var rendering = config.rendering[identifier];
			if (rendering.hasOwnProperty('underlay')) {
				$('#' + identifier + ' .underlay').attr('src', 'ui/images/' + rendering.underlay);
			};
		}
	}
);

$(document).on('pageinit', function() {

	$('.menu-btn').add('.burger.menu li a').click( function() {
		$('.burger.menu').toggleClass('out'); // FIXME: can possibly use https://api.jqueryui.com/theming/stacking-elements/ from the framework instead here
	});

	adaptiveButton('connect');

	$('#dev\\.diagnostics').toggle();
	$(".menu a:contains('Developer options') img").toggle(); 

	// $('#fauxOn').prop('defaultChecked', config.useFauxConnection); - doesn't work :(

	// $('#menu').menu(); // would also be nice to use the JS-UI framework here, but this method from the examples freezes execution and can't find much on it

	$('.ui-tabs-panel.swipeable').on('swipeleft swiperight', onTabSwipe);
	
	// log tab switches to console.log and resize maps on tab changes
	$('.ui-tabs').on('tabsactivate', function(event, ui) {
		// console.log('activated ' + ui.newTab.filter('#nav-map').length);
		ui.newTab.each( function () { // .filter('#nav-map').each
			console.log('Switched tab to ' + $(this).text());

			// TODO: find a way to non-enumeratively loop through Leaflet instances, and preferably only the one related to the tab
			map && map.invalidateSize();
			dashMap && dashMap.invalidateSize();
		});
	});
});

function switchTab(jqTabItem/*, cb*/) {
	jqTabItem.find('a.ui-tabs-anchor').click();
/*
	if (arguments[1]) {
		window.alert('yo');
		cb();
	}
*/
}// TODO: a similar function that allows specifying the tab panel instead, so we don't have to figure out (or even set) its corresponding navbar id

function adaptiveButton(id) {
	$('.inner.majora.adaptive').hide('fast', function() {
			$('#adaptive-' + id).parents('.inner.majora').show()
		});
}

function onTabSwipe(event) { //TODO; a transition effect - this is too fast
	console.log('hey you swiped it: ' + event.type);
	var $tabList = $(event.delegateTarget).prevAll('.ui-navbar').find('.ui-tabs-nav');
	var $tabItems = $tabList.find('li');
	// console.log('$tabItems.length: ' + $tabItems.length);
	var activeIndex = $tabList.find('.ui-tabs-active').index();
	// console.log('activeIndex: ' + activeIndex);
	newIndex = activeIndex + ( event.type == 'swiperight' ? -1 : 1 );
	// console.log('newIndex before: ' + newIndex);
	if ( newIndex >= $tabItems.length ) {
		newIndex = newIndex - $tabItems.length;
	}
	else if ( newIndex < 0 ) {
		newIndex = $tabItems.length + newIndex;
	}
	// console.log('newIndex corrected: ' + newIndex);
	switchTab($($tabItems[newIndex]));
}

bellUI = {
	popup: function(msg, duration, options) {
		options = options || {};
		if (window.plugins && window.plugins.toast) {
			// refer https://github.com/EddyVerbruggen/Toast-PhoneGap-Plugin for option implementation <<-- TODO
			window.plugins.toast.show(msg, (duration || 'long'), (options.position || 'center'), (options.onSucceed || $.noop()), (options.onFail || $.noop()));
			logActivity('Notified with window.plugins.toast: ' + msg);
			options.onSucceed && options.onSucceed.call();
		}
		/*
		else if (someAlternativeNotificationObject) { // e.g. https://www.npmjs.com/package/cordova-plugin-dialogs
			logActivity(msg);
			onSucceed.call();
		}
		*/
		else if(options.fallback) {
			logActivity('Using fallback ' + options.fallback.name + ' instead');
			options.fallback.call(null, msg, duration, options);
		}
		else {
			logActivity('Failed to notify: ' + msg);
			if (options.onFail) {
				options.onFail.call();
			}
		}
	}
}

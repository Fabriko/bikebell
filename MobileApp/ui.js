/* ****** Generic UI code ******* */
$(document).on('pageinit', function() {

	$('.menu-btn').add('.burger.menu li a').click( function() {
		$('.burger.menu').toggleClass('out'); // FIXME: can possibly use https://api.jqueryui.com/theming/stacking-elements/ from the framework instead here
	});

	adaptiveButton('connect');

	$('#dev\\.diagnostics').toggle();
	$(".menu a:contains('Developer options') img").toggle(); 

	// $('#fauxOn').prop('defaultChecked', config.useFauxConnection); - doesn't work :(

	// $('#menu').menu(); // would also be nice to use the JS-UI framework here, but this method from the examples freezes execution and can't find much on it

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
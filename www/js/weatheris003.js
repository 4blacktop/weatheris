// Initialize your app
var myApp = new Framework7({
    modalTitle: 'Weatheris',
    material: true,
    materialPageLoadDelay: 200
});

// Export selectors engine
var $$ = Dom7;

// Register required Template7 helpers, before templates compilation
Template7.registerHelper('dayOfWeek', function (date) {
    date = new Date(date);
	// var days = ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' ');
    var days = ('Вс Пн Вт Ср Чт Пт Сб').split(' ');
    return days[date.getDay()];
});
Template7.registerHelper('formatedDated', function (date) {
    date = new Date(date);
    // var months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
    var months = 'Янв Фев Мар Апр Мая Июн Июл Авг Сен Окт Ноя Дек'.split(' ');
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
});

// Back Button! Call onDeviceReady when PhoneGap is loaded. At this point, the document has loaded but phonegap-1.0.0.js has not. When PhoneGap is loaded and talking with the native device, it will call the event deviceready. 
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() { // PhoneGap is loaded and it is now safe to make calls PhoneGap methods
	document.addEventListener("backbutton", onBackKeyDown, false); // Register the event listener backButton
}
function onBackKeyDown() { // Handle the back button
	if(mainView.activePage.name == "index"){ navigator.app.exitApp(); }
	else { mainView.router.back(); }
}

// Fickr API Key. CHANGE TO YOUR OWN!!!
// var flickrAPIKey = '664c33273570a6c80067779f55f548d1';
// var flickrAPIKey = '4a241b15bac1fd0cc86bdce2f092b81d';
var flickrAPIKey = 'feb753a0cad44ff8b04c214a04fc1d69';

// Templates using Template7 template engine
myApp.searchResultsTemplate = Template7.compile($$('#search-results-template').html());
myApp.homeItemsTemplate = Template7.compile($$('#home-items-template').html());
myApp.detailsTemplate = Template7.compile($$('#details-template').html());

// Add view
var mainView = myApp.addView('.view-main');

// Search Locations
var searchTimeout;

myApp.searchLocation = function (search) {
    if (search.trim() === '') {
        $$('.popup .search-results').html('');
        return;
    }
    var query = encodeURIComponent('select * from geo.places where text="' + search + '"');
    var q = 'http://query.yahooapis.com/v1/public/yql?q=' + query + '&format=json';
    if (searchTimeout) clearTimeout(searchTimeout);
    $$('.popup .preloader').show();
    searchTimeout = setTimeout(function () {
        $$.get(q, function (results) {
            var html = '';
            results = JSON.parse(results);
            $$('.popup .preloader').hide();
            if (results.query.count > 0) {
                var places = results.query.results.place;
                html = myApp.searchResultsTemplate(places);
            }
            $$('.popup .search-results').html(html);
        });
    }, 300);
};

// Handle search results
var mySearchbar = myApp.searchbar('.searchbar', {
    customSearch: true,
    onDisable: function (s) {
        $$('.popup input[type="search"]')[0].blur();
        myApp.closeModal('.popup');
    },
    onSearch: function (s, q) {
        myApp.searchLocation(s.query);
    },
    onClear: function (s) {
        $$('.popup .search-results').html('');
    }
});
$$('.popup').on('open', function () {
    mySearchbar.enable();
});
$$('.popup').on('opened', function () {
    $$('.popup input[type="search"]')[0].focus();
});
$$('.popup .search-results').on('click', 'li', function () {
    var li = $$(this);
    var woeid = li.attr('data-woeid');
    var city = li.attr('data-city');
    var country = li.attr('data-country');
    var places;
    if (localStorage.w7Places) places = JSON.parse(localStorage.w7Places);
    else places = [];
    places.push({
        woeid: li.attr('data-woeid'),
        city: li.attr('data-city'),
        country: li.attr('data-country')
    });
    localStorage.w7Places = JSON.stringify(places);
    myApp.updateWeatherData(function () {
        myApp.buildWeatherHTML();
    });
});
// Get locations weather data
myApp.updateWeatherData = function (callback) {
    var woeids = [];
    if (!localStorage.w7Places) return;
    var places = JSON.parse(localStorage.w7Places);
    if (places.length === 0) {
        localStorage.w7Data = JSON.stringify([]);
        return;
    }
    if (!navigator.onLine) {
        // myApp.alert('You need internet connection to update weather data');
        myApp.alert('Для обновления данных необходимо подключение к Интернет');
    }
    for (var i = 0; i < places.length; i++) {
        woeids.push(places[i].woeid);
    }
    var query = encodeURIComponent('select * from weather.forecast where woeid in (' + JSON.stringify(woeids).replace('[', '').replace(']', '') + ') and u="c"');
    var q = 'http://query.yahooapis.com/v1/public/yql?q=' + query + '&format=json';
    myApp.showIndicator();
    $$.get(q, function (data) {
        var weatherData = [];
        myApp.hideIndicator();
		// console.log(data);
		
		// http://meteoinfo.ru/forecasts/forcterminology
		// translate response to Russian
		// console.log(data);
		data = data.replace(/light snow showers/gi, "Снег, метель");
		data = data.replace(/mixed rain and snow/gi, "Смешанный дождь и снег");
		data = data.replace(/mixed rain and sleet/gi, "Смешанный дождь и мокрый снег");
		data = data.replace(/mixed snow and sleet/gi, "Смешанный снег и мокрый снег");
		data = data.replace(/mixed rain and hail/gi, "Дождь с градом");
		data = data.replace(/rain and snow/gi, "Дождь и снег");
		data = data.replace(/Mostly clear/gi, "В основном ясно");
		data = data.replace(/Mostly sunny/gi, "В основном солнечно");
		data = data.replace(/Mostly Cloudy/gi, "Облачно с прояснениями");
		data = data.replace(/Partly Cloudy/gi, "Малооблачно");
		data = data.replace(/tropical storm/gi, "Тропическая буря");
		data = data.replace(/blowing snow/gi, "Низовая метель");
		data = data.replace(/severe thunderstorms/gi, "Сильные грозы");
		data = data.replace(/thunderstorms/gi, "Грозы");
		data = data.replace(/isolated thunderstorms/gi, "В отдельных районах грозы");
		data = data.replace(/scattered thunderstorms/gi, "Местами грозы");
		data = data.replace(/scattered snow showers/gi, "В отдельных районах снегопад");
		data = data.replace(/isolated thundershowers/gi, "В отдельных районах ливневой снег");
		data = data.replace(/scattered showers/gi, "Местами ливни");
		data = data.replace(/snow flurries/gi, "Снег, пурга");
		data = data.replace(/freezing drizzle/gi, "Изморозь");
		data = data.replace(/freezing rain/gi, "Ледяной дождь");
		data = data.replace(/heavy snow/gi, "Снегопад");
		data = data.replace(/heavy snow/gi, "Сильный снег");
		data = data.replace(/snow showers/gi, "Ливневой снег");
		data = data.replace(/drizzle/gi, "Изморозь");
		data = data.replace(/tornado/gi, "Торнадо");
		data = data.replace(/hurricane/gi, "Ураган");
		data = data.replace(/showers/gi, "Ливни");
		data = data.replace(/snow/gi, "Снег");
		data = data.replace(/hail/gi, "Град");
		data = data.replace(/sleet/gi, "Дождь со снегом");
		data = data.replace(/dust/gi, "Пыль");
		data = data.replace(/foggy/gi, "Туман");
		data = data.replace(/haze/gi, "Мгла");
		data = data.replace(/smoky/gi, "Дымка");
		data = data.replace(/cold/gi, "Морозно");
		data = data.replace(/cloudy/gi, "В основном облачно");
		data = data.replace(/clear/gi, "Ясно");
		data = data.replace(/sunny/gi, "Солнечно");
		data = data.replace(/fair/gi, "Солнечно");
		data = data.replace(/hot/gi, "Жарко");
		data = data.replace(/thundershowers/gi, "Ливни с грозами");
		data = data.replace(/Breezy/gi, "Свежо");
		data = data.replace(/Scattered/gi, "Местами");
		data = data.replace(/not available/gi, "Нет информации");
		
        data = JSON.parse(data);
        if (!data.query || !data.query.results) return;
        var places = data.query.results.channel;
        var place;
		
        if ($$.isArray(places)) {
            for (var i = 0; i < places.length; i++) {
                place = places[i];
                weatherData.push({
                    city: place.location.city,
                    country: place.location.country,
                    region: place.location.region,
                    humidity: place.atmosphere.humidity,
                    pressure: place.atmosphere.pressure,
                    sunrise: place.astronomy.sunrise,
                    sunset: place.astronomy.sunset,
                    wind: place.wind,
                    condition: place.item.condition,
                    forecast: place.item.forecast,
                    lat: place.item.lat,
                    long: place.item.long,
                    woeid: woeids[i]
                });
            }
        }
        else {
            place = places;
            weatherData.push({
                city: place.location.city,
                country: place.location.country,
                region: place.location.region,
                humidity: place.atmosphere.humidity,
                pressure: place.atmosphere.pressure,
                sunrise: place.astronomy.sunrise,
                sunset: place.astronomy.sunset,
                wind: place.wind,
                condition: place.item.condition,
                forecast: place.item.forecast,
                lat: place.item.lat,
                long: place.item.long,
                woeid: woeids[0]
            });
        }
        localStorage.w7Data = JSON.stringify(weatherData);
        if (callback) callback();
    });
};
// Build list of places on home page
myApp.buildWeatherHTML = function () {
    var weatherData = localStorage.w7Data;
    if (!weatherData) return;
    $$('.places-list ul').html('');
    weatherData = JSON.parse(weatherData);
    var html = myApp.homeItemsTemplate(weatherData);
    $$('.places-list ul').html(html);
};

// Delete place
$$('.places-list').on('delete', '.swipeout', function () {
    var woeid = $$(this).attr('data-woeid');
    // Update Places
    if (!localStorage.w7Places) return;
    var places = JSON.parse(localStorage.w7Places);
    for (var i = 0; i < places.length; i++) {
        if (places[i].woeid === woeid) places.splice(i, 1);
    }
    localStorage.w7Places = JSON.stringify(places);
    // Update places data
    if (!localStorage.w7Data) return;
    var data = JSON.parse(localStorage.w7Data);
    for (i = 0; i < data.length; i++) {
        if (data[i].woeid === woeid) data.splice(i, 1);
    }
    localStorage.w7Data = JSON.stringify(data);
    if (data.length === 0) myApp.buildWeatherHTML();
});



// Update html and weather data on app load
myApp.buildWeatherHTML();
myApp.updateWeatherData(function () {
    myApp.buildWeatherHTML();
});

// Build details page
$$('.places-list').on('click', 'a.item-link', function (e) {
    var woeid = $$(this).attr('data-woeid');
    var item;
    var weatherData = JSON.parse(localStorage.w7Data);
    for (var i = 0; i < weatherData.length; i++) {
        if (weatherData[i].woeid === woeid) item = weatherData[i];
    }
    var pageContent = myApp.detailsTemplate(item);
    mainView.loadContent(pageContent);
});

var photoXHR;
var photoCache = {};
myApp.onPageAfterAnimation('detail', function (page) {
	// $$('.detail-page-header').css('background-image', 'url(https://farm9.staticflickr.com/8585/16489978417_a592a6e0e1_c.jpg)');
	$$('.detail-page-header').css('background-image', 'url(details.png)');
	
    var woeid = $$(page.container).attr('data-woeid');
    var weatherData = JSON.parse(localStorage.w7Data);
    for (var i = 0; i < weatherData.length; i++) {
        if (weatherData[i].woeid === woeid) item = weatherData[i];
    }
	

    function placePhotos(photos) {
	// $$('.detail-page-header').css('background-image', 'url(https://farm9.staticflickr.com/8585/16489978417_a592a6e0e1_c.jpg)');
        if (photos && photos.query && photos.query.count > 0)  {
            var photo = photos.query.results.photo[Math.floor(Math.random() * photos.query.count)];
            $$('.detail-page-header').css('background-image', 'url(https://farm'+photo.farm+'.staticflickr.com/'+photo.server+'/'+photo.id+'_'+photo.secret+'_c.jpg)');
        }
    }
    if (photoCache[woeid]) {
        placePhotos(photoCache[woeid]);
    }
    else {
        // var query = encodeURIComponent('select * from flickr.photos.search where has_geo="true" and woe_id="'+woeid+'" and api_key="92bd0de55a63046155c09f1a06876875"');
        // var query = encodeURIComponent('select * from flickr.photos.search where has_geo="true" and woe_id="'+woeid+'" and api_key="feb753a0cad44ff8b04c214a04fc1d69"');
        // var query = encodeURIComponent('select * from flickr.photos.search where has_geo="true" and tags="girl" and woe_id="'+woeid+'" and api_key="feb753a0cad44ff8b04c214a04fc1d69"');
        // var query = encodeURIComponent('select * from flickr.photos.search where has_geo="true" and tags="street" and woe_id="'+woeid+'" and api_key="feb753a0cad44ff8b04c214a04fc1d69"');
		
		// https://www.flickr.com/services/api/flickr.photos.search.html
        var query = encodeURIComponent('select * from flickr.photos.search where has_geo="true" and tags="girl,street" and woe_id="'+woeid+'" and api_key="feb753a0cad44ff8b04c214a04fc1d69"');
        var q = 'https://query.yahooapis.com/v1/public/yql?q=' + query + '&format=json';
        photoXHR = $$.get(q, function (res) {
            if (res) {
                photoCache[woeid] = JSON.parse(res);
                placePhotos(photoCache[woeid]);
            }
        });
    }
});
myApp.onPageBack('detail', function (page) {
    if (photoXHR) photoXHR.abort();
});

// Update app when manifest updated 
// http://www.html5rocks.com/en/tutorials/appcache/beginner/
// Check if a new cache is available on page load.
window.addEventListener('load', function (e) {
    window.applicationCache.addEventListener('updateready', function (e) {
        if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
            // Browser downloaded a new app cache.
            // myApp.confirm('A new version of weatheris is available. Do you want to load it right now?', function () {
            myApp.confirm('Для приложения Weatheris доступна новая версия. Хотите установить обновление сейчас?', function () {
                window.location.reload();
            });
        } else {
            // Manifest didn't changed. Nothing new to server.
        }
    }, false);
}, false);

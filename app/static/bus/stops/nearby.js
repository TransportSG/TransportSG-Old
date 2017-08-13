function showError(message) {
    $('div#message span').textContent = message;
    $('#interactionContainer').style.display = 'block';
    $.delete('#loadingContainer');
}

var load = () => {
    $('div#message span').textContent = '';
    if (!('geolocation' in navigator)) {
        showError('Your browser does not support GPS!');
        return;
    }
    var geolocation = navigator.geolocation;
    geolocation.watchPosition(function success(position) {
        $.ajax({
            url: '/bus/stops/findByLatLong',
            method: 'POST',
            data: {
                lat: position.coords.latitude,
                long: position.coords.longitude
            }
        }, response => {
            if ($('#loadingContainer'))
                $.delete('#loadingContainer');
            if ($('#interactionContainer'))
                $.delete('#interactionContainer');
            $('#resultContainer').innerHTML = response;
        });
    }, function error(error) {
        showError('Failed to get position!');
    }, {
        enableHighAccuracy: false,
        maximumAge        : 30000,
        timeout           : 27000
    });
}

load();

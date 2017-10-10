function showError(message) {
    $('div#message span').textContent = message;
    $('#interactionContainer').style.display = 'block';
    $.delete('#loadingContainer');
}

function setStatus(status) {
    if ($('p.currentStatus'))
        $('p.currentStatus').textContent = status;
}

var load = () => {
    $('div#message span').textContent = '';
    if (!('geolocation' in navigator)) {
        showError('Your browser does not support GPS!');
        return;
    }
    var geolocation = navigator.geolocation;
    geolocation.watchPosition(function success(position) {
        setStatus('Position Found');
        $.ajax({
            url: '/nearby/latlong',
            method: 'POST',
            data: {
                lat: position.coords.latitude,
                long: position.coords.longitude
            }
        }, response => {
            $('Loaded Bus Stops')
            if ($('#loadingContainer'))
                $.delete('#loadingContainer');
            if ($('#interactionContainer'))
                $.delete('#interactionContainer');
            $('#resultContainer').innerHTML = response;
        });
    }, function error(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                showError('Failed to get positon: Permission denied');
                break;
            case error.POSITION_UNAVAILABLE:
                showError('Failed to get positon: Is your GPS turned on?');
                break;
            case error.TIMEOUT:
                showError('Failed to get positon: Finding your position took too long!');
                break;
            default:
                showError('Failed to get position!');
        }
    }, {
        enableHighAccuracy: false,
        maximumAge        : 30000,
        timeout           : 10000
    });
}

var t = setInterval(() => {
    if ('$' in window) {
        clearInterval(t);
        load();
    }
});

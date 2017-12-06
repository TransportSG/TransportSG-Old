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

    var busStopCheckboxes = {};

    $('div#message span').textContent = '';
    if (!('geolocation' in navigator)) {
        showError('Your browser does not support GPS!');
        return;
    }
    var geolocation = navigator.geolocation;
    geolocation.watchPosition(function success(position) {
        setStatus('Position Found');
        $.ajax({
            url: '/nearby/nwabs',
            method: 'POST',
            data: {
                lat: position.coords.latitude,
                long: position.coords.longitude,
                dist: 1
            }
        }, response => {
            $('Loaded Bus Stops')
            if ($('#loadingContainer'))
                $.delete('#loadingContainer');
            if ($('#interactionContainer'))
                $.delete('#interactionContainer');
            $('#resultContainer').innerHTML = response;

            Object.keys(busStopCheckboxes).forEach(id => {
                if ($(id))
                    $(id).checked = busStopCheckboxes[id];
            })

            var checkboxes = document.querySelectorAll('.hideTimings');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', e => {
                    busStopCheckboxes[checkbox.id] = checkbox.checked;
                });
            });
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
        enableHighAccuracy: true,
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

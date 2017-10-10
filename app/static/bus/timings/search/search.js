function loadBuses() {
    $.ajax({
        url: '/timings/search',
        method: 'POST',
        data: {
            query: $('#input').value
        }
    }, response => {
        if (response.error) {
            response = '';
        }
        $('#results').innerHTML = response;
    });
}

function load() {
    var timer = 0;

    $('#input').on('input', () => {
        clearTimeout(timer);
        timer = setTimeout(loadBuses, 750);
    });

}

var t = setInterval(() => {
    if ('$' in window) {
        clearInterval(t);
        load();
    }
});

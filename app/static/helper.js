HTMLElement.prototype.on = HTMLElement.prototype.addEventListener;
Window.prototype.on = Window.prototype.addEventListener;

Object.defineProperty(XMLHttpRequest.prototype, 'responseJSON', {
    get: function() {
        try {
            return JSON.parse(this.responseText);
        } catch (e) {
            return undefined;
        }
    },
    enumerable: false
});

function $(query) {
    return document.querySelector(query);
}

$.delete = function (query) {
    $(query).parentElement.removeChild($(query));
}

$.ajax = function (options, callback) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function() {
        callback(xhr.responseJSON || xhr.responseXML || xhr.responseText);
    });
    xhr.open(options.method || 'GET', options.url || location.toString());
    if (options.data) {
        xhr.setRequestHeader('Content-Type', 'application/json');
    }
    xhr.send(JSON.stringify(options.data));
}

var query = location.query;

window.search = {};

search.hash = (location.hash.match(/#(\w+[=]\w+&?)+/)||[]).slice(1).map(e=>e.split('=')).reduce((a, e) => {a[e[0]] = e[1]; return a;}, {});
search.query = (location.search.match(/\?(\w+[=]\w+&?)+/)||[]).slice(1).map(e=>e.split('=')).reduce((a, e) => {a[e[0]] = e[1]; return a;}, {});

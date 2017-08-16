function degreeToRadians(deg) {
    return (Math.PI / 180) * deg;
}

function trigoFunction(func, a, b, c, d, x) {
    return a * func(b * degreeToRadians(x) + c) + d;
}

function drawBG(context, width, height) {
    context.lineWidth = 2;
    context.strokeStyle = '#333333';

    context.beginPath();

    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);

    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);

    context.stroke();
}

function paint(context, width, height, a, b, c, d) {
    context.lineWidth = 5;
    context.strokeStyle = '#c5c5c5';

    var fName = $('#fName').value;

    var step = 0.1;
    var scaleX = width * 0.001, scaleY = height * 0.08;

    context.beginPath();

    for (var x = -1080; x <= 1080; x += step) {
        context.moveTo(width / 2 + (x - step) * scaleX, height / 2 + trigoFunction(Math[fName], a, b, c, d, x - step) * scaleY);
        context.lineTo(width / 2 + x * scaleX, height / 2 + trigoFunction(Math[fName], a, b, c, d, x) * scaleY);
    }

    context.stroke();
}

function doPainting(context, width, height) {
    context.fillStyle = '#1e1e1e';
    context.fillRect(0, 0, width, height);

    drawBG(context, width, height);
    paint(context, width, height, $('#amp').value * 1, $('#period').value * 1, $('#xoff').value * 1, $('#yoff').value * 1);
}

function init() {
    var canvas = $('#canvas');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - getComputedStyle($('#others')).height.slice(0, -2) * 1 - getComputedStyle($('#header')).height.slice(0, -2) * 1;
}

function addListeners() {
    $('#amp').on('input', load.bind(this, false));
    $('#period').on('input', load.bind(this, false));
    $('#xoff').on('input', load.bind(this, false));
    $('#yoff').on('input', load.bind(this, false));
    $('#amp').on('change', load.bind(this, false));
    $('#period').on('change', load.bind(this, false));
    $('#xoff').on('change', load.bind(this, false));
    $('#yoff').on('change', load.bind(this, false));
}

function load(listeners) {
    var canvas = $('#canvas');
    var context = canvas.getContext('2d');
    var styling = getComputedStyle(canvas);

    $('#a').textContent = $('#amp').value;
    $('#b').textContent = $('#period').value;
    $('#c').textContent = $('#xoff').value;
    $('#d').textContent = $('#yoff').value;

    var width = window.innerWidth;
    var height = window.innerHeight - getComputedStyle($('#others')).height.slice(0, -2) * 1 - getComputedStyle($('#header')).height.slice(0, -2) * 1;

    init();

    if (listeners) {
        addListeners();
    }

    doPainting(context, width, height);
}

window.on('resize', load.bind(this, false));

window.on('load', load.bind(this, true));

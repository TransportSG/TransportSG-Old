const express = require('express'),
	compression = require('compression'),
	bodyParser = require('body-parser'),
	path = require('path');

module.exports = app => {
	app.use(compression({
		threshold: 32
	}));

	app.use('/static', express.static(path.join(__dirname, '/static')));

	app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(bodyParser.text());

    app.set('views', path.join(__dirname, '../app/views'));
    app.set('view engine', 'pug');
};

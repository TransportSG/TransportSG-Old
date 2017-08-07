const fs = require('fs'),
	path = require('path'),
    express = require('express'),
    mongoose = require('mongoose'),
    https = require('https'),
    http = require('http'),
    url = require('url'),
	{APIKey} = require('ltadatamall');

mongoose.Promise = global.Promise;

const config = require('./config');

global.apiKey = new APIKey(config.ltaAPIKey);

const configRoutes = require('./app/routes'),
    configExpress = require('./app/express');

const port = config.port,
	app = express();

function createHTTPSServer(app) {
    return https.createServer({
        key: fs.readFileSync(__dirname + '/https/privkey.pem'),
        cert: fs.readFileSync(__dirname + '/https/cert.pem'),
        ca: fs.readFileSync(__dirname + '/https/chain.pem')
    }, app);
}

function createRedirectServer(toURL) {
    return http.createServer((req, res) => {
        res.writeHead(302, {
            Location: toURL + url.parse(req.url).pathname
        });
        res.end();
    });
}


function listen() {
	configExpress(app);
	configRoutes(app);
    if (config.https) {
        var httpsServer = createHTTPSServer(app);
        httpsServer.listen(443);
        createRedirectServer(config.redirectURL).listen(port);
    } else {
        app.listen(port);
    }
    console.log('TransportSG-BusLookup started on port ' + port);
}

function connect() {
	return mongoose.connect('mongodb://' + config.dbUser + ':' + config.dbPass + '@' + config.database + '?authSource=admin', {
		server: {
			socketOptions: {
				keepAlive: 1
			},
			reconnectTries: Infinity
		}
	}, err => {
		if (err) throw err;
	});
}

connect().connection
	.on('disconnected', console.error.bind('Disconnected!'));
listen();

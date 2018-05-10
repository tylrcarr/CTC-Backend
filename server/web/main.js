'use strict';
const Preware = require('../preware');

const register = function (server, options) {

	server.route({
		method: 'GET',
		path: '/api/login/{param*}',
		options: {
			auth: false
		},
		handler: {
			directory: {
				path: "site/authpages"
			}
		}
	});
	server.route({
		method: 'GET',
		path: '/data/{param*}',
		options: {
			auth: {
				scope: ['admin', 'account']
			},
			pre: [
				Preware.requirePermission("canLogin")
			]
		},
		handler: {
			directory: {
				path: "site/data"
			}
		}
	});
	server.route({
		method: 'GET',
		path: '/signup/{param*}',
		options: {
			tags: ['signup'],
			auth: {
				scope: 'admin'
			},
			pre: [
				Preware.requirePermission("canConfirm")
			]
		},
		handler: {
			directory: {
				path: "site/signup"
			}
		}
	});
	server.route({
		method: 'GET',
		path: '/{param*}',
		options: {
			auth: false
		},
		handler: {
			directory: {
				path: "site/main"
			}
		}
	});
};


module.exports = {
	name: 'web-main',
	dependencies: [
		'auth',
		'hapi-mongo-models'
	],
	register
};

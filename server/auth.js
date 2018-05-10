'use strict';
const Session = require('./models/session');
const User = require('./models/user');
const Config = require('../config');

const register = function (server, options) {

	server.auth.strategy('session', 'cookie', {
		//validateFunc: async (request, sessionId, key, h) => {
		password: Config.get("/system/cookie_pass"),
		redirectTo: "/api/login/",
		appendNext: true,
		isSameSite: false,
		isSecure: false,
		redirectOnTry: false,
		validateFunc: async (request, session) => {
			const dbSession = await Session.findByCredentials(session.sessionId, session.key);
			if (!dbSession) {
				return { valid: false };
			}

			dbSession.updateLastActive();
			const user = await User.findById(session.user._id);
			if (!user) {
				return { valid: false };
			}
			/*
			if (!user.isAct) {
				return { valid: false };
			}
			*/

			const roles = await user.hydrateRoles();
			const credentials = {
				scope: Object.keys(user.roles),
				roles,
				dbSession,
				user
			};
			return {valid: true, credentials};
		}
	});

	server.auth.default('session');
};


module.exports = {
	name: 'auth',
	dependencies: [
		'hapi-auth-cookie',
		'hapi-mongo-models'
	],
	register
};

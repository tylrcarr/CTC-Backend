'use strict';
const AuthAttempt = require('../models/auth-attempt');
const Bcrypt = require('bcrypt');
const Boom = require('boom');
const Config = require('../../config');
const Joi = require('joi');
const Mailer = require('../mailer');
const Session = require('../models/session');
const User = require('../models/user');


const register = function (server, serverOptions) {
server.route({ 
	method: 'POST',
        path: '/api/login/',
        options: {
            tags: ['api','login'],
            auth: {
	   	mode: "try",
		strategy: "session"
	    },
	    plugins: {
	    	'hapi-auth-cookie': {
	     	    redirectTo: false
	        }
	    }, 
            validate: {
                payload: {
                    user: Joi.string().lowercase().required(),
                    pass: Joi.string().required()
                }
            },
            pre: [{
                assign: 'alreadyLoggedIn',
                method: async function (request, h) {
		    let next = (request.auth.isAuthenticated ? h.redirect((typeof request.query.next === undefined ? "/" : request.query.next)) : h.continue);
		    return next;
                }
            }, {
                assign: 'abuseDetected',
                method: async function (request, h) {

                    const ip = request.remoteAddress;
                    const username = request.payload.user;
                    const detected = await AuthAttempt.abuseDetected(ip, username);

                    if (detected) {
                        throw Boom.badRequest('attempts');
                    }

                    return h.continue;
                }
            }, {
                assign: 'user',
                method: async function (request, h) {

                    const ip = request.remoteAddress;
                    const username = request.payload.user;
                    const password = request.payload.pass;
                    const user = await User.findByCredentials(username, password);

                    if (!user) {
                        await AuthAttempt.create(ip, username);

                        throw Boom.badRequest('credentials');
                    }
                    const canLogin = await user.checkCanLogin();

                    if (!canLogin) {
                        await AuthAttempt.create(ip, username);

                        throw Boom.badRequest('permissions');
                    }
                    return user;
                }
            }, {
                assign: 'session',
                method: async function (request, h) {

                    const userId = `${request.pre.user._id}`;
                    const ip = request.remoteAddress;
                    const userAgent = request.headers['user-agent'];

                    return await Session.create(userId, ip, userAgent);
                }
            }]
        },
        handler: function (request, h) {

            const sessionId = request.pre.session._id;
            const sessionKey = request.pre.session.key;
            const cookie = {
                user: {
                    _id: request.pre.user._id,
                    username: request.pre.user.username,
                    email: request.pre.user.email,
                    roles: request.pre.user.roles
                },
                key: sessionKey,
               	sessionId: sessionId
            };
	    if (sessionId != null) {
	    	request.cookieAuth.set(cookie);	
		let url = (typeof request.query.next === "undefined" ? "/" : request.query.next);
		return h.response(url);
	    }
        }
    });


    server.route({
        method: 'POST',
        path: '/api/login/forgot',
        options: {
            auth: false,
            validate: {
                payload: {
                    email: Joi.string().email().lowercase().required()
                }
            },
            pre: [{
                assign: 'user',
                method: async function (request, h) {

                    const query = { email: request.payload.email };
                    const user = await User.findOne(query);

                    if (!user) {
                        const response = h.response({ message: 'Success.' });

                        return response.takeover();
                    }

                    return user;
                }
            }]
        },
        handler: async function (request, h) {

            // set reset token

            const keyHash = await Session.generateKeyHash();
            const update = {
                $set: {
                    resetPassword: {
                        token: keyHash.hash,
                        expires: Date.now() + 10000000
                    }
                }
            };

            await User.findByIdAndUpdate(request.pre.user._id, update);

            // send email

            const projectName = Config.get('/projectName');
            const emailOptions = {
                subject: `Reset your ${projectName} password`,
                to: request.payload.email
            };
            const template = 'forgot-password';
            const context = { key: keyHash.key };

            await Mailer.sendEmail(emailOptions, template, context);

            return { message: 'Success.' };
        }
    });


    server.route({
        method: 'POST',
        path: '/api/login/reset',
        options: {
            auth: false,
            validate: {
                payload: {
                    email: Joi.string().email().lowercase().required(),
                    key: Joi.string().required(),
                    password: Joi.string().required()
                }
            },
            pre: [{
                assign: 'user',
                method: async function (request, h) {

                    const query = {
                        email: request.payload.email,
                        'resetPassword.expires': { $gt: Date.now() }
                    };
                    const user = await User.findOne(query);

                    if (!user) {
                        throw Boom.badRequest('Invalid email or key.');
                    }

                    return user;
                }
            }]
        },
        handler: async function (request, h) {

            // validate reset token

            const key = request.payload.key;
            const token = request.pre.user.resetPassword.token;
            const keyMatch = await Bcrypt.compare(key, token);

            if (!keyMatch) {
                throw Boom.badRequest('Invalid email or key.');
            }

            // update user

            const password = request.payload.password;
            const passwordHash = await User.generatePasswordHash(password);
            const update = {
                $set: {
                    password: passwordHash.hash
                },
                $unset: {
                    resetPassword: undefined
                }
            };

            await User.findByIdAndUpdate(request.pre.user._id, update);

            return { message: 'Success.' };
        }
    });
};


module.exports = {
    name: 'api-login',
    dependencies: [
    	'hapi-auth-cookie',
        'hapi-mongo-models',
        'hapi-remote-address'
    ],
    register
};

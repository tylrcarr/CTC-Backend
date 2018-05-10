'use strict';
const Account = require('../models/account');
const Boom = require('boom');
const Config = require('../../config');
const Joi = require('joi');
const Mailer = require('../mailer');
const Preware = require('../preware');
const Session = require('../models/session');
const User = require('../models/user');


const register = function (server, serverOptions) {

	server.route({
		method: 'GET',
		path: '/api/signup/{id}/confirm',
		options: {
			tags: ['api','signup'],
			auth: {
				scope: 'admin'
			},
			pre: [
				Preware.requirePermission("canConfirm")
			]
		},
		handler: async function (request, h) {

			let account = await Account.findById(request.params.id);
			if (!account) {
				throw Boom.notFound('Account not found.');
			}

                        account = await account.convertToUser();

			return account;
		}
	});
	server.route({
		method: 'GET',
		path: '/api/signup/{id}/deny',
		options: {
			tags: ['api','signup'],
			auth: {
				scope: 'admin'
			},
			pre: [
				Preware.requirePermission("canConfirm")
			]
		},
		handler: async function (request, h) {
			console.log("here");
			console.log(request.params.id);
			const id = new ObjectID.createFromHexString(request.params.id);
			const filter = {
				"_id": id,
				"groups.guest": "guest"
			};
			const account = await Account.findOneAndDelete(filter);
			if (!account) {
				throw Boom.notFound('Account not found.');
			}
			console.log(account);
			const user = await User.findByIdAndDelete(account.user.id);

		}
	});
	server.route({
		method: 'POST',
		path: '/api/signup',
		options: {
			tags: ['api','signup'],
			auth: false,
			validate: {
				payload: {
					name: Joi.string().required(),
					email: Joi.string().email().lowercase().required(),
					username: Joi.string().token().lowercase().required(),
					password: Joi.string().required()
				}
			},
			pre: [{
				assign: 'usernameCheck',
				method: async function (request, h) {

					const user = await User.findByUsername(request.payload.username);

					if (user) {
						throw Boom.conflict('Username already in use.');
					}

					return h.continue;
				}
			}, {
				assign: 'emailCheck',
				method: async function (request, h) {

					const user = await User.findByEmail(request.payload.email);

					if (user) {
						throw Boom.conflict('Email already in use.');
					}

					return h.continue;
				}
			}]
		},
		handler: async function (request, h) {

			// create and link account and user documents

			let [account, user] = await Promise.all([
				Account.create(request.payload.name),
				User.create(
					request.payload.username,
					request.payload.password,
					request.payload.email
				)
			]);
			request.payload.id = account._id;
			[account, user] = await Promise.all([
				account.linkUser(`${user._id}`, user.username),
				user.linkAccount(`${account._id}`, account.fullName())
			]);
			// send add confirmation to admin
			const emailOptions = {
				subject: `${request.payload.name} wants to sign up`,
				to: Config.get("/system/toAddress")
			};
			
			try {
				await Mailer.sendEmail(emailOptions, 'signup', request.payload);
			}
			catch (err) {
				request.log(['mailer', 'error'], err);
			}
			/*	
			// send welcome email

			const emailOptions = {
				subject: `Your ${Config.get('/projectName')} account`,
				to: {
					name: request.payload.name,
					address: request.payload.email
				}
			};

			try {
				await Mailer.sendEmail(emailOptions, 'welcome', request.payload);
			}
			catch (err) {
				request.log(['mailer', 'error'], err);
			}

			// create session

			const userAgent = request.headers['user-agent'];
			const ip = request.remoteAddress;
			const session = await Session.create(`${user._id}`, ip, userAgent);

			// create auth header

			const credentials = `${session._id}:${session.key}`;
			const authHeader = `Basic ${new Buffer(credentials).toString('base64')}`;
			*/
			return {
				user: {
					_id: user._id,
					username: user.username,
					email: user.email,
					roles: user.roles
				}
			};
		}
	});
};


module.exports = {
	name: 'api-signup',
	dependencies: [
		'hapi-mongo-models',
		'hapi-remote-address'
	],
	register
};

'use strict';
const Boom = require('boom');
const Admin = require('./models/admin');
const Account = require('./models/account');


class Preware {
	static requirePermission(perms) {
		return {
			assign: 'ensurePermission',
			method: async function (request, h) {

				if (Object.prototype.toString.call(perms) !== '[object Array]') {
					perms = [perms];
				}
				if (request.auth.credentials.roles.admin) {
					const admin = await Admin.findById(request.auth.credentials.roles.admin._id);
					if (!admin) {
                        			throw Boom.badRequest('Credentials are invalid or account is inactive.');
					}
					let permFound = false;	
					for (var i = 0; i < perms.length; i++) {
						let hasPerm = await admin.hasPermissionTo(perms[i]);
						if (hasPerm) {
							permFound = true;
							break;
						}
					}
					if (permFound) {
						return h.continue;
					}
				}
				if (request.auth.credentials.roles.account) {
					const account = await Account.findById(request.auth.credentials.roles.account._id);
					if (!account) {
                        			throw Boom.badRequest('Credentials are invalid or account is inactive.');
					}
					let permFound = false;	
					for (var i = 0; i < perms.length; i++) {
						let hasPerm = await account.hasPermissionTo(perms[i]);
						if (hasPerm) {
							permFound = true;
							break;
						}
					}
					if (permFound) {
						return h.continue;
					}
				}

				throw Boom.forbidden('Missing required permissions.');

				return h.continue;
			}
		};

	}
	static requireAccountGroup(groups) {

		return {
			assign: 'ensureAccountGroup',
			method: function (request, h) {

				if (Object.prototype.toString.call(groups) !== '[object Array]') {
					groups = [groups];
				}

				const account = request.auth.credentials.roles.account;
				const groupFound = groups.some((group) => account.isMemberOf(group));

				if (!groupFound) {
					throw Boom.forbidden('Missing required group membership.');
				}
				return h.continue;
			}
		};
	};
	static requireAdminGroup(groups) {

		return {
			assign: 'ensureAdminGroup',
			method: function (request, h) {
				console.log(request.auth);

				if (Object.prototype.toString.call(groups) !== '[object Array]') {
					groups = [groups];
				}

				const admin = request.auth.credentials.roles.admin;
				const groupFound = groups.some((group) => admin.isMemberOf(group));

				if (!groupFound) {
					throw Boom.forbidden('Missing required group membership.');
				}

				return h.continue;
			}
		};
	};
}


Preware.requireNotRootUser = {
	assign: 'requireNotRootUser',
	method: function (request, h) {

		if (request.auth.credentials.user.username === 'root') {
			throw Boom.forbidden('Not permitted for the root user.');
		}

		return h.continue;
	}
};


module.exports = Preware;

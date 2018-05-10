'use strict';
const AccountGroup = require('../models/account-group');
const Boom = require('boom');
const Joi = require('joi');
const Preware = require('../preware');


const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/api/account-groups',
        options: {
            tags: ['api','account-groups'],
            auth: {
                scope: 'admin'
            },
            validate: {
                query: {
                    sort: Joi.string().default('_id'),
                    limit: Joi.number().default(20),
                    page: Joi.number().default(1)
                }
            },
            pre: [
                Preware.requireAccountGroup('root')
            ]
        },
        handler: async function (request, h) {

            const query = {};
            const limit = request.query.limit;
            const page = request.query.page;
            const options = {
                sort: AccountGroup.sortAdapter(request.query.sort)
            };

            return await AccountGroup.pagedFind(query, limit, page, options);
        }
    });


    server.route({
        method: 'POST',
        path: '/api/account-groups',
        options: {
            tags: ['api','account-groups'],
            auth: {
                scope: 'admin'
            },
            validate: {
                payload: {
                    name: Joi.string().required()
                }
            },
            pre: [
                Preware.requireAccountGroup('root')
            ]
        },
        handler: async function (request, h) {

            return await AccountGroup.create(request.payload.name);
        }
    });


    server.route({
        method: 'GET',
        path: '/api/account-groups/{id}',
        options: {
            tags: ['api','account-groups'],
            auth: {
                scope: 'admin'
            },
            pre: [
                Preware.requireAccountGroup('root')
            ]
        },
        handler: async function (request, h) {

            const accountGroup = await AccountGroup.findById(request.params.id);

            if (!accountGroup) {
                throw Boom.notFound('AccountGroup not found.');
            }

            return accountGroup;
        }
    });


    server.route({
        method: 'PUT',
        path: '/api/account-groups/{id}',
        options: {
            tags: ['api','account-groups'],
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('root')
                },
                payload: {
                    name: Joi.string().required()
                }
            },
            pre: [
                Preware.requireAccountGroup('root')
            ]
        },
        handler: async function (request, h) {

            const id = request.params.id;
            const update = {
                $set: {
                    name: request.payload.name
                }
            };
            const accountGroup = await AccountGroup.findByIdAndUpdate(id, update);

            if (!accountGroup) {
                throw Boom.notFound('AccountGroup not found.');
            }

            return accountGroup;
        }
    });


    server.route({
        method: 'DELETE',
        path: '/api/account-groups/{id}',
        options: {
            tags: ['api','account-groups'],
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('root')
                }
            },
            pre: [
                Preware.requireAccountGroup('root')
            ]
        },
        handler: async function (request, h) {

            const accountGroup = await AccountGroup.findByIdAndDelete(request.params.id);

            if (!accountGroup) {
                throw Boom.notFound('AccountGroup not found.');
            }

            return { message: 'Success.' };
        }
    });


    server.route({
        method: 'PUT',
        path: '/api/account-groups/{id}/permissions',
        options: {
            tags: ['api','account-groups'],
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('root')
                },
                payload: {
                    permissions: Joi.object().required()
                }
            },
            pre: [
                Preware.requireAccountGroup('root')
            ]
        },
        handler: async function (request, h) {

            const id = request.params.id;
            const update = {
                $set: {
                    permissions: request.payload.permissions
                }
            };
            const accountGroup = await AccountGroup.findByIdAndUpdate(id, update);

            if (!accountGroup) {
                throw Boom.notFound('AccountGroup not found.');
            }

            return accountGroup;
        }
    });
};


module.exports = {
    name: 'api-account-groups',
    dependencies: [
        'auth',
    	'hapi-auth-cookie',
        'hapi-mongo-models'
    ],
    register
};

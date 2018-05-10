'use strict';
const Assert = require('assert');
const Joi = require('joi');
const AccountGroup = require('./account-group');
const MongoModels = require('mongo-models');
const NewArray = require('joistick/new-array');
const NewDate = require('joistick/new-date');
const NoteEntry = require('./note-entry');
const StatusEntry = require('./status-entry');


const schema = Joi.object({
    _id: Joi.object(),
    name: Joi.object({
        first: Joi.string().required(),
        middle: Joi.string().allow(''),
        last: Joi.string().allow('')
    }),
    notes: Joi.array().items(NoteEntry.schema)
        .default(NewArray(), 'array of notes'),
    status: Joi.object({
        current: StatusEntry.schema,
        log: Joi.array().items(StatusEntry.schema)
            .default(NewArray(), 'array of statuses')
    }).default(),
    timeCreated: Joi.date().default(NewDate(), 'time of creation'),
    groups: Joi.object().description('{ groupId: name, ... }').default(), 
    user: Joi.object({
        id: Joi.string().required(),
        name: Joi.string().lowercase().required()
    })
});


class Account extends MongoModels {
    static async create(name) {

        Assert.ok(name, 'Missing name argument.');

        const document = new this({
            name: this.nameAdapter(name.trim()),
	    groups: {
		"guest": "guest"
	    }
        });
        const accounts = await this.insertOne(document);

        return accounts[0];
    }

    static findByUsername(username) {

        Assert.ok(username, 'Missing username argument.');

        const query = { 'user.name': username.toLowerCase() };

        return this.findOne(query);
    }

    static nameAdapter(name) {

        Assert.ok(name, 'Missing name argument.');

        const nameParts = name.trim().split(/\s/);

        return {
            first: nameParts.shift(),
            middle: nameParts.length > 1 ? nameParts.shift() : '',
            last: nameParts.join(' ')
        };
    }

    constructor(attrs) {

        super(attrs);

        Object.defineProperty(this, '_groups', {
            writable: true,
            enumerable: false
        });
    }

    isMemberOf(group) {

        Assert.ok(group, 'Missing group argument.');

        return this.groups.hasOwnProperty(group);
    }

    fullName() {

        return `${this.name.first} ${this.name.last}`.trim();
    }
    async convertToUser() {
	const update = {
	    $unset: {
		"groups.guest": true
	    },
	    $set: {
		"groups.user": "user"
	    }
	}

        return await Account.findByIdAndUpdate(this._id, update);
    }
    async linkUser(id, name) {

        Assert.ok(id, 'Missing id argument.');
        Assert.ok(name, 'Missing name argument.');

        const update = {
            $set: {
                user: { id, name }
            }
        };

        return await Account.findByIdAndUpdate(this._id, update);
    }

    async hasPermissionTo(permission) {

        Assert.ok(permission, 'Missing permission argument.');

        if (this.permissions && this.permissions.hasOwnProperty(permission)) {
            return this.permissions[permission];
        }

        await this.hydrateGroups();

        let groupHasPermission = false;

        Object.keys(this._groups).forEach((group) => {

            if (this._groups[group].hasPermissionTo(permission)) {
                groupHasPermission = true;
            }
        });

        return groupHasPermission;
    }

    async hydrateGroups() {

        if (this._groups) {
            return this._groups;
        }

        this._groups = {};

        const groups = await AccountGroup.find({
            _id: {
                $in: Object.keys(this.groups)
            }
        });

        this._groups = groups.reduce((accumulator, group) => {

            accumulator[group._id] = group;

            return accumulator;
        }, {});

        return this._groups;
    }

    async unlinkUser() {

        const update = {
            $unset: {
                user: undefined }
        };

        return await Account.findByIdAndUpdate(this._id, update);
    }
}


Account.collectionName = 'accounts';
Account.schema = schema;
Account.indexes = [
    { key: { 'user.id': 1 } },
    { key: { 'user.name': 1 } }
];


module.exports = Account;

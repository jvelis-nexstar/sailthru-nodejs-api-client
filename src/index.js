#!/usr/bin/env node
const chalk = require('chalk');
const yargs = require('yargs');
const stClient = require('./stclient.js');
const config = require('../config/config.json');
const credentials = require('../config/credentials.json');
const util = require('util');

const options = yargs
	.usage('Usage: $0 [command] [options]')
	.example('$0 -t template -a <account> -f <file.html> -n <name of template>', 'Creates or updates the template using file.html in account 1234')
	.options({
		'type': {
			description: 'template, include or generate',
			type: "string",
			required: false,
			alias: 't',
		},
		'account': {
			description: 'Account to use from the credentials file',
			type: "string",
			required: true,
			alias: 'a',
		},
		'filename': {
			description: 'File to upload. If missing, will print a list of the exisiting templates',
			type: "string",
			alias: 'f'
		},
		'name': {
			description: 'Template name if creating or updating a template. If missing, the first comment in the file will be used as a name',
			type: "string",
			alias: 'n'
		}
	})
	.argv;

const templatesPath = config['templatesPath'];
const includesPath = config['includesPath'];

const filename	= (!options.filename) ? "" : options.filename;
const item_name	= (!options.name) ? "" : options.name;
const type		= (!options.type) ? "template" : options.type;
const path		= (type == "template") ? templatesPath : includesPath;
const account	= options.account;

let api = new stClient;

switch(type) {
	case "template":
		if (!filename) {
			api.getTemplateList(account).then(function(response) {
				response.forEach(l => console.log('    \u2022 ' + l.name));
			});
		} else {
			api.upload(type, account, item_name, path + filename).then(function(response) {
				chalk.green(console.log(response));
			}).catch(function(e) {
				console.error("Error: ", e);
			});
		}
		break;
	case "include":
		if (!filename) {
			api.getIncludeList(account).then(function(response) {
				response.forEach(l => console.log('    \u2022 ' + l.name));
			});
		} else {
			let accounts = [];
			if (account.toLowerCase() == "all") {
				accounts = Object.keys(credentials); // All accounts in credentials
			} else {
				accounts.push(account);
			}
			api.uploadMultiple(0, type, accounts, item_name, path + filename);
		}
		break;
	case "generate":
		api.generateTemplate(account, templatesPath);
		break;
}

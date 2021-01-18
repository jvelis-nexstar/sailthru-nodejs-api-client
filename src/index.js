#!/usr/bin/env node
const yargs = require('yargs');
const sailthru = require('sailthru-client');
const st = require('./sailthru.js');

const credentials = require('../config/credentials.json');
const config = require('../config/config.json');

const templatesPath = config['templatesPath'];
const includesPath = config['includesPath'];

const options = yargs
	.usage('Usage: $0 [command] [options]')
	.example('$0 -t template -a <account> -f <file.html> -n <name of template>', 'Creates or updates the template using file.html in account 1234')
	.options({
		'type': {
			description: 'template or include',
			type: "string",
			required: false,
			alias: 't',
		},
		'account': {
			description: 'Account name to use from the credentials file',
			type: "string",
			required: true,
			alias: 'a',
		},
		'file': {
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

let apiKey, apiSecret;

try {
	apiKey = credentials[options.account]['key'];
	apiSecret = credentials[options.account]['secret'];
} catch {
	console.error("Invalid account identifier");
	process.exit(1);
}

let sAPI = sailthru.createSailthruClient(apiKey, apiSecret);

if (!options.file) {
	st.printList(sAPI, options.type, options.account);
} else {
	const name = (!options.name) ? "" : options.name;
	const path = (options.type == "template") ? templatesPath : includesPath;
	st.upload(sAPI, options.type, options.account, name, path + options.file);
}

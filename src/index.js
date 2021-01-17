#!/usr/bin/env node
const yargs = require('yargs');
const sailthru = require('sailthru-client');
const chalk = require('chalk');
const credentials = require('../config/credentials.json');

const templatesPath = "";
const includesPath = "";

const options = yargs
	.usage('Usage: $0 [command] [options]')
	.example('$0 -t template -a "1234" -file "file.html"', 'Creates or updates the template using file.html in account 1234')
	.options({
		'type': {
			description: 'template or include',
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
		'file': {
			description: 'File to upload. If missing, will print a list of the exisiting templates',
			type: "string",
			alias: 'f'
		}
	})
	.argv;

console.log('\n\nInspecting options');
console.dir(options);

// Get API keys
try {
	var apiKey = credentials[options.account]['key'];
	var apiSecret = credentials[options.account]['secret'];
} catch {
	console.log("Invalid account");
	process.exit(1);
}

var st = sailthru.createSailthruClient(apiKey, apiSecret);

switch(options.type) {
	case "include":
		console.log('List includes');
		st.apiGet('include', {}, function(e, r) {
			if (e) {
				console.log(e);
				return;
			}
			console.log(r);
		});
		break;

	case "template":
		st.getTemplates(function(e,r) {
			if (e) {
				console.log(e);
				return;
			}
			console.log(chalk.blue('List of existing templates in account ' + options.account));
			r["templates"].forEach(function(t) { 
				console.log(t.name) }
			);
		});
		break;

	default:
		console.log("Missing a valid option");
}



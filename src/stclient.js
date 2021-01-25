const fs = require('fs');
const chalk = require('chalk');
const sailthru = require('sailthru-client');
const credentials = require('../config/credentials.json');
const util = require('util');

class sailthruLib {

	/**
	 * Initialize the Sailthru API client
	 *
	 * @param account	string	account
	 * @returns			object	authenticated Sailthru client
	 */
	initClient = (account) => {
		let apiKey, apiSecret, st;
		try {
			apiKey = credentials[account]['key'];
			apiSecret = credentials[account]['secret'];
			st = sailthru.createSailthruClient(apiKey, apiSecret);
		} catch (e) {
			console.error(chalk.red("Init API error: ", e), "- account:", account);
		}
		return st;
	}

	/**
	 * Returns the list of templates in a Sailthru account
	 *
	 * @param account	string	account
	 * @Returns 		promise
	 */
	 getTemplateList = async(account) => {
		return await new Promise((resolve, reject) => {
			const st = this.initClient(account);
			if (st) {
				st.getTemplates((e, response) => {
					if (e) {
						reject(e);
					} else {
						resolve(response["templates"]);
					}
				});
			} else{
				reject("Account not found");
			}
		});
	}

	/**
	 * Returns the list of includes in a Sailthru account
	 *
	 * @param account	string	account
	 * @Returns 		promise
	 */
	 getIncludeList = async(account) => {
		return await new Promise((resolve, reject) => {
			const st = this.initClient(account);
			if (st) {
				st.apiGet('include', {}, function(e, response) {
					if (e) {
						reject(e);
					} else {
						resolve(response["includes"]);
					}
				});
			} else {
				reject("Account not found");
			}
		});
	}

	/**
	 * Write/update templates or includes
	 *
	 * @param type			string	"include" or "template"
	 * @param account		string	account
	 * @param name 			string	name of template/include
	 * @param sourceFile	string	full path to file
	 * @returns 			promise
	 */
	upload = async(type, account, name, sourceFile) => {
		const prom = new Promise((resolve, reject) => {
			const st = this.initClient(account);
			if (!st) {
				reject("Account not found");
			} else {
				let fileContents = "";
				try {
					fileContents = fs.readFileSync(sourceFile, 'UTF-8');
				} catch (e) {
					reject(e);
				}

				if (!name && type == "template") {
					console.log("Getting " + type + " name from file's first line");
					let lines = fileContents.split(/\r?\n/); // split the contents by new line
					name = lines[0].replace("{*", "").replace("*}", "").trim();
				}

				if (name.length == 0) {
					reject("The " + type + " name is missing");
				} else {
					console.log(chalk.yellow("Uploading " + type + ": " + name));
					switch(type) {
						case "template":
							const templateOptions = {
							    content_html: "{* Flexible Content Module include for existing feeds *}\n{include 'CoreModule'}",
							    from_name: account,
							    public_name: name,
							    is_link_tracking: 1,
							    is_google_analytics: 1,
							    subject: '{subject_line}',
							    setup: fileContents
							};
							st.saveTemplate(name, templateOptions, function(e, response) {
								if (e) {
									reject(e);
								} else {
									resolve("Uploaded template " + response.name + " for " + account);
								}
							});
							break;
						case "include":
							const includeOptions = {
								include: name,
							    content_html: fileContents,
							};
							st.apiPost('include', includeOptions, function(e, response) {
								if (e) {
									reject(e);
								} else {
									resolve("Uploaded include " + response.name + " for " + account);
								}
							});
							break;
						default:
							reject("Invalid type parameter");
							break;
					}
				}
			}
		});
		return await prom;
	}

	/**
	 * Write/update an include in multiple accounts
	 *
	 * @param type			string	include
	 * @param accounts		array	accounts
	 * @param name 			string	public name of include
	 * @param sourceFile	string	full path to local include file
	 * @returns 			void
	 */
	uploadMultiple = (offset, type, accounts, item_name, path) => {
		if (accounts[offset]) {
			console.log("------ " + accounts[offset] + "------");
			this.upload(type, accounts[offset], item_name, path)
			.then( r => {
				this.sleep(2000) // delay between API calls
				.then(() => {
					console.log(r);
					return this.uploadMultiple(offset + 1, type, accounts, item_name, path);
				});
			}).catch(e => {
				console.error("Skipping to next...");
				return this.uploadMultiple(offset + 1, type, accounts, item_name, path);
			})
		} else {
			console.log("\n Finished upload process. Total in list: ", accounts.length);
			return;
		}
	}

	/**
	 * Generate a template file with account data using the placeholder file
	 *
	 * @param data		array	account data
	 * @param path		string	dest path to save new template
	 * @returns 		void
	 */
	generateTemplate = (account, path) => {
		const data = credentials[account]['data'];
		const placeholder = "src/template_placeholder.html"
		const fullPath = path + data["account_name"].toLowerCase() + "-daily-news.html";
		let newFileContents = [],
			fileLines = [],
			fileContents = "";
		let st = this.initClient(account);

		console.log(chalk.yellow('Generating a new local template for '+ data["account_name"] ));

		if (fs.existsSync(fullPath)) {
	    	console.error(chalk.red("File already exists: \n" + fullPath));
	    	process.exit(1);
		}

		try {
			fileContents = fs.readFileSync(placeholder, 'UTF-8');
		} catch (e) {
			console.error(e);
			process.exit(1);
		}

		fileLines = fileContents.split(/\r?\n/); // split the contents by new line
		fileLines.forEach(l => {
			let newline = l;
			for(var key in data) {
				newline = newline.replace("{{"+key+"}}", data[key]);
			}
			newFileContents.push(newline);
		});

		fs.writeFile(fullPath, newFileContents.join("\n"), function (e) {
			if (e) return console.log(chalk.red(e));
			console.log(chalk.green("Template file saved: \n" + fullPath));
		});
	}

	/**
	 * Replace the beacon image
	 *
	 * @param st		object	Sailthru API instance
	 * @param account	string	account
	 * @param image		string	path to image file
	 * @returns			-
	 */
	beacon = (account, image) => {
		let st = this.initClient(account);
		console.log(chalk.yellow('Set beacon image for '+ account + ':'));
		const file = fs.createReadStream(image);
		const settingsOptions = {
			"file": file
		}
		st.apiPost('settings', settingsOptions, function(e, response) {
			if (e) {
				console.error(e);
			} else {
				console.dir(response);
			}
		});
	}

	sleep = (ms) => {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

}
module.exports = sailthruLib;

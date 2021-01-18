const fs = require('fs');
const chalk = require('chalk');

/**
 * Print the list of templates or includes in Sailthru
 *
 * @param st		object Sailthru API instance
 * @param type		string "include" or "template"
 * @param account	string account
 * @returns			array
 */
exports.printList = (st, type, account) => {
	console.log(chalk.yellow('List of existing ' + type + 's in Sailthru for '+ account + ':'));
	switch(type) {
		case "include":
			st.apiGet('include', {}, function(e, response) {
				if (e) {
					console.error(e);
				} else {
					response["includes"].forEach(i => console.log('    \u2022 ' + i.name));
				}
			});
			break;
		case "template":
			st.getTemplates(function(e, response) {
				if (e) {
					console.error(e);
				} else {
					response["templates"].forEach(t => console.log('    \u2022 ' + t.name));
				}
			});
			break;
		default:
			return array();
	}
}

/**
 * Write/update templates or includes
 *
 * @param st			object Sailthru API instance
 * @param type			string "include" or "template"
 * @param account		string account 
 * @param name 			string name of template/include
 * @param sourceFile	string full path to file
 * @returns -
 */
exports.upload = (st, type, account, name, sourceFile) => {
	let fileContents = "";

	try {
		fileContents = fs.readFileSync(sourceFile, 'UTF-8');
	} catch (e) {
		console.error(e);
		process.exit(1);
	}

	if (!name && type == "template") {
		console.log("Getting name from file's first line");
		let lines = fileContents.split(/\r?\n/); // split the contents by new line
		name = lines[0].replace("{*", "").replace("*}", "").trim();
	}

	if (name.length == 0) {
		console.error("The " + type + " name is missing");
	} else {
		// Upload to Sailthru
		console.log(chalk.yellow("Uploading " + type + ": \n" + name + "\nfrom: " + sourceFile));

		switch(type) {
			case "template":
				let templateOptions = {
				    content_html: "",
				    from_name: account,
				    public_name: name,
				    is_link_tracking: 1,
				    is_google_analytics: 1,
				    subject: '{subject_line}',
				    setup: fileContents
				}
				st.saveTemplate(name, templateOptions, function(e, response) {
					if (e) {
						console.error(e);
						process.exit(1);
					}
					chalk.green("Template " + name + " uploaded successfully");
				});
				break;
			case "include":
				let includeOptions = {
					include: name,
				    content_html: fileContents,
				}
				st.apiPost('include', includeOptions, function(e, response) {
					if (e) {
						console.error(e);
						process.exit(1);
					}
					chalk.green("Include " + name + " uploaded successfully");
				});
				break;
			default:
				break;
		}
	}
}

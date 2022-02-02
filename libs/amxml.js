import * as DigestFetch from "digest-fetch";
import xml2js from "xml2js";

export default async function amxmlFetch(target, user, passw) {
	try {
		const parser = new xml2js.Parser();
		let xml = null;
		const client = new DigestFetch(user, passw);
		// console.log(client);
		await client
			.fetch(target)
			.then((rsp) => rsp.text())
			.then((data) => {
				// console.log(data)
				parser.parseString(data, function (err, result) {
					if (err) console.log(err);
					// console.log(err);
					xml = result;
				});
			})
			.catch((e) => {
				xml = { error: e };
			});
		//console.log(xml);
		const response = xml;
		// const genericResponse = response.generic[0]['$'];
		return response;
	} catch (error) {
		if (!error.data) {
			error.data = { message: error.message };
		}
		throw error;
	}
}

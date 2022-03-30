import Cors from "cors";
import asterisk from "@libs/knexOrm/asterisk";
import initMiddleware from "@libs/initMiddleware";
import amxmlFetch from "@libs/amxml";
import request from "request";

const cors = Cors({
	methods: ["GET", "POST", "DELETE"],
});

async function handler(req, res) {
	await initMiddleware(req, res, cors);
	switch (req.method) {
		case "GET":
			if (req.headers?.ari_endpoint && req.headers?.ari_channel) {
				const { ari_endpoint, ari_channel } = req.headers;
				const options = { 
					method: 'GET',
					url: 'https://'+ process.env.DB_HOST +':8089/ari/endpoints/'+ ari_channel +'/'+ ari_endpoint +'',
					qs: { api_key: 'asterisk:4st3r1sk' }
				};
		
				request(options, function (error, response, body) {
					if (error) {
						res.status(500).send({ response: "fail", message: error });
					}
					const bodyresp = JSON.parse(body);
					if (!bodyresp.message) {
						res.status(200).send({ response: "ok", result: { endpoint: bodyresp.resource, is_online: bodyresp.state === "online" } });
					} else {
						res.status(200).send({ response: "ok", ...bodyresp })
					}
				});
			} else {
				const options = { 
					method: 'GET',
					url: 'https://'+ process.env.DB_HOST +':8089/ari/endpoints',
					qs: { api_key: 'asterisk:4ster1sk' }
				};
		
				request(options, function (error, response, body) {
					if (error) {
						res.status(500).send({ response: "fail", message: error });
					}
					const bodyresp = JSON.parse(body);
					console.log(bodyresp)
					res.send("ok");
					// res.status(200).send({ response: "ok", result: bodyresp?.map(e => ({ endpoint: e.resource, is_online: e.state === "online" })) });
				});
			}
			break;
		default:
			res.status(405).send("Method not allowed");
			break;
	}
}

export const config = {
	api: {
		externalResolver: true,
		bodyParser: {
			sizeLimit: "100mb",
		},
	},
};

export default handler;

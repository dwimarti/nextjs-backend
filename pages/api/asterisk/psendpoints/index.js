import Cors from "cors";
import asterisk from "@libs/knexOrm/asterisk";
import initMiddleware from "@libs/initMiddleware";
import amxmlFetch from "@libs/amxml";

export const getpjsipendpoints = async () => {
	try {
		let listendpoints = [];
		const target = `https://${process.env.DB_HOST}:8089/amxml?action=pjsipshowendpoints`;
		const request = await amxmlFetch(target, "client", "cleint123");
		const response = request["ajax-response"]["response"];
		for (let i = 1; i < response.length; i++) {
			listendpoints.push(response[i]["generic"][0]["$"]);
		}
		return listendpoints;
	} catch (error) {
		throw error;
	}
};

const cors = Cors({
	methods: ["GET", "POST", "DELETE"],
});

async function handler(req, res) {
	await initMiddleware(req, res, cors);
	switch (req.method) {
		case "GET":
			asterisk
				.select(
					"id",
					"aors",
					"auth",
					"allow",
					"dtmf_mode",
					"use_avpf",
					"media_encryption",
					"dtls_verify",
					"dtls_cert_file",
					"dtls_ca_file",
					"dtls_setup",
					"rtcp_mux"
				)
				.from("ps_endpoints")
				.then((data) => {
					res.status(200).json({ message: "ok", data });
				})
				.catch((err) => {
					res.status(500).json({ message: "error", details: err });
				});
			break;
		case "POST":
			getpjsipendpoints()
				.then((data) => {
					// console.log(data)
					res
						.status(200)
						.json(
							data.filter(
								(e) =>
									e.devicestate !== "Unavailable" && e.event === "EndpointList"
							)
						);
				})
				.catch((error) => res.status(200).send(error));
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

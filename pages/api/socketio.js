import { Server } from "socket.io";
import siofu from "socketio-file-upload";
import asterisk from "@libs/knexOrm/asterisk";
import cors from "cors";
import initMiddleware from "@libs/initMiddleware";
import amxmlFetch from "@libs/amxml";

const Cors = cors({
	methods: ["GET", "POST"]
})

export const getQueueMember = async ({ queueName }) => {
	try {
		let listQueue = [];
		const target = "http://"+ process.env.DB_HOST +":8088/amxml?action=queuestatus";
		const request = await amxmlFetch(target, "client", "cleint123");
		const response = request["ajax-response"]["response"];
		for (let i = 1; i < response.length; i++) {
			listQueue.push(response[i].generic[0]["$"]);
		}
		const kycQueue = listQueue.filter(
			(e) =>
				e.queue === queueName && e.event === "QueueMember" && e.status === "1" || e.status === "6"
		);
		if (kycQueue.length > 0) {
			return { message: "agents available", data: kycQueue }
		} else {
			return { message: "no agents available", data: [] }
		}
	} catch (error) {
		return { message: error, data: [] }
	}
} 

async function IoHandler(req, res) {
	await initMiddleware(req, res, Cors)
	if (!res.socket.server.io) {
		console.log("*First use, starting socket.io");
		let chat = [];
		const io = new Server(res.socket.server, { 
			cors: {
				methods: ["GET", "POST"],
				origin: "*"
			} 
		});

		io.on("connection", (socket) => {
			let previousId;

			const uploader = new siofu();
			uploader.dir = process.env.VIDEO_DIR;
			uploader.listen(socket);

			uploader.on("progress", function (event) {
				socket.emit("upload.progress", {
					percentage: parseInt((event.file.bytesLoaded / event.file.size) * 100),
				});
			});

			uploader.on("complete", function (e) {
				socket.emit("upload.done", e.file)
			})

			uploader.on("error", e => {
				socket.emit("upload.error", e.message)
			})

			socket.on("start", () => {
				socket.emit("start", "halo ler")
			})

			socket.on("queue", () => {
				let interval;
				interval = setInterval(async () => {
					const result = await getQueueMember({queueName: "kyc"})
					socket.emit("queue", result)
				}, 1000);

				setTimeout(async () => {
					clearInterval(interval)
					const result = await getQueueMember({queueName: "kyc"})
					if (result.data.length <= 0) {
						socket.emit("queue", { message: "no agents available, please try again next time"})
					} else {
						socket.emit("queue", { message: "agent available"})
					}
				}, 29000);
			})

			// socket.on("agentlist", function () {
			// 	setInterval(() => {
			// 		asterisk
			// 			.select("username", "status", "websocket")
			// 			.from("users")
			// 			.where({ role: "1" })
			// 			.orderBy("username")
			// 			.then((data) => {
			// 				socket.emit("agentlist", data);
			// 			})
			// 			.catch((err) => {
			// 				socket.emit("agentlist", err.message);
			// 			});
			// 	}, 1000);
			// });

			const session = req.body.src;
			socket.broadcast.emit("a user connected ", req.body.src);
			socket.on(session, (data) => {
				socket.emit(session, `Hallo ${session} u send ${data}`);
			});
			socket.on('disconnect', function() {
        console.log('socket disconnect');
    });
		});

		res.socket.server.io = io;
	} else {
		console.log("*already start socket.io");
	}
	res.end();
}

export const config = {
	api: {
		bodyParser: {
			sizeLimit: "100mb",
		},
	},
};

export default IoHandler;

import { Server } from "socket.io";
import siofu from "socketio-file-upload";
import asterisk from "@libs/knexOrm/asterisk";
import cors from "cors";
import initMiddleware from "@libs/initMiddleware";

const Cors = cors({
	methods: ["GET", "POST"]
})

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
			uploader.dir = `${process.cwd()}/files`;
			uploader.listen(socket);

			uploader.on("progress", function (event) {
				socket.emit("upload.progress", {
					percentage: (event.file.bytesLoaded / event.file.size) * 100,
				});
			});

			uploader.on("error", e => {
				socket.emit("upload.error", e.message)
			})

			const safeJoin = (currentId) => {
				socket.leave(previousId);
				socket.join(currentId, () =>
					console.log(`Socket ${socket.id} joined room ${currentId}`)
				);
				previousId = currentId;
			};

			socket.on("joinRoom", (idRoom) => {
				safeJoin(idRoom);
				const finder = chat.find((e) => e.id === idRoom);
				if (finder) {
					socket.emit("joinRoom", finder);
				} else {
					chat.push({ id: idRoom, content: [] });
					socket.emit(
						"joinRoom",
						chat.find((e) => e.id === idRoom)
					);
				}
			});

			socket.on("sendChat", (data) => {
				safeJoin(data.id);
				const finder = chat.find((e) => e.id === data.id);
				finder.content.push(data.content);
				io.emit("allChat", chat);
				socket.emit("chatBroadcast", finder);
			});

			socket.on("agentlist", function () {
				setInterval(() => {
					asterisk
						.select("username", "status", "websocket")
						.from("users")
						.where({ role: "1" })
						.orderBy("username")
						.then((data) => {
							socket.emit("agentlist", data);
						})
						.catch((err) => {
							socket.emit("agentlist", err.message);
						});
				}, 1000);
			});

			socket.on("login", (data) => {
				safeJoin(data.id);
				console.log(data);
				socket.emit("login", data);
			});

			const session = req.body.src;
			socket.broadcast.emit("a user connected ", req.body.src);
			socket.on(session, (data) => {
				socket.emit(session, `Hallo ${session} u send ${data}`);
			});
			socket.on("hello", (msg) => {
				setInterval(() => {
					socket.emit("hello", `mate, now ${new Date().toLocaleTimeString()}`);
				}, 1000);
			});
			socket.on("chat", (data) => {
				socket.emit("chat", data);
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
			sizeLimit: "1mb",
		},
	},
};

export default IoHandler;

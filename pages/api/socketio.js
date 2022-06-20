import { Server } from "socket.io";
import siofu from "socketio-file-upload";
import asterisk from "@libs/knexOrm/asterisk";
import cors from "cors";
import { exec } from "child_process";
import initMiddleware from "@libs/initMiddleware";
import amxmlFetch from "@libs/amxml";

const Cors = cors({
	methods: ["GET", "POST"]
})

export const getQueueMember = async ({ queueName }) => {
	try {
		let listQueue = [];
		const target = "https://"+ process.env.DB_HOST +":8089/amxml?action=queuestatus";
		console.log(target);
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
		console.log("*first use, starting socket.io");

		const io = new Server(res.socket.server, { 
			cors: {
				methods: ["GET", "POST"],
				origin: "*"
			} 
		});
		//aux-namespace
		var aux = io.of('/aux');
		aux.on('connection', (auxSocket) => {
			let extensions;
			let status;
			extensions = auxSocket.handshake.query['extension'];
			status = auxSocket.handshake.query['status'];
			console.log("[aux][starting] socket.id : "+ auxSocket.id + " extension : "+ extensions  +" status : "+ status)
			//insert-when-handshake
			if(extensions!=null & status!=null){
				insertToActivity(status, extensions, auxSocket.id);
			}

			auxSocket.on("statusEmit", msg => {
				//update-for-disconnect
				extensions = msg.extension;
				status = msg.status;
				//insert-when-emit-or-changes
				insertToActivity(msg.status, msg.extension, auxSocket.id);

				console.log("[aux][statusEmit] socket.id : "+ auxSocket.id + " extension : "+ msg.extension +" status : "+ msg.status)
	 			auxSocket.emit("statusReceived", { 
					status: msg.status,
					extension: msg.extension
				});
			})
			
			auxSocket.on('disconnect', function() {
				console.log('[aux] socket disconnect');
				console.log('[aux] update last history from socket.id : ' + auxSocket.id + ' & extensions :' + extensions );
				if(extensions!=null & status!=null){
					//update-when-disconnect
					asterisk('agent_activity').update({
						date_end : asterisk.fn.now(),
						duration: asterisk.raw("date_trunc('second', ?? - ??)",[asterisk.fn.now(), asterisk.ref('date_begin')]),
						last_event: 'socket'
					}).where('agent_status_id', status)
					.andWhere('extension', extensions)
					.andWhere('socket_id', auxSocket.id)
					.then( function (result) {
						console.log(result);
					})
					.catch(err => {
						console.log(err);
					})
				}
			});
		});

			
		io.on("connection", (socket) => {
			console.log("[uploader & queue], starting... ");
			
			const uploader = new siofu();
			uploader.dir = process.env.VIDEO_DIR;
			uploader.listen(socket);
			
			uploader.on("start", function (event) {
				console.log("[uploader], upload start... ");
			});

			uploader.on("progress", function (event) {
				socket.emit("upload.progress", {
					percentage: parseInt((event.file.bytesLoaded / event.file.size) * 100),
				});
			});

			uploader.on("complete", function (e) {
				socket.emit("upload.done", e.file)
				//add bash converter
				console.log("============================================");
				console.log("Codec Checker Running");
				console.log("============================================");
				console.log("path : " + process.env.VIDEO_DIR);
				console.log("filename : "+e.file.name);
				console.log("============================================");
				
				exec(`bash ${process.cwd()}/converter ${process.env.VIDEO_DIR} ${e.file.name} agent`,
					(err, stdout, stderr) => {
						if (err) console.log(err);
						if (stderr) console.log(stderr);
						console.log(stdout);
					}
				);
			})

			uploader.on("error", e => {
				socket.emit("upload.error", e.message)
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
	
			socket.on('disconnect', function() {
				console.log('[uploader & queue] socket disconnect');
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

const insertToActivity = (e_status, e_extension, e_id) => {
	asterisk('agent_activity').insert({
		agent_status_id: e_status,
		extension:e_extension,
		date_begin:asterisk.fn.now(),
		socket_id: e_id
		})
	.then( function (result) {
		console.log(result);
	})
	.catch(err => {
		console.log(err);
	})
}

export default IoHandler;

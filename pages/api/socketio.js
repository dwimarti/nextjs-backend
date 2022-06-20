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
				updateLatestIfNullOnAgentActivity(extensions);
				insertToActivity(status, extensions, auxSocket.id, 'insert handshake');
			}

			auxSocket.on("statusEmit", msg => {
				//update-for-disconnect
				extensions = msg.extension;
				status = msg.status;
				//insert-when-emit-or-changes
				insertToActivity(msg.status, msg.extension, auxSocket.id, 'insert emit');

				console.log("[aux][statusEmit] socket.id : "+ auxSocket.id + " extension : "+ msg.extension +" status : "+ msg.status)
	 			auxSocket.emit("statusReceived", { 
					status: msg.status,
					extension: msg.extension
				});
			})

			auxSocket.on("disconnectEmit", msg => {
				console.log('[aux][emit][logout] socket disconnect emit');
				if(extensions!=null & status!=null){
					//update-when-disconnect-logout
					asterisk('agent_activity').update({
						date_end : asterisk.fn.now(),
						duration: asterisk.raw("date_trunc('second', ?? - ??)",[asterisk.fn.now(), asterisk.ref('date_begin')]),
						last_event_socket: asterisk.raw("concat( ?? , ' -> update on logout')", asterisk.ref('last_event_socket')),
						logout:true
					}).where('agent_status_id', status)
					.andWhere('extension', extensions)
					.andWhere('date_end', null)
					.then( function (result) {
						console.log(result);
					})
					.catch(err => {
						console.log(err);
					})

					extensions=null;
					status=null;
				}
				auxSocket.disconnect();
			});
			
			auxSocket.on('disconnect', function() {
				console.log('[aux] socket disconnect');

				if(extensions!=null & status!=null){
					console.log('[aux] update last history from socket.id : ' + auxSocket.id + ' & extensions :' + extensions );
					//update-when-disconnect
					asterisk('agent_activity').update({
						date_end : asterisk.fn.now(),
						duration: asterisk.raw("date_trunc('second', ?? - ??)",[asterisk.fn.now(), asterisk.ref('date_begin')]),
						last_event_socket: asterisk.raw("concat( ?? , ' -> update on disconnect')", asterisk.ref('last_event_socket'))
					}).where('agent_status_id', status)
					.andWhere('extension', extensions)
					.andWhere('date_end', null)
					.then( function (result) {
						console.log(result);
					})
					.catch(err => {
						console.log(err);
					})
				}else{
					console.log('[aux] user already logged out');
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

const insertToActivity = (e_status, e_extension, e_id, event) => {
	asterisk('agent_activity').insert({
		agent_status_id: e_status,
		extension:e_extension,
		date_begin:asterisk.fn.now(),
		socket_id: e_id,
		last_event_socket: event
		})
	.then( function (result) {
		console.log(result);
	})
	.catch(err => {
		console.log(err);
	})
}

const updateLatestIfNullOnAgentActivity = (e_extension) => {
	asterisk('agent_activity').update({
		date_end : asterisk.fn.now(),
		duration: asterisk.raw("date_trunc('second', ?? - ??)", [asterisk.fn.now(), asterisk.ref('date_begin')]),
		last_event_socket: asterisk.raw("concat( ?? , ' -> update on null')", asterisk.ref('last_event_socket')),
		update_on_null: true
	}).where('extension', e_extension)
	.andWhere('date_end', null)
	.then( function (result) {
		console.log(result);
	})
	.catch(err => {
		console.log(err);
	})
}

export default IoHandler;

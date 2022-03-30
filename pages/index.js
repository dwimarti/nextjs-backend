import { useEffect, useState, memo } from "react";
import SocketIOFileUpload from "socketio-file-upload";
import { v1 } from "uuid";
import io from "socket.io-client";
import styles from "@styles/Home.module.css";

export default memo(function Home() {
	const [pushsocket, setpushsocket] = useState();
	const [val, setval] = useState("");
	const [chat, setChat] = useState("");
	const [chatArr, setchatArr] = useState([]);
	const [agentlist, setagentlist] = useState([]);
	const [progress, setprogress] = useState();
	const [word, setWord] = useState("");
	const [wordBroad, setWordBroad] = useState("");
	
	useEffect(() => {
		fetch("/api/socketio", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			}
		}).finally(() => {
			const socket = io()
			setpushsocket(socket);
			socket.on("connect", () => {
				console.log("socket connected", socket.id);
				// socket.emit("queue")
			})
			socket.on("broadcastText", data => {
				console.log("broadcast event: ", data);
			})
			socket.on("emitText", data => {
				console.log("emit Event: ", data)
			})
			socket.on("queue", data => {
				console.log(data)
			})
			socket.on("disconnect", () => {
				console.log("socket disconnected")
			})
			// setTimeout(() => {
			// 	socket.disconnect()
			// }, [6000])
		})
	}, []);

	return (
		<div className={styles.container}>
			<pre className={styles.pre}>Hello, welcome to NextJS</pre>
			<input 
				defaultValue={wordBroad} 
				onChange={e => setWordBroad(e.target.value)} 
				type="text" 
				placeholder="some word"
			/>
			<button onClick={() => {
				pushsocket.emit("textReceiveBroad", wordBroad);
			}}>Send broadcast</button>
			<input 
				defaultValue={word} 
				onChange={e => setWord(e.target.value)} 
				type="text" 
				placeholder="some word"
			/>
			<button onClick={() => {
				pushsocket.emit("textReceive", word);
			}}>Send emit</button>
		</div>
	);
});

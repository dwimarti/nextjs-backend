import cors from "cors";
import initMiddleware from "@libs/initMiddleware";
import authorization from "@libs/authorization";
import amxmlFetch from "@libs/amxml";

const Cors = cors({
	methods: ["GET", "POST"]
    //origin: 'https://e-verify.alpabit.com:3005'
})

async function queuestatusChecker(req, res) {
    await initMiddleware(req, res, Cors)
    //if(authorization(req.headers.authorization, res)) return;
    const { customerExtMin, customerExtMax } = req.body;

    console.log("============================================");
	console.log("Queue Status Checker Running");
    console.log("============================================");
    //check-Queue
    if(customerExtMin==null || customerExtMax == null) {
        res.status(200).send({ 
            response : "success",
            message : "customerExtMin/Max not set"
        })
        return;
    }
 
    try {
        //get-agent-info
        let listQueueAgent = await getAmxml(process.env.DB_HOST, "queuestatus");
        //cleaning-atau-bersih2
        listQueueAgent.filter(e => {
            if (e.queue === "kyc" && e.event === "QueueMember" && e.status === "1") {
                const _extension = e.name.split('/');
                e.name = _extension[1];
            }
        });

        listQueueAgent.filter(e => {
            if (e.queue === "kyc" && e.event === "QueueEntry" && e.connectedlinenum === "unknown") {
                const _extension = e.calleridnum.split('*');
                e.calleridnum = _extension[0];
            }
        });

        const kycAgentIdleList = listQueueAgent.filter(
			(e) =>
                e.queue === "kyc" && e.event === "QueueMember" && e.status === "1"
		);

        const kycAgentRingingList = listQueueAgent.filter(
			(e) =>
                e.queue === "kyc" && e.event === "QueueMember" && e.status === "6"
		);
        const kycAgentIncallList = listQueueAgent.filter(
			(e) =>
                e.queue === "kyc" && e.event === "QueueMember" && e.status === "2"
		);

        const kycAgentOnHoldList = listQueueAgent.filter(
			(e) =>
                e.queue === "kyc" && e.event === "QueueMember" && e.status === "8"
		);

        const kycOnQueueRingingList = listQueueAgent.filter(
			(e) =>
                e.queue === "kyc" && e.event === "QueueEntry" && e.connectedlinenum != "unknown"
		);

        const kycOnQueueList = listQueueAgent.filter(
			(e) =>
                e.queue === "kyc" && e.event === "QueueEntry" && e.connectedlinenum === "unknown"
		);

        res.status(200).send({ 
            response : "success",
            summary : {
                onlineAgent : {
                    total : kycAgentIdleList.length + kycAgentRingingList.length + kycAgentIncallList.length + kycAgentOnHoldList.length,
                    details : {
                        idle : {
                            total : kycAgentIdleList.length,
                            list : kycAgentIdleList
                        },
                        ringing : {
                            total : kycAgentRingingList.length,
                            list : kycAgentRingingList
                        },
                        incall : {
                            total : kycAgentIncallList.length,
                            list : kycAgentIncallList
                        },
                        holdByCustomer : {
                            total : kycAgentOnHoldList.length,
                            list : kycAgentOnHoldList
                        }
                    },
                onlineCustomer :  {
                            inCall : {
                                total : kycAgentIncallList.length,
                            },
                            inQueue : {
                                total : kycOnQueueList.length,
                                list : kycOnQueueList
                            },
                            customerRinging : {
                                total : kycOnQueueRingingList.length,
                                list : kycOnQueueRingingList
                            }
                        },
                    },
                    customerRange : {
                        min : customerExtMin,
                        max : customerExtMax
                    }
            },
        })    
	} catch (error) {
        res.status(200).send({ 
            response : "error",
            message : error.message,
        })    
	}
}

async function getAmxml(_host, _action) {
    let listQueue = [];
    const target = "https://"+ _host +":8089/amxml?action=" + _action;
    console.log(target);
    const request = await amxmlFetch(target, "client", "cleint123");
    const response = request["ajax-response"]["response"];
    for (let i = 1; i < response.length; i++) {
        listQueue.push(response[i].generic[0]["$"]);
    }
    return listQueue;
}

export default queuestatusChecker;

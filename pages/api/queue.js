import cors from "cors";
import initMiddleware from "@libs/initMiddleware";
import authorization from "@libs/authorization";
import amxmlFetch from "@libs/amxml";

const Cors = cors({
	methods: ["GET", "POST"]
    //origin: 'https://e-verify.alpabit.com:3005'
})

async function queueChecker(req, res) {
    await initMiddleware(req, res, Cors)
    //if(authorization(req.headers.authorization, res)) return;
    const { customerExtMin, customerExtMax } = req.body;

    console.log("============================================");
	console.log("Queue Checker Running");
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
        let listQueue = await getAmxml(process.env.DB_HOST, "pjsipshowendpoints");

		const kycList = listQueue.filter(
			(e) =>
				e.event === "EndpointList"
		);
        const kycQueue = listQueue.filter(
			(e) =>
				e.event === "EndpointList" && (e.devicestate === "Not in use" || e.devicestate === "In use" || e.devicestate === "On Hold")
		);

        const kycCustomerQueueInUse = listQueue.filter(
			(e) =>
                (parseInt(e.objectname)>customerExtMin && parseInt(e.objectname)<customerExtMax) && e.event === "EndpointList" && e.devicestate === "In use"
		);

        const kycCustomerQueueNotInUse = listQueue.filter(
			(e) =>
                (parseInt(e.objectname)>customerExtMin && parseInt(e.objectname)<customerExtMax) &&e.event === "EndpointList" && e.devicestate === "Not in use"
		);

        const kycCustomerQueueOnHold = listQueue.filter(
			(e) =>
                (parseInt(e.objectname)>customerExtMin && parseInt(e.objectname)<customerExtMax) &&e.event === "EndpointList" && e.devicestate === "On Hold"
		);

        //get-agent-info
        let listQueueAgent = await getAmxml(process.env.DB_HOST, "queuestatus");

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

		if (kycQueue.length > 0) {
            res.status(200).send({ 
                response : "success",
                summary : {
                    numberOfExtensions : kycList.length,
                    onlineAgent : {
                        total : kycAgentIdleList.length + kycAgentRingingList.length + kycAgentIncallList.length + kycAgentOnHoldList.length,
                        details : {
                            idle : kycAgentIdleList.length,
                            ringing : kycAgentRingingList.length,
                            incall : kycAgentIncallList.length,
                            holdByCustomer :  kycAgentOnHoldList.length
                        },
                        onHoldByAgent : kycCustomerQueueOnHold.length,
                    },
                    customer : {
                        online : {
                            total : kycCustomerQueueInUse.length + kycCustomerQueueNotInUse.length + kycCustomerQueueOnHold.length,
                            details : {
                                notInUse : kycCustomerQueueNotInUse.length,
                                inUse : kycCustomerQueueInUse.length,
                                onHold : kycCustomerQueueOnHold.length
                            }
                        },
                        connect :  {
                            total : kycCustomerQueueInUse.length + kycCustomerQueueOnHold.length,
                            details : {
                                inCall : kycAgentIncallList.length,
                                inQueueV1 : ((kycCustomerQueueInUse.length + kycCustomerQueueOnHold.length) - kycAgentRingingList.length) - kycAgentIncallList.length,
                                inQueueV2 : kycOnQueueList.length,
                                ringingV1 : kycAgentRingingList.length,
                                ringingV2 : kycOnQueueRingingList.length
                            },
                        }
                    },
                    customerRange : {
                        min : customerExtMin,
                        max : customerExtMax
                    }
                },
                data :{
                    total : kycList.length,
                    extensionsOnline :{
                        total : kycQueue.length,
                        list : kycQueue
                    },
                    customerOnline :{
                        total : kycCustomerQueueInUse.length + kycCustomerQueueNotInUse.length,
                        InUse : {
                            total : kycCustomerQueueInUse.length,
                            list : kycCustomerQueueInUse
                        },
                        notInUse : {
                            total : kycCustomerQueueNotInUse.length,
                            list : kycCustomerQueueNotInUse
                        },
                        onHold : {
                            total : kycCustomerQueueOnHold.length,
                            list : kycCustomerQueueOnHold
                        },
                        ringingV2 : {
                            total : kycOnQueueRingingList.length,
                            list : kycOnQueueRingingList
                        },
                        inQueueV2 : {
                            total : kycOnQueueList.length,
                            list : kycOnQueueList
                        }
                    }, 
                    agentOnline :{
                        total : kycAgentIdleList.length + kycAgentRingingList.length + kycAgentIncallList.length,
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
                        },
                        holdByAgent : {
                            total : kycCustomerQueueOnHold.length,
                            list : kycCustomerQueueOnHold
                        }
                    }
                },
            })    
		} else {
            res.status(200).send({ 
                response : "success",
                data :{ 
                    message : "no extensions found",
                    numberOfExtensions : kycList.length,
                    kycQueueLength : kycQueue.length
                    }
            })    
		}
	} catch (error) {
        res.status(200).send({ 
            response : "error",
            message : error.message,
        })    
	}
    // res.end();
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

export default queueChecker;

import Cors from "cors";
import asterisk from "@libs/knexOrm/asterisk";
import initMiddleware from "@libs/initMiddleware";
import { getQueueMember } from "@pages/api/socketio";

const cors = Cors({
  methods: [ "GET", "POST", "DELETE" ]
})

async function handler(req, res) { 
  await initMiddleware(req, res, cors)

  switch (req.method) {
    case "GET":
      asterisk.select().from("queue_members")
        .then(data => {
          if (data.length > 0) {
            res.status(200).json({ message: "ok", data })
          } else {
            res.status(404).json({ message: "not found" })
          }
        })
        .catch(err => {
          res.status(500).json({ message: "error", details: err })
        })
      break;
    case "POST":
      getQueueMember({ queueName: "kyc" })
        .then(result => {
          res.status(200).json({ message: "ok", data: result?.data });
        })
        .catch(err => {
          res.status(200).json({ message: "err", details: err });
        })
      break;
    default:
      res.status(405).send("Method not allowed")
      break;
  }
}

export const config = {
  api: {
    externalResolver: true
  }
}

export default handler;
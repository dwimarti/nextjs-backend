import Cors from "cors";
import kyc from "@libs/knexOrm/kyc";
import initMiddleware from "@libs/initMiddleware";

const cors = Cors({
  methods: [ "GET", "POST", "DELETE" ]
})

async function handler(req, res) {
  await initMiddleware(req, res, cors)
  switch (req.method) {
    case "GET":
      kyc.select("*").from("call")
        .then(data => {
          res.status(200).json({ message: "ok", data })
        })
        .catch(err => {
          res.status(500).json({ message: "error", details: err })
        })
      break;
  
    default:
      res.status(405).send("Method not allowed")
      break;
  }
}

export default handler;
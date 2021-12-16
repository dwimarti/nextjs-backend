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
      const { id } = req.query;
      kyc.select("*").from("application").where({id})
        .then(data => {
          if (data.length > 0) {
            res.status(200).json({ message: "ok", data: data[0] })
          } else {
            res.status(404).json({ message: "not found" })
          }
        })
        .catch(err => {
          res.status(500).json({ message: "error", details: err })
        })
      break;
    
    case "POST":
      res.status(200).send(req.body)
      break;
    default:
      res.status(405).send("Method not allowed")
      break;
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default handler;
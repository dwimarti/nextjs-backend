import Cors from "cors";
import knex from "../../../libs/knex";
import initMiddleware from "../../../libs/initMiddleware";

const cors = Cors({
  methods: [ "GET", "POST", "DELETE" ]
})

async function handler(req, res) {
  await initMiddleware(req, res, cors)
  switch (req.method) {
    case "GET":
      knex.select("username", "password").from("ps_auths").limit(10)
      .then(data => {
        res.status(200).json({ message: "ok", data })
      })
      .catch(err => {
        res.status(500).json({ message: "error", details: err })
      })
      break;
  
    default:
      res.end("Hello");
      break;
  }
}

export default handler

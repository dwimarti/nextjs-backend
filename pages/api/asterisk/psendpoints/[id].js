import Cors from "cors";
import asterisk from "@libs/knexOrm/asterisk";
import initMiddleware from "@libs/initMiddleware";

const cors = Cors({
  methods: [ "GET", "POST", "DELETE" ]
})

async function handler(req, res) {
  await initMiddleware(req, res, cors)
  switch (req.method) {
    case "GET":
      const { id } = req.query;
      asterisk
        .select("id", "aors", "auth", "allow", "dtmf_mode", "use_avpf", "media_encryption", "dtls_verify", "dtls_cert_file", "dtls_ca_file", "dtls_setup", "rtcp_mux")
        .from("ps_endpoints").where({aors: id})
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
  
    default:
      res.status(405).send("Method not allowed")
      break;
  }
}

export default handler;
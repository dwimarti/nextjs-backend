import cors from "cors";
import initMiddleware from "@libs/initMiddleware";
import fs from "fs";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import { exec } from "child_process";
import authorization from "@libs/authorization";

const Cors = cors({
	methods: ["GET", "POST"]
})

async function convert(req, res) {
    await initMiddleware(req, res, Cors)
    if(authorization(req.headers.authorization, res)) return;

    const { filename} = req.body;
    console.log("============================================");
	  console.log("Standalone Converter Running");
    console.log("============================================");
    console.log("filename : " + filename);
    console.log("path+filename : "+process.env.VIDEO_DIR+filename);
    console.log("============================================");

    //check-file
    if (!fs.existsSync(process.env.VIDEO_DIR+filename)) {
    res.status(200).json({
      status: 0,
      message: "file not exists",
    });
    return;
    } 
    
    //check-codec
    try {
      ffprobe(process.env.VIDEO_DIR+filename , { path: ffprobeStatic.path }, function (err, info) {
      if (err) {
          //console.log(err);
          res.status(200).send({ 
              response : "failed",
              data :{ 
              status : err.message
              }
          })
          return;
      } else {
          //console.log(info);
          if(info.streams[0].codec_type==='video') {
            var codec_video = info.streams[0].codec_name;
          } else {
            var codec_video = info.streams[1].codec_name;
          }
      }

      //check-if-already-converted
      if(codec_video=="h264"){
        console.log(filename + " video already converted");
        res.status(200).json({
            status: 1,
            message: "video already converted",
            codec_video: codec_video,
        });
        return;
      } else {
        //convert-process
        exec(`bash ${process.cwd()}/doCheck ${process.env.VIDEO_DIR}${filename}`,
            (error, stdout, stderr) => {
            if (error) console.log(error);
            if (stderr) console.log(stderr);
            //count = stdout.replace("\n", "")
	          console.log("stdout");
            console.log(stdout.length);
   
            if(stdout.length>0) {
              console.log(filename + " convert-in-progress");
              res.json({
                status: 0,
                message: "converting in progress.... please check back later, ",
              });
              return;
            }else{
              console.log(filename + "convert-process");
                    doConvertVideo(process.env.VIDEO_DIR, filename);
                    res.status(200).json({
                      status: 0,
                      message: "conversion command is executed, please check back later,"
                  });
              return;
            }
            })
      }
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
}

const doConvertVideo = async (asteriskDir, filename) => {
  console.log(await doConvertAsync(asteriskDir, filename));
}

const doConvertAsync = (asteriskDir ,filename) => {
  return new Promise( resolve => 
  {
    console.log("convert async");
    exec(`bash ${process.cwd()}/converter ${asteriskDir} ${filename} spv`,
    (error, stdout, stderr) => {
      if (error) {
        console.log(error);
        resolve(error.message)
      }
      if (stderr) {
        console.log(stderr);
        resolve("convert " + filename +" done")
      }
    }
  );
  })
}

export default convert;

import cors from "cors";
import initMiddleware from "@libs/initMiddleware";
import fs from "fs";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";

const Cors = cors({
	methods: ["GET", "POST"]
})

async function codecChecker(req, res) {
    await initMiddleware(req, res, Cors)
    const { filename} = req.body;
    console.log("============================================");
	console.log("Codec Checker Running");
    console.log("============================================");
    console.log("filename : " + filename);
    console.log("path+filename : "+process.env.VIDEO_DIR+filename);
    console.log("============================================");
    //check-file
    if (!fs.existsSync(process.env.VIDEO_DIR+filename)) {
        res.status(404).json({
        status: 0,
        message: "file not exists",
        filename: filename,
        });
        return;
    } 
    
	try {
        ffprobe(process.env.VIDEO_DIR + filename , { path: ffprobeStatic.path }, function (err, info) {
        if (err) {
            console.log(err);
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
            var codec_audio = info.streams[1].codec_name;
            var codec_video = info.streams[0].codec_name;
          } else {
            var codec_audio = info.streams[0].codec_name;
    
            if(info.streams[1]==null){
              var codec_video = "video codec not found";
            }else{
              var codec_video = info.streams[1].codec_name;
            }
          }
         
          res.status(200).send({ 
              response : "success",
              data :{ 
                  video :filename,
                  codec_name_video : codec_video,
                  codec_name_audio : codec_audio
                  }
          })    
          return;
        }
        });
      } catch (error) {
        res.status(500).send(error.message);
      }

    // res.end();
}

export default codecChecker;

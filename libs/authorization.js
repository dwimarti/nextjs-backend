import jwt from 'jsonwebtoken';

export default function authorization(jwtToken,res) {
  try {
	console.log(jwtToken);
    const token = jwtToken.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
   
     //token-expired-validation
      const currentDate = new Date();
      const timestamp = currentDate.getTime();
      const timestampGap = timestamp-decodedToken.timeStamp;

      //debug
      console.log(decodedToken.timeStamp);
      console.log(timestamp-decodedToken.timeStamp);

      if(process.env.JWT_EXPIRED<timestampGap){
        console.log("TOKEN EXPIRED");
        res.status(403).json({
          status: 0,
          message: "JWT TOKEN EXPIRED",
        });
        return true;
      }
      
    return false;
  } catch (e) {
    console.log(e);
    res.status(403).json({
      status: 0,
      message: "JWT TOKEN INVALID",
    });
    return true;
  }
}

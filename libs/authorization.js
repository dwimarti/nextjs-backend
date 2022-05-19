import jwt from 'jsonwebtoken';

export default function authorization(jwtToken,res) {
  try {
    const token = jwtToken.split(' ')[2];
    jwt.verify(token, process.env.JWT_KEY);
    return false;
  } catch (e) {
    res.status(403).json({
      status: 0,
      message: "JWT TOKEN INVALID",
    });
    return true;
  }
}

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function signAccessToken(userId) {
  return jwt.sign(
    { sub: String(userId), jti: crypto.randomUUID() },
    process.env.ACCESS_TOKEN_SECRET,
    { algorithm: "HS256", expiresIn: "15m" }
  );
}

function verifyAccessToken(token) {
  // algorithms를 명시해 알고리즘 혼동 공격(Algorithm Confusion Attack)을 방어한다.
  // 미명시 시 토큰 헤더의 alg 값을 그대로 수용하므로 의도치 않은 알고리즘이 허용될 수 있다.
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] });
}

module.exports = { signAccessToken, verifyAccessToken };

const { AdminAuditLog } = require("../models/admin");
const { toIpHash } = require("../utils/ipHash");

async function writeAuditLog({
  actorUserId,
  targetUserId = null,
  action,
  before = null,
  after = null,
  req,
  session = null,
}) {
  // req.ip는 app.js의 trust proxy 설정을 준수하므로 X-Forwarded-For를 직접 읽지 않는다.
  // X-Forwarded-For 직접 읽기는 프록시 체인 외부에서 헤더 위조가 가능해 감사 로그 IP가 조작될 수 있다.
  const ip = req.ip || req.socket?.remoteAddress || "";
  const ipHash = toIpHash(ip);

  const payload = {
    actorUserId,
    targetUserId,
    action,
    before,
    after,
    ipHash,
    userAgent: req.headers["user-agent"] || "",
  };

  if (session) {
    await AdminAuditLog.create([payload], { session });
    return;
  }

  await AdminAuditLog.create(payload);
}

module.exports = { writeAuditLog };

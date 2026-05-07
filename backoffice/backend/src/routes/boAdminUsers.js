const express = require("express");
const mongoose = require("mongoose");
const { requireAuth, requireSuperAdmin } = require("../middlewares/boAuth");
const { labelsToPerm, permToLabels, VALID_PERM_LABELS } = require("../utils/permLabels");
const { AdminUser, RefreshToken } = require("../models/admin");
const { writeAuditLog } = require("../services/auditLogService");

const router = express.Router();

router.get("/", requireAuth, requireSuperAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // q 파라미터로 이메일 또는 이름 부분 일치 검색을 지원한다.
    // 빈 문자열이면 전체 조회로 fallback한다.
    const query = {};
    // 길이 상한(100자)으로 비정상적으로 긴 regex 생성을 방어한다.
    const rawQ = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    if (rawQ) {
      // 정규식 특수문자 이스케이프 후 case-insensitive 부분 일치 검색
      const escaped = rawQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      query.$or = [{ email: re }, { name: re }];
    }

    const [users, total] = await Promise.all([
      AdminUser.find(query)
        .select("email name perm isSuperAdmin isActive lastLoginAt createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminUser.countDocuments(query),
    ]);

    return res.json({
      data: users.map((u) => ({ ...u, permLabels: permToLabels(u.perm) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id/perm", requireAuth, requireSuperAdmin, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ code: "NOT_FOUND" });
  }
  const { labels } = req.body || {};

  // 배열 타입 및 최소 1개 이상의 유효한 label 포함 여부를 검증한다.
  // 빈 배열이거나 알 수 없는 label만 포함된 경우 조용히 READ만 남기는 대신 명시적 에러를 반환한다.
  if (!Array.isArray(labels)) {
    return res.status(400).json({ code: "INVALID_LABELS", message: "labels must be an array" });
  }
  const knownLabels = labels.filter((l) => VALID_PERM_LABELS.has(l));
  if (knownLabels.length === 0) {
    return res
      .status(400)
      .json({ code: "INVALID_LABELS", message: `labels must include at least one of: ${[...VALID_PERM_LABELS].join(", ")}` });
  }

  let session;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const target = await AdminUser.findById(req.params.id).session(session);
      if (!target) {
        const e = new Error("NOT_FOUND");
        e.status = 404;
        throw e;
      }

      const before = { perm: target.perm };
      // labelsToPerm은 항상 Permission.READ를 보장하므로 | Permission.READ 불필요
      target.perm = labelsToPerm(labels);
      await target.save({ session });

      await writeAuditLog({
        actorUserId: req.auth.userId,
        targetUserId: target._id,
        action: "ADMIN_PERM_CHANGED",
        before,
        after: { perm: target.perm },
        req,
        session,
      });
    });
  } catch (e) {
    if (e.message === "NOT_FOUND") return res.status(404).json({ code: "NOT_FOUND" });
    return next(e);
  } finally {
    await session?.endSession();
  }

  return res.json({ ok: true });
});

router.patch("/:id/active", requireAuth, requireSuperAdmin, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ code: "NOT_FOUND" });
  }
  const { isActive } = req.body || {};
  // boolean 타입 명시 검증: body에 isActive가 없거나 boolean이 아니면 !!isActive = false로 평가되어
  // 의도치 않은 계정 비활성화가 발생할 수 있다. 명시적으로 boolean만 허용한다.
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ code: "INVALID_INPUT", message: "isActive must be a boolean" });
  }
  let session;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const target = await AdminUser.findById(req.params.id).session(session);
      if (!target) {
        const e = new Error("NOT_FOUND");
        e.status = 404;
        throw e;
      }

      // 자기 자신을 비활성화하면 즉시 로그인 불가가 되므로 방지한다.
      // (superAdminBootstrap이 서버 재시작 시 복구하지만 그 전까지는 잠긴 상태가 됨)
      if (String(target._id) === req.auth.userId && isActive === false) {
        const e = new Error("SELF_DEACTIVATION_FORBIDDEN");
        e.status = 400;
        throw e;
      }

      const before = { isActive: target.isActive };
      target.isActive = !!isActive;
      await target.save({ session });

      if (!target.isActive) {
        await RefreshToken.updateMany(
          { userId: target._id, revoked: false },
          { $set: { revoked: true, revokedAt: new Date() } },
          { session }
        );
      }

      await writeAuditLog({
        actorUserId: req.auth.userId,
        targetUserId: target._id,
        action: "ADMIN_ACTIVE_CHANGED",
        before,
        after: { isActive: target.isActive },
        req,
        session,
      });
    });
  } catch (e) {
    if (e.message === "NOT_FOUND") return res.status(404).json({ code: "NOT_FOUND" });
    if (e.message === "SELF_DEACTIVATION_FORBIDDEN") {
      return res.status(400).json({ code: "SELF_DEACTIVATION_FORBIDDEN" });
    }
    return next(e);
  } finally {
    await session?.endSession();
  }

  return res.json({ ok: true });
});

router.patch("/:id/super-admin", requireAuth, requireSuperAdmin, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ code: "NOT_FOUND" });
  }
  const { isSuperAdmin } = req.body || {};
  // isActive와 동일하게 boolean 타입 명시 검증: body 누락 시 !!undefined = false로 평가되어
  // 의도치 않은 super admin 강등이 발생할 수 있다.
  if (typeof isSuperAdmin !== "boolean") {
    return res.status(400).json({ code: "INVALID_INPUT", message: "isSuperAdmin must be a boolean" });
  }
  let session;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const target = await AdminUser.findById(req.params.id).session(session);
      if (!target) {
        const e = new Error("NOT_FOUND");
        e.status = 404;
        throw e;
      }

      if (String(target._id) === req.auth.userId && isSuperAdmin === false) {
        const e = new Error("SELF_SUPER_ADMIN_DOWNGRADE_FORBIDDEN");
        e.status = 400;
        throw e;
      }

      if (target.isSuperAdmin && isSuperAdmin === false) {
        const count = await AdminUser.countDocuments({ isSuperAdmin: true }).session(session);
        if (count <= 1) {
          const e = new Error("LAST_SUPER_ADMIN_FORBIDDEN");
          e.status = 400;
          throw e;
        }
      }

      const before = { isSuperAdmin: target.isSuperAdmin };
      target.isSuperAdmin = !!isSuperAdmin;
      await target.save({ session });

      await writeAuditLog({
        actorUserId: req.auth.userId,
        targetUserId: target._id,
        action: "ADMIN_SUPER_ADMIN_CHANGED",
        before,
        after: { isSuperAdmin: target.isSuperAdmin },
        req,
        session,
      });
    });
  } catch (e) {
    if (e.message === "NOT_FOUND") return res.status(404).json({ code: "NOT_FOUND" });
    if (e.message === "SELF_SUPER_ADMIN_DOWNGRADE_FORBIDDEN") {
      return res.status(400).json({ code: "SELF_SUPER_ADMIN_DOWNGRADE_FORBIDDEN" });
    }
    if (e.message === "LAST_SUPER_ADMIN_FORBIDDEN") {
      return res.status(400).json({ code: "LAST_SUPER_ADMIN_FORBIDDEN" });
    }
    return next(e);
  } finally {
    await session?.endSession();
  }

  return res.json({ ok: true });
});

module.exports = router;

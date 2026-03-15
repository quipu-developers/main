const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { Member } = require("../models");
const { uploadToR2 } = require("../utils/r2");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return false;
}

router.post("/", upload.single("portfolio_pdf"), async (req, res) => {
  try {
    const {
      name,
      student_id,
      grade,
      major,
      phone_number,
      motivation_semina,
      field_dev,
      motivation_study,
      motivation_external,
      github_profile,
    } = req.body;

    const semina = toBoolean(req.body.semina);
    const dev = toBoolean(req.body.dev);
    const study = toBoolean(req.body.study);
    const external = toBoolean(req.body.external);

    console.log(
      `[LOG] recruit api 실행, 데이터 전송 완료 - 신청자: ${name}, 학번: ${student_id}`
    );

    const requiredFields = {
      name,
      grade,
      student_id,
      major,
      phone_number,
      semina: req.body.semina,
      dev: req.body.dev,
      study: req.body.study,
      external: req.body.external,
    };

    const motivationFields = [
      { activity: semina, motivation: motivation_semina, field: "semina" },
      { activity: dev, motivation: field_dev, field: "dev" },
      { activity: study, motivation: motivation_study, field: "study" },
      { activity: external, motivation: motivation_external, field: "external" },
    ];

    for (const [field, value] of Object.entries(requiredFields)) {
      if (value === null || value === undefined || value === "") {
        console.log(`[ERROR] ${field}가 누락되었습니다.- 신청자: ${name}, 학번: ${student_id}`);
        return res.status(400).send(`필수 요소 누락: ${field}`);
      }
    }

    for (const { activity, motivation, field } of motivationFields) {
      if (activity && (!motivation || motivation.trim() === "")) {
        console.log(`[ERROR] ${field} 관련 동기 누락- 신청자: ${name}, 학번: ${student_id}`);
        return res.status(400).send(`필수 요소 누락: ${field} 관련 동기 입력 필요`);
      }
    }

    const check = await Member.findOne({ student_id }).lean();
    if (check) {
      console.log(`[ERROR] 중복된 인원 - 신청자: ${name}, 학번: ${student_id}`);
      return res.status(409).send(`이미 신청하셨습니다 - 신청자: ${name}, 학번: ${student_id}`);
    }
    console.log(`[LOG] 데이터 검사 완료 - 신청자: ${name}, 학번: ${student_id}`);

    let portfolioPdfFilename = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      portfolioPdfFilename = `퀴푸_25_1-${student_id}${name}${ext}`;
      try {
        await uploadToR2(req.file.buffer, portfolioPdfFilename, req.file.mimetype);
        console.log(`[LOG] 파일 저장: ${portfolioPdfFilename}`);
      } catch (err) {
        console.log(err);
        console.log(`[ERROR] 파일 저장 실패: ${portfolioPdfFilename}`);
        return res.status(500).send("파일 업로드 실패");
      }
    }

    await Member.create({
      name,
      grade: Number(grade),
      student_id,
      major,
      phone_number,
      semina,
      dev,
      study,
      external,
      motivation_semina,
      field_dev,
      motivation_study,
      motivation_external,
      portfolio_pdf: req.file ? portfolioPdfFilename : null,
      github_profile,
    });

    res.status(201).send("저장 완료");
    console.log(`[LOG] 데이터 저장 완료 - 신청자: ${name}, 학번: ${student_id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("서버 에러");
  }
});

module.exports = router;

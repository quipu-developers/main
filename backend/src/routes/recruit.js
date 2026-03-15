// 동아리 지원 api
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { Member } = require("../models");

async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`[LOG] 파일 삭제 성공: ${filePath}`);
  } catch (err) {
    console.error(`[LOG] 파일 삭제 실패: ${err.message}`);
  }
}

const portfolioDir = path.join(__dirname, "../../portfolio/");
const upload = multer({
  storage: multer.diskStorage({
    destination: portfolioDir,
    filename: (req, file, done) => {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      // done(null, `${basename}${ext}`);  타임스탬프를 파일 이름에 추가 x
      done(null, `${basename}-${timestamp}${ext}`); // 타임스탬프를 파일 이름에 추가
    },
  }),
});

router.post("/", upload.single("portfolio_pdf"), async (req, res) => {
  try {
    const {
      name,
      student_id,
      grade,
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
      github_profile,
    } = req.body;
    let ext = "",
      tmpFilename = "",
      tmpFilepath = "";
    console.log(
      `[LOG] recruit api 실행, 데이터 전송 완료 - 신청자: ${name}, 학번: ${student_id}`
    );

    if (req.file) {
      ext = path.extname(req.file.originalname);
      tmpFilename = req.file.filename;
      tmpFilepath = path.join(portfolioDir, tmpFilename);
    }

    // 값 누락 체크
    const requiredFields = {
      name,
      grade,
      student_id,
      major,
      phone_number,
      semina,
      dev,
      study,
      external,
    };
    // const extraFields = {motivation_semina, field_dev, motivation_study,
    // motivation_external, github_profile};
    const motivationFields = [
      {
        activity: semina,
        motivation: motivation_semina,
      },
      {
        activity: dev,
        motivation: field_dev,
      },
      {
        activity: study,
        motivation: motivation_study,
      },
      {
        activity: external,
        motivation: motivation_external,
      },
    ];

    // 필수 필드 누락 체크
    for (const [field, value] of Object.entries(requiredFields)) {
      if (value === null || value === undefined || value === "") {
        if (req.file) {
          await deleteFile(tmpFilepath);
        }
        console.log(
          `[ERROR] ${field}가 누락되었습니다.- 신청자: ${name}, 학번: ${student_id}`
        );
        return res.status(400).send(`필수 요소 누락: ${field}`);
      }
    }

    // 활동 선택 시 motivation 필수 입력 체크
    for (const { activity, motivation } of motivationFields) {
      if (activity === 1 && (!motivation || motivation.trim() === "")) {
        if (req.file) {
          await deleteFile(tmpFilepath);
        }
        console.log(
          `[ERROR] ${activity} 관련 동기 누락- 신청자: ${name}, 학번: ${student_id}`
        );
        return res
          .status(400)
          .send(`필수 요소 누락: ${activity} 관련 동기 입력 필요`);
      }
    }

    /*
              // 값 형식 체크
              for (const [field, validator] of Object.entries(validators)) {
                  const value = req.body[field];
                  if (value !== '' && !validator(req.body[field])) {
                      await deleteFile(res, tmpFilepath);
                      return res.status(400).send(sendingerror(field, 2));
                  }
              }
              */

    // 중복 확인 by student_id
    const Check = await Member.findOne({ student_id });
    if (Check) {
      if (req.file) {
        await deleteFile(tmpFilepath);
      }
      console.log(`[ERROR] 중복된 인원 - 신청자: ${name}, 학번: ${student_id}`);
      return res
        .status(409)
        .send(`이미 신청하셨습니다 - 신청자: ${name}, 학번: ${student_id}`);
    }
    console.log(
      `[LOG] 데이터 검사 완료 - 신청자: ${name}, 학번: ${student_id}`
    );

    // 문제 없으면 pdf 이름 변경 후 저장
    let portfolioPdfFilename = null;
    if (req.file) {
      if (req.file) {
        portfolioPdfFilename = `퀴푸-${student_id}${name}` + ext;
        try {
          await fs.rename(
            tmpFilepath,
            path.join(portfolioDir, portfolioPdfFilename)
          );
          console.log(`[LOG] 파일 저장: ${portfolioPdfFilename}`);
        } catch (err) {
          console.log(err);
          console.log(`[ERROR] 파일 저장 실패: ${portfolioPdfFilename}`);
        }
      }
    }

    await Member.create({
      name,
      grade,
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
    res.status(201).send(`저장 완료`);
    console.log(
      `[LOG] 데이터 저장 완료 - 신청자: ${name}, 학번: ${student_id}`
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(`서버 에러`);
  }
});
module.exports = router;

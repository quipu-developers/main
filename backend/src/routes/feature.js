const express = require("express");
const router = express.Router();
const { Feature } = require("../models");

router.get("/:feature_name", async (req, res) => {
  try {
    const { feature_name } = req.params;
    console.log(`[LOG] feature/${feature_name} api 실행`);

    const feature = await Feature.findOne({ feature_name }).lean();
    if (!feature) {
      console.log(`[ERROR] ${feature_name} 기능 없음.`);
      return res.status(400).send(`${feature_name} 기능을 찾을 수 없음.`);
    }

    return res.status(200).json({
      feature_name,
      is_enabled: feature.is_enabled,
    });
  } catch (err) {
    console.error("[ERROR] 기능 상태 조회 실패:", err);
    return res.status(500).send("error: 서버 오류 발생 ");
  }
});

module.exports = router;

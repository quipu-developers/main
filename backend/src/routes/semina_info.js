const express = require("express");
const router = express.Router();
const { File, Semina } = require("../models");

router.get("/", async (req, res) => {
  try {
    console.log("[LOG] semina_info api 실행");
    const currentPage = parseInt(req.query.current_page, 10) || 1;
    const itemsPerPage = parseInt(req.query.items_per_page, 10) || 5;
    const limit = Math.max(itemsPerPage, 1);
    const offset = Math.max((currentPage - 1) * limit, 0);

    const total_items = await Semina.countDocuments();
    const total_pages = Math.ceil(total_items / limit);

    const seminas = await Semina.find({})
      .select("speaker topic detail resources presentation_date semina_id")
      .sort({ presentation_date: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const seminaIds = seminas.map((item) => item.semina_id);
    const files = await File.find({ semina_id: { $in: seminaIds } })
      .select("file_name semina_id")
      .lean();

    const fileMap = files.reduce((acc, file) => {
      if (!acc[file.semina_id]) {
        acc[file.semina_id] = [];
      }
      acc[file.semina_id].push(file.file_name);
      return acc;
    }, {});

    const BASE_URL = "https://pub-880f96b9aa254fce88011c97e585d2bd.r2.dev";

    const finaldata = seminas.map((semina) => {
      const pdfs = [];
      const images = [];
      const fileNames = fileMap[semina.semina_id] || [];

      fileNames.forEach((fileName) => {
        const fileUrl = `${BASE_URL}/${fileName}`;
        const extension = fileName.split(".").pop().toLowerCase();

        if (["pdf"].includes(extension)) {
          pdfs.push(fileUrl);
        } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
          images.push(fileUrl);
        }
      });

      return {
        speaker: semina.speaker,
        topic: semina.topic,
        details: semina.detail,
        resources: semina.resources,
        date: new Date(semina.presentation_date).toISOString().split("T")[0],
        pdf: pdfs,
        images,
      };
    });

    console.log("[LOG] semina_info api 응답 완료");

    res.status(200).json({
      total_items,
      total_pages,
      current_page: currentPage,
      items_per_page: itemsPerPage,
      items: finaldata,
    });
  } catch (err) {
    console.error("[ERROR] 서버 오류 발생:", err);
    res.status(500).json({ error: "서버 오류 발생", details: err.message });
  }
});

module.exports = router;

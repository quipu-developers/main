const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Cloudflare R2 클라이언트 설정
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const getPDF = async (req, res) => {
  try {
    const filename = req.params.filename;
    const bucketName = process.env.R2_BUCKET_NAME_PDF;

    // ✅ 요청 로그 추가
    console.log(`[LOG] 파일 요청: filename=${filename}, bucket=${bucketName}`);

    if (!filename) {
      console.log("[ERROR] 파일 이름이 제공되지 않음");
      return res.status(400).json({ message: "파일 이름이 필요합니다." });
    }

    if (!bucketName) {
      console.log("[ERROR] 환경 변수 R2_BUCKET_NAME_PDF가 설정되지 않음");
      return res.status(500).json({ message: "서버 설정 오류 (Bucket 이름 없음)" });
    }

    // S3 Presigned URL 생성
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filename,
    });

    // ✅ Presigned URL 생성 로그 추가
    console.log(`[LOG] Presigned URL 요청: filename=${filename}, expiresIn=${60 * 5}`);

    const url = await getSignedUrl(r2, command, { expiresIn: 60 * 5 });

    console.log(`[LOG] Presigned URL 생성 완료: ${url}`);

    res.status(200).json({ url });

  } catch (err) {
    console.error("[ERROR] Presigned URL 생성 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};

module.exports = getPDF;
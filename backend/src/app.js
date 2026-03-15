const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const morgan = require("morgan");
const winston = require("winston");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

console.log(`[LOG] NODE_ENV = ${process.env.NODE_ENV}`);

const { connectDB } = require("./models");
const PORT = process.env.PORT || 3001;
const app = express();

app.use(express.json());
if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN_DEV,
      methods: ["GET", "POST", "OPTIONS"],
    })
  );
  app.use(morgan("dev"));
  app.use(express.urlencoded({ extended: false }));
} else {
  app.use(
    cors({
      origin: [process.env.CLIENT_ORIGIN_TEST, process.env.CLIENT_ORIGIN_PROD],
      methods: ["GET", "POST", "OPTIONS"],
    })
  );
  app.enable("trust proxy");
  app.use(morgan("combined"));
  app.use(hpp());
  app.use(express.urlencoded({ extended: false }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          connectSrc: [
            "'self'",
            process.env.CLIENT_ORIGIN_TEST,
            process.env.CLIENT_ORIGIN_PROD,
          ],
          frameAncestors: ["'none'"],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
        },
      },
    })
  );
  app.use(helmet.referrerPolicy({ policy: "strict-origin-when-cross-origin" }));
  app.use(helmet.frameguard({ action: "deny" }));
  app.use(helmet.noSniff());
}

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const insertDummyData = require("./scripts/dummyData");

const recruitRouter = require("./routes/recruit_R2.js");
const seminainfoRouter = require("./routes/semina_info.js");
const featureRouter = require("./routes/feature.js");

async function startServer() {
  try {
    await connectDB();
    console.log("[LOG] MongoDB 연결 성공");

    if (process.env.NODE_ENV === "development") {
      await insertDummyData();
    }

    app.listen(PORT, () => {
      console.log(`PORT: ${PORT}`);
      console.log(`swagger: http://localhost:${PORT}/api-docs`);
      console.log(`server: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[ERROR] 서버 시작 실패:", err);
    process.exit(1);
  }
}

startServer();

app.use("/recruit", recruitRouter);
app.use("/semina", seminainfoRouter);
app.use("/feature", featureRouter);

if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

const logger = winston.createLogger({
  level: "error",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "error.log" })],
});

app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    console.log("[ERROR] error handler 동작");
    console.error(err.stack || err);
  } else {
    logger.error(err.message || "Unexpected error");
  }

  res.status(err.status || 500).json({
    error: {
      message: "Internal Server Error",
    },
  });
});

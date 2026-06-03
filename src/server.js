require("dotenv").config();
const fs = require("fs");
const https = require("https");
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const sequelize = require("./config/sequelize");
const logger = require("./utils/logger");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [process.env.FRONTEND_URL || "https://localhost:3000", "https://localhost:3000", "http://localhost:3000", "http://localhost:5173", undefined];
    if (!origin || allowed.includes(origin)) cb(null, true);
    else cb(new Error("CORS: origine non autorisée — " + origin));
  },
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true,
}));

app.use(rateLimit({ windowMs: 900000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined", { stream: { write: msg => logger.http(msg.trim()) }, skip: req => req.url === "/api/health" }));

// ── Routes ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ success: true, service: "SMART-PAIE API", version: "1.0.0", env: process.env.NODE_ENV }));
app.use("/api/auth",        require("./routes/auth.routes"));
app.use("/api/entreprises", require("./routes/entreprise.routes"));
app.use("/api/config",      require("./routes/config.routes"));
app.use("/api/employes",    require("./routes/employe.routes"));
app.use("/api/periodes",    require("./routes/periode.routes"));
app.use("/api/bulletins",   require("./routes/bulletin.routes"));
app.use("/api/rubriques",   require("./routes/rubrique.routes"));
app.use("/api/export",      require("./routes/export.routes"));

// 404
app.use((req, res) => res.status(404).json({ success: false, code: "NOT_FOUND", message: `Route ${req.method} ${req.url} inconnue.` }));

// Erreur globale
app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.url} — ${err.message}`);
  if (err.name === "SequelizeUniqueConstraintError") return res.status(409).json({ success: false, code: "DUPLICATE_ENTRY", message: "Entrée dupliquée.", details: err.errors?.map(e => e.message) });
  if (err.name === "SequelizeValidationError") return res.status(400).json({ success: false, code: "VALIDATION_ERROR", details: err.errors?.map(e => ({ field: e.path, message: e.message })) });
  res.status(err.status || 500).json({ success: false, message: process.env.NODE_ENV === "production" ? "Erreur interne." : err.message });
});

const PORT = parseInt(process.env.PORT, 10) || 4000;

async function start() {
  await sequelize.authenticate();
  logger.info("Connexion PostgreSQL OK");
  let srv;
  const certPath = process.env.SSL_CERT_PATH, keyPath = process.env.SSL_KEY_PATH;
  if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    srv = https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, app);
    logger.info("Mode HTTPS (mkcert)");
  } else {
    srv = http.createServer(app);
    logger.warn("Mode HTTP — installez mkcert pour HTTPS local");
  }
  srv.listen(PORT, () => logger.info(`SMART-PAIE API : ${srv instanceof https.Server ? "https" : "http"}://localhost:${PORT}`));
  process.on("SIGTERM", () => { srv.close(() => { sequelize.close(); process.exit(0); }); });
}

start().catch(e => { logger.error(e.message); process.exit(1); });
module.exports = app;

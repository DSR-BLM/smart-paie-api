/**
 * SMART-PAIE — Logger Winston
 * Console en développement, fichiers rotatifs en production
 */
const { createLogger, format, transports } = require("winston");
const path = require("path");

const { combine, timestamp, printf, colorize, errors } = format;

const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return stack
      ? `${ts} [${level}] ${message}\n${stack}`
      : `${ts} [${level}] ${message}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
);

const logDir = path.join(process.cwd(), "logs");

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: process.env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    ...(process.env.NODE_ENV === "production"
      ? [
          new transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new transports.File({
            filename: path.join(logDir, "combined.log"),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          }),
        ]
      : []),
  ],
});

module.exports = logger;

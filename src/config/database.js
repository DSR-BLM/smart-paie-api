/**
 * SMART-PAIE — Configuration Sequelize + PostgreSQL
 * Gère les environnements development, test et production
 */
require("dotenv").config();

const baseConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  dialect: "postgres",
  logging: false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    underscored: true,           // snake_case en base
    timestamps: true,            // created_at, updated_at auto
    paranoid: true,              // deleted_at pour Soft Delete global
    freezeTableName: false,
  },
};

module.exports = {
  development: {
    ...baseConfig,
    logging: (msg) => {
      if (process.env.SEQUELIZE_LOGGING === "true") console.log(msg);
    },
  },
  test: {
    ...baseConfig,
    database: process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test`,
    logging: false,
  },
  production: {
    ...baseConfig,
    pool: { max: 20, min: 5, acquire: 60000, idle: 10000 },
    dialectOptions: {
      ssl:
        process.env.DB_SSL === "true"
          ? { require: true, rejectUnauthorized: false }
          : false,
    },
  },
};

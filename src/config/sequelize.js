/**
 * SMART-PAIE — Instance Sequelize (Singleton)
 * Utilisé partout dans l'application pour les requêtes DB
 */
const { Sequelize } = require("sequelize");
const dbConfig = require("./database");

const env = process.env.NODE_ENV || "development";
const config = dbConfig[env];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

module.exports = sequelize;

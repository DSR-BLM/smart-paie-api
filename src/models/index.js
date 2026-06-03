/**
 * SMART-PAIE — Modèles Sequelize (index central)
 * Charge tous les modèles et définit les associations
 */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

// ─── Modèles ─────────────────────────────────────────────────
const Entreprise = require("./Entreprise")(sequelize, DataTypes);
const Utilisateur = require("./Utilisateur")(sequelize, DataTypes);
const ConfigurationLegale = require("./ConfigurationLegale")(sequelize, DataTypes);
const BaremeIuts = require("./BaremeIuts")(sequelize, DataTypes);
const Employe = require("./Employe")(sequelize, DataTypes);
const Rubrique = require("./Rubrique")(sequelize, DataTypes);
const PeriodePaie = require("./PeriodePaie")(sequelize, DataTypes);
const Bulletin = require("./Bulletin")(sequelize, DataTypes);
const LigneBulletin = require("./LigneBulletin")(sequelize, DataTypes);
const LogActivite = require("./LogActivite")(sequelize, DataTypes);

// ─── Associations ─────────────────────────────────────────────
// Entreprise
Entreprise.hasMany(Utilisateur,         { foreignKey: "id_entreprise", as: "utilisateurs" });
Entreprise.hasOne(ConfigurationLegale,  { foreignKey: "id_entreprise", as: "configuration" });
Entreprise.hasMany(Employe,             { foreignKey: "id_entreprise", as: "employes" });
Entreprise.hasMany(Rubrique,            { foreignKey: "id_entreprise", as: "rubriques" });
Entreprise.hasMany(PeriodePaie,         { foreignKey: "id_entreprise", as: "periodes" });
Entreprise.hasMany(Bulletin,            { foreignKey: "id_entreprise", as: "bulletins" });

// Utilisateur
Utilisateur.belongsTo(Entreprise,       { foreignKey: "id_entreprise", as: "entreprise" });

// ConfigurationLegale
ConfigurationLegale.belongsTo(Entreprise, { foreignKey: "id_entreprise", as: "entreprise" });
ConfigurationLegale.hasMany(BaremeIuts,   { foreignKey: "id_configuration", as: "baremes" });
BaremeIuts.belongsTo(ConfigurationLegale, { foreignKey: "id_configuration", as: "configuration" });

// Employe
Employe.belongsTo(Entreprise,    { foreignKey: "id_entreprise", as: "entreprise" });
Employe.belongsTo(Utilisateur,   { foreignKey: "id_utilisateur", as: "utilisateur" });
Employe.hasMany(Bulletin,        { foreignKey: "id_employe", as: "bulletins" });

// Rubrique
Rubrique.belongsTo(Entreprise,   { foreignKey: "id_entreprise", as: "entreprise" });

// PeriodePaie
PeriodePaie.belongsTo(Entreprise,   { foreignKey: "id_entreprise", as: "entreprise" });
PeriodePaie.hasMany(Bulletin,       { foreignKey: "id_periode", as: "bulletins" });

// Bulletin
Bulletin.belongsTo(Entreprise,   { foreignKey: "id_entreprise", as: "entreprise" });
Bulletin.belongsTo(Employe,      { foreignKey: "id_employe", as: "employe" });
Bulletin.belongsTo(PeriodePaie,  { foreignKey: "id_periode", as: "periode" });
Bulletin.hasMany(LigneBulletin,  { foreignKey: "id_bulletin", as: "lignes" });

// LigneBulletin
LigneBulletin.belongsTo(Bulletin, { foreignKey: "id_bulletin", as: "bulletin" });
LigneBulletin.belongsTo(Rubrique, { foreignKey: "id_rubrique", as: "rubrique" });

// LogActivite
LogActivite.belongsTo(Utilisateur, { foreignKey: "id_utilisateur", as: "utilisateur" });

module.exports = {
  sequelize,
  Entreprise, Utilisateur, ConfigurationLegale, BaremeIuts,
  Employe, Rubrique, PeriodePaie, Bulletin, LigneBulletin, LogActivite,
};

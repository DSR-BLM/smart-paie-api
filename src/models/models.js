"use strict";
const { Model, DataTypes } = require("sequelize");

// ── BaremeIuts ──────────────────────────────────────────────
const BaremeIutsFactory = (sequelize) => {
  class BaremeIuts extends Model {
    static associate(models) {
      BaremeIuts.belongsTo(models.ConfigurationLegale, { foreignKey: "id_configuration", as: "configuration" });
    }
  }
  BaremeIuts.init({
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_configuration:{ type: DataTypes.UUID, allowNull: false },
    tranche_min:     { type: "DECIMAL(15,4)", allowNull: false },
    tranche_max:     { type: "DECIMAL(15,4)", allowNull: true },
    taux:            { type: "DECIMAL(5,4)",  allowNull: false },
    ordre:           { type: DataTypes.INTEGER, allowNull: false },
  }, { sequelize, modelName: "BaremeIuts", tableName: "baremes_iuts", underscored: true, timestamps: true });
  return BaremeIuts;
};

// ── Employe ─────────────────────────────────────────────────
const EmployeFactory = (sequelize) => {
  class Employe extends Model {
    // Calcul dynamique de l'ancienneté depuis date_embauche
    get anciennete_annees() {
      if (!this.date_embauche) return 0;
      const diff = Date.now() - new Date(this.date_embauche).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }
    static associate(models) {
      Employe.belongsTo(models.Entreprise,   { foreignKey: "id_entreprise", as: "entreprise" });
      Employe.belongsTo(models.Utilisateur,  { foreignKey: "id_utilisateur", as: "utilisateur" });
      Employe.hasMany(models.Bulletin,       { foreignKey: "id_employe", as: "bulletins" });
    }
  }
  Employe.init({
    id:                   { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_entreprise:        { type: DataTypes.UUID, allowNull: false },
    id_utilisateur:       { type: DataTypes.UUID, allowNull: true },
    matricule:            { type: DataTypes.STRING(50), allowNull: false },
    nom:                  { type: DataTypes.STRING(100), allowNull: false },
    prenom:               { type: DataTypes.STRING(100), allowNull: false },
    date_naissance:       { type: DataTypes.DATEONLY },
    lieu_naissance:       { type: DataTypes.STRING(150) },
    sexe:                 { type: DataTypes.ENUM("M","F") },
    nationalite:          { type: DataTypes.STRING(80), defaultValue: "Burkinabè" },
    situation_familiale:  { type: DataTypes.ENUM("CELIBATAIRE","MARIE","DIVORCE","VEUF"), defaultValue: "CELIBATAIRE" },
    nb_enfants_charge:    { type: DataTypes.SMALLINT, defaultValue: 0 },
    conjoint_a_charge:    { type: DataTypes.BOOLEAN, defaultValue: false },
    poste:                { type: DataTypes.STRING(150), allowNull: false },
    categorie:            { type: DataTypes.STRING(50) },
    date_embauche:        { type: DataTypes.DATEONLY, allowNull: false },
    type_contrat:         { type: DataTypes.ENUM("CDI","CDD","STAGE","CONSULTANT"), defaultValue: "CDI" },
    salaire_base:         { type: "DECIMAL(15,4)", allowNull: false },
    numero_cnss:          { type: DataTypes.STRING(50), unique: true },
    numero_ifu:           { type: DataTypes.STRING(50) },
    banque:               { type: DataTypes.STRING(100) },
    numero_compte_bancaire: { type: DataTypes.STRING(50) },
  }, {
    sequelize, modelName: "Employe", tableName: "employes",
    underscored: true, timestamps: true, paranoid: true, // Soft Delete
  });
  return Employe;
};

// ── Rubrique ────────────────────────────────────────────────
const RubriqueFactory = (sequelize) => {
  class Rubrique extends Model {
    static associate(models) {
      Rubrique.belongsTo(models.Entreprise, { foreignKey: "id_entreprise", as: "entreprise" });
      Rubrique.hasMany(models.LigneBulletin, { foreignKey: "id_rubrique", as: "lignes" });
    }
  }
  Rubrique.init({
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_entreprise:   { type: DataTypes.UUID, allowNull: false },
    code:            { type: DataTypes.STRING(20), allowNull: false },
    libelle:         { type: DataTypes.STRING(200), allowNull: false },
    type_rubrique:   { type: DataTypes.ENUM("GAIN","RETENUE"), allowNull: false },
    soumis_cnss:     { type: DataTypes.BOOLEAN, defaultValue: false },
    soumis_iuts:     { type: DataTypes.BOOLEAN, defaultValue: false },
    exonere:         { type: DataTypes.BOOLEAN, defaultValue: false },
    mode_calcul:     { type: DataTypes.ENUM("MONTANT_FIXE","POURCENTAGE_BRUT","FORMULE"), defaultValue: "MONTANT_FIXE" },
    valeur_defaut:   { type: "DECIMAL(15,4)" },
    actif:           { type: DataTypes.BOOLEAN, defaultValue: true },
    ordre_affichage: { type: DataTypes.INTEGER, defaultValue: 100 },
  }, { sequelize, modelName: "Rubrique", tableName: "rubriques", underscored: true, timestamps: true });
  return Rubrique;
};

// ── PeriodePaie ──────────────────────────────────────────────
const PeriodePaieFactory = (sequelize) => {
  class PeriodePaie extends Model {
    get est_cloture() { return this.statut === "CLOTURE"; }
    static associate(models) {
      PeriodePaie.belongsTo(models.Entreprise,   { foreignKey: "id_entreprise", as: "entreprise" });
      PeriodePaie.hasMany(models.Bulletin,       { foreignKey: "id_periode", as: "bulletins" });
    }
  }
  PeriodePaie.init({
    id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_entreprise:      { type: DataTypes.UUID, allowNull: false },
    annee:              { type: DataTypes.SMALLINT, allowNull: false },
    mois:               { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1, max: 12 } },
    statut:             { type: DataTypes.ENUM("BROUILLON","VALIDE","CLOTURE"), defaultValue: "BROUILLON" },
    cloture_le:         { type: DataTypes.DATE },
    cloture_par:        { type: DataTypes.UUID },
    fsp_actif_snapshot: { type: DataTypes.BOOLEAN },
    fsp_taux_snapshot:  { type: "DECIMAL(5,4)" },
  }, { sequelize, modelName: "PeriodePaie", tableName: "periodes_paie", underscored: true, timestamps: true });
  return PeriodePaie;
};

// ── Bulletin ─────────────────────────────────────────────────
const BulletinFactory = (sequelize) => {
  class Bulletin extends Model {
    static associate(models) {
      Bulletin.belongsTo(models.Entreprise,   { foreignKey: "id_entreprise", as: "entreprise" });
      Bulletin.belongsTo(models.Employe,      { foreignKey: "id_employe", as: "employe" });
      Bulletin.belongsTo(models.PeriodePaie,  { foreignKey: "id_periode", as: "periode" });
      Bulletin.hasMany(models.LigneBulletin,  { foreignKey: "id_bulletin", as: "lignes" });
    }
  }
  Bulletin.init({
    id:                       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_entreprise:            { type: DataTypes.UUID, allowNull: false },
    id_employe:               { type: DataTypes.UUID, allowNull: false },
    id_periode:               { type: DataTypes.UUID, allowNull: false },
    statut:                   { type: DataTypes.ENUM("BROUILLON","VALIDE","CLOTURE"), defaultValue: "BROUILLON" },
    heures_supp_25:           { type: "DECIMAL(6,2)", defaultValue: 0 },
    heures_supp_50:           { type: "DECIMAL(6,2)", defaultValue: 0 },
    jours_absence:            { type: "DECIMAL(6,2)", defaultValue: 0 },
    acompte:                  { type: "DECIMAL(15,4)", defaultValue: 0 },
    salaire_brut:             { type: "DECIMAL(15,4)" },
    assiette_cnss:            { type: "DECIMAL(15,4)" },
    montant_cnss_salarial:    { type: "DECIMAL(15,4)" },
    montant_cnss_patronal:    { type: "DECIMAL(15,4)" },
    salaire_net_fiscal:       { type: "DECIMAL(15,4)" },
    abattement_iuts_total:    { type: "DECIMAL(15,4)" },
    base_imposable_iuts:      { type: "DECIMAL(15,4)" },
    montant_iuts:             { type: "DECIMAL(15,4)" },
    salaire_net_intermediaire:{ type: "DECIMAL(15,4)" },
    fsp_actif:                { type: DataTypes.BOOLEAN, defaultValue: false },
    fsp_taux_applique:        { type: "DECIMAL(5,4)", defaultValue: 0 },
    montant_fsp:              { type: "DECIMAL(15,4)", defaultValue: 0 },
    salaire_net_a_payer:      { type: "DECIMAL(15,4)" },
  }, { sequelize, modelName: "Bulletin", tableName: "bulletins", underscored: true, timestamps: true });
  return Bulletin;
};

// ── LigneBulletin ────────────────────────────────────────────
const LigneBulletinFactory = (sequelize) => {
  class LigneBulletin extends Model {
    static associate(models) {
      LigneBulletin.belongsTo(models.Bulletin, { foreignKey: "id_bulletin", as: "bulletin" });
      LigneBulletin.belongsTo(models.Rubrique, { foreignKey: "id_rubrique", as: "rubrique" });
    }
  }
  LigneBulletin.init({
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_bulletin:      { type: DataTypes.UUID, allowNull: false },
    id_rubrique:      { type: DataTypes.UUID },
    libelle_snapshot: { type: DataTypes.STRING(200), allowNull: false },
    type_rubrique:    { type: DataTypes.ENUM("GAIN","RETENUE"), allowNull: false },
    soumis_cnss:      { type: DataTypes.BOOLEAN, defaultValue: false },
    soumis_iuts:      { type: DataTypes.BOOLEAN, defaultValue: false },
    montant:          { type: "DECIMAL(15,4)", allowNull: false },
    ordre_affichage:  { type: DataTypes.INTEGER, defaultValue: 100 },
  }, { sequelize, modelName: "LigneBulletin", tableName: "lignes_bulletins", underscored: true, timestamps: true });
  return LigneBulletin;
};

// ── LogActivite ──────────────────────────────────────────────
const LogActiviteFactory = (sequelize) => {
  class LogActivite extends Model {
    static associate(models) {
      LogActivite.belongsTo(models.Utilisateur, { foreignKey: "id_utilisateur", as: "utilisateur" });
    }
  }
  LogActivite.init({
    id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_utilisateur: { type: DataTypes.UUID },
    id_entreprise:  { type: DataTypes.UUID },
    action:         { type: DataTypes.STRING(100), allowNull: false },
    entite:         { type: DataTypes.STRING(80) },
    entite_id:      { type: DataTypes.UUID },
    donnees_avant:  { type: DataTypes.JSONB },
    donnees_apres:  { type: DataTypes.JSONB },
    ip_address:     { type: DataTypes.STRING(45) },
    user_agent:     { type: DataTypes.TEXT },
  }, { sequelize, modelName: "LogActivite", tableName: "logs_activites", underscored: true, timestamps: true });
  return LogActivite;
};

module.exports = {
  BaremeIutsFactory,
  EmployeFactory,
  RubriqueFactory,
  PeriodePaieFactory,
  BulletinFactory,
  LigneBulletinFactory,
  LogActiviteFactory,
};

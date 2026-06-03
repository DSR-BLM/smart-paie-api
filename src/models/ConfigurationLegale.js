module.exports = (sequelize, DataTypes) => {
  const ConfigurationLegale = sequelize.define("ConfigurationLegale", {
    id:                       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_entreprise:            { type: DataTypes.UUID, unique: true },
    cnss_taux_salarial:       { type: DataTypes.DECIMAL(5,4), allowNull: false },
    cnss_taux_patronal:       { type: DataTypes.DECIMAL(5,4), allowNull: false },
    cnss_plafond_mensuel:     { type: DataTypes.DECIMAL(15,4), allowNull: false },
    cnss_actif:               { type: DataTypes.BOOLEAN, defaultValue: true },
    fsp_actif:                { type: DataTypes.BOOLEAN, defaultValue: false },
    fsp_taux:                 { type: DataTypes.DECIMAL(5,4), allowNull: false },
    fsp_libelle:              { type: DataTypes.STRING(200), defaultValue: "Fonds de Soutien Patriotique" },
    iuts_abattement_base:     { type: DataTypes.DECIMAL(15,4) },
    iuts_abattement_par_enfant: { type: DataTypes.DECIMAL(15,4) },
    iuts_abattement_conjoint: { type: DataTypes.DECIMAL(15,4) },
    version:                  { type: DataTypes.INTEGER, defaultValue: 1 },
    modifie_par:              { type: DataTypes.UUID },
  }, { tableName: "configurations_legales", underscored: true, timestamps: true });
  return ConfigurationLegale;
};

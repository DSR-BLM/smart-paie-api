module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Rubrique", {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_entreprise: { type: DataTypes.UUID, allowNull: false },
    code:          { type: DataTypes.STRING(20), allowNull: false },
    libelle:       { type: DataTypes.STRING(200), allowNull: false },
    type_rubrique: { type: DataTypes.ENUM("GAIN","RETENUE"), allowNull: false },
    soumis_cnss:   { type: DataTypes.BOOLEAN, defaultValue: false },
    soumis_iuts:   { type: DataTypes.BOOLEAN, defaultValue: false },
    exonere:       { type: DataTypes.BOOLEAN, defaultValue: false },
    mode_calcul:   { type: DataTypes.ENUM("MONTANT_FIXE","POURCENTAGE_BRUT","FORMULE"), defaultValue: "MONTANT_FIXE" },
    valeur_defaut: { type: DataTypes.DECIMAL(15,4) },
    actif:         { type: DataTypes.BOOLEAN, defaultValue: true },
    ordre_affichage: { type: DataTypes.INTEGER, defaultValue: 100 },
  }, { tableName: "rubriques", underscored: true, timestamps: true });
};

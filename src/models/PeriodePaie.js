module.exports = (sequelize, DataTypes) => {
  return sequelize.define("PeriodePaie", {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_entreprise:    { type: DataTypes.UUID, allowNull: false },
    annee:            { type: DataTypes.SMALLINT, allowNull: false },
    mois:             { type: DataTypes.SMALLINT, allowNull: false },
    statut:           { type: DataTypes.ENUM("BROUILLON","VALIDE","CLOTURE"), defaultValue: "BROUILLON" },
    cloture_le:       { type: DataTypes.DATE },
    cloture_par:      { type: DataTypes.UUID },
    fsp_actif_snapshot: { type: DataTypes.BOOLEAN },
    fsp_taux_snapshot:  { type: DataTypes.DECIMAL(5,4) },
  }, { tableName: "periodes_paie", underscored: true, timestamps: true });
};

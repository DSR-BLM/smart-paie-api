module.exports = (sequelize, DataTypes) => {
  return sequelize.define("LigneBulletin", {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_bulletin:      { type: DataTypes.UUID, allowNull: false },
    id_rubrique:      { type: DataTypes.UUID },
    libelle_snapshot: { type: DataTypes.STRING(200), allowNull: false },
    type_rubrique:    { type: DataTypes.ENUM("GAIN","RETENUE"), allowNull: false },
    soumis_cnss:      { type: DataTypes.BOOLEAN, defaultValue: false },
    soumis_iuts:      { type: DataTypes.BOOLEAN, defaultValue: false },
    montant:          { type: DataTypes.DECIMAL(15,4), allowNull: false },
    ordre_affichage:  { type: DataTypes.INTEGER, defaultValue: 100 },
  }, { tableName: "lignes_bulletins", underscored: true, timestamps: true });
};

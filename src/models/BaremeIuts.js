module.exports = (sequelize, DataTypes) => {
  return sequelize.define("BaremeIuts", {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_configuration: { type: DataTypes.UUID, allowNull: false },
    tranche_min:      { type: DataTypes.DECIMAL(15,4), allowNull: false },
    tranche_max:      { type: DataTypes.DECIMAL(15,4) },
    taux:             { type: DataTypes.DECIMAL(5,4), allowNull: false },
    ordre:            { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: "baremes_iuts", underscored: true, timestamps: true });
};

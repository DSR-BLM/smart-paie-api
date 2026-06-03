module.exports = (sequelize, DataTypes) => {
  return sequelize.define("LogActivite", {
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_utilisateur:  { type: DataTypes.UUID },
    id_entreprise:   { type: DataTypes.UUID },
    action:          { type: DataTypes.STRING(100), allowNull: false },
    entite:          { type: DataTypes.STRING(80) },
    entite_id:       { type: DataTypes.UUID },
    donnees_avant:   { type: DataTypes.JSONB },
    donnees_apres:   { type: DataTypes.JSONB },
    ip_address:      { type: DataTypes.STRING(45) },
    user_agent:      { type: DataTypes.TEXT },
  }, { tableName: "logs_activites", underscored: true, timestamps: true,
    updatedAt: false });
};

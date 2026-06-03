module.exports = (sequelize, DataTypes) => {
  const Entreprise = sequelize.define("Entreprise", {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nom:              { type: DataTypes.STRING(255), allowNull: false },
    sigle:            { type: DataTypes.STRING(50) },
    ifu:              { type: DataTypes.STRING(50), unique: true },
    rccm:             { type: DataTypes.STRING(100) },
    adresse:          { type: DataTypes.TEXT },
    telephone:        { type: DataTypes.STRING(30) },
    email:            { type: DataTypes.STRING(255) },
    secteur_activite: { type: DataTypes.STRING(150) },
    logo_url:         { type: DataTypes.TEXT },
    actif:            { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: "entreprises", underscored: true, timestamps: true });
  return Entreprise;
};

module.exports = (sequelize, DataTypes) => {
  const Utilisateur = sequelize.define("Utilisateur", {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    id_entreprise:    { type: DataTypes.UUID, allowNull: true },
    nom:              { type: DataTypes.STRING(100), allowNull: false },
    prenom:           { type: DataTypes.STRING(100), allowNull: false },
    email:            { type: DataTypes.STRING(255), allowNull: false, unique: true },
    mot_de_passe_hash:{ type: DataTypes.STRING(255), allowNull: false },
    role:             { type: DataTypes.ENUM("SUPER_ADMIN","ADMIN_ENTREPRISE","COMPTABLE","EMPLOYE"), defaultValue: "EMPLOYE" },
    actif:            { type: DataTypes.BOOLEAN, defaultValue: true },
    derniere_connexion: { type: DataTypes.DATE },
    token_refresh:    { type: DataTypes.TEXT },
  }, { tableName: "utilisateurs", underscored: true, timestamps: true,
    defaultScope: { attributes: { exclude: ["mot_de_passe_hash","token_refresh"] } },
    scopes: { withPassword: { attributes: {} } }
  });
  return Utilisateur;
};

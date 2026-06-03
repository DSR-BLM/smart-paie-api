const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Utilisateur, Entreprise, LogActivite } = require("../models");

function genererToken(utilisateur) {
  return jwt.sign(
    { id: utilisateur.id, email: utilisateur.email, role: utilisateur.role, id_entreprise: utilisateur.id_entreprise },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

function genererRefreshToken(utilisateur) {
  return jwt.sign(
    { id: utilisateur.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
}

async function seConnecter(email, motDePasse, ip, userAgent) {
  const utilisateur = await Utilisateur.scope("withPassword").findOne({
    where: { email: email.toLowerCase().trim(), actif: true },
    include: [{ model: Entreprise, as: "entreprise", attributes: ["id","nom","actif"] }],
  });

  if (!utilisateur) throw { status: 401, code: "AUTH_INVALID", message: "Email ou mot de passe incorrect." };

  const ok = await bcrypt.compare(motDePasse, utilisateur.mot_de_passe_hash);
  if (!ok) throw { status: 401, code: "AUTH_INVALID", message: "Email ou mot de passe incorrect." };

  if (utilisateur.id_entreprise && !utilisateur.entreprise?.actif) {
    throw { status: 403, code: "COMPANY_INACTIVE", message: "Votre entreprise est désactivée." };
  }

  const token = genererToken(utilisateur);
  const refreshToken = genererRefreshToken(utilisateur);

  await utilisateur.update({ derniere_connexion: new Date(), token_refresh: refreshToken });

  await LogActivite.create({
    id_utilisateur: utilisateur.id,
    id_entreprise: utilisateur.id_entreprise,
    action: "USER_LOGIN",
    ip_address: ip,
    user_agent: userAgent,
  });

  const { mot_de_passe_hash, token_refresh, ...userData } = utilisateur.toJSON();
  return { token, refreshToken, utilisateur: userData };
}

async function seDéconnecter(utilisateurId) {
  await Utilisateur.update({ token_refresh: null }, { where: { id: utilisateurId } });
}

module.exports = { seConnecter, seDéconnecter, genererToken };

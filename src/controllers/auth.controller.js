const { seConnecter, seDéconnecter } = require("../services/auth.service");
const { body, validationResult } = require("express-validator");

const validerConnexion = [
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  body("mot_de_passe").notEmpty().withMessage("Mot de passe requis"),
];

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { email, mot_de_passe } = req.body;
    const result = await seConnecter(email, mot_de_passe, req.ip, req.headers["user-agent"]);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.status || 500).json({ success: false, code: e.code, message: e.message });
  }
}

async function logout(req, res) {
  try {
    await seDéconnecter(req.utilisateur.id);
    res.json({ success: true, message: "Déconnexion réussie." });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function profil(req, res) {
  res.json({ success: true, utilisateur: req.utilisateur });
}

module.exports = { login, logout, profil, validerConnexion };

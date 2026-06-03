const { LogActivite } = require("../models");

async function enregistrer({ utilisateurId, entrepriseId, action, entite, entiteId, avant, apres, req }) {
  try {
    await LogActivite.create({
      id_utilisateur: utilisateurId,
      id_entreprise: entrepriseId,
      action,
      entite,
      entite_id: entiteId,
      donnees_avant: avant || null,
      donnees_apres: apres || null,
      ip_address: req?.ip || null,
      user_agent: req?.headers?.["user-agent"] || null,
    });
  } catch (e) {
    console.error("Audit log error:", e.message);
  }
}

module.exports = { enregistrer };

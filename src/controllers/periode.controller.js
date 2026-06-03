const { PeriodePaie } = require("../models");

async function lister(req, res) {
  try {
    const { id_entreprise } = req.utilisateur;
    const periodes = await PeriodePaie.findAll({
      where: { id_entreprise }, order: [["annee","DESC"],["mois","DESC"]]
    });
    res.json({ success: true, periodes });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function creer(req, res) {
  try {
    const { id_entreprise } = req.utilisateur;
    const { annee, mois } = req.body;
    const existant = await PeriodePaie.findOne({ where: { id_entreprise, annee, mois } });
    if (existant) return res.status(409).json({ success: false, message: "Période déjà existante.", periode: existant });
    const periode = await PeriodePaie.create({ id_entreprise, annee, mois, statut: "BROUILLON" });
    res.status(201).json({ success: true, periode });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

module.exports = { lister, creer };

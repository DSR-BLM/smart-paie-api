const { Rubrique } = require("../models");

async function lister(req, res) {
  try {
    const rubriques = await Rubrique.findAll({ where: { id_entreprise: req.utilisateur.id_entreprise, actif: true }, order: [["ordre_affichage","ASC"]] });
    res.json({ success: true, rubriques });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function creer(req, res) {
  try {
    const rubrique = await Rubrique.create({ ...req.body, id_entreprise: req.utilisateur.id_entreprise });
    res.status(201).json({ success: true, rubrique });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function modifier(req, res) {
  try {
    const r = await Rubrique.findOne({ where: { id: req.params.id, id_entreprise: req.utilisateur.id_entreprise } });
    if (!r) return res.status(404).json({ success: false, message: "Rubrique introuvable." });
    await r.update(req.body);
    res.json({ success: true, rubrique: r });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function supprimer(req, res) {
  try {
    const r = await Rubrique.findOne({ where: { id: req.params.id, id_entreprise: req.utilisateur.id_entreprise } });
    if (!r) return res.status(404).json({ success: false, message: "Rubrique introuvable." });
    await r.update({ actif: false });
    res.json({ success: true, message: "Rubrique désactivée." });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

module.exports = { lister, creer, modifier, supprimer };

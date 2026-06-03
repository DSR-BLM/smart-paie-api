const { Employe, Utilisateur } = require("../models");
const { Op } = require("sequelize");
const { enregistrer } = require("../services/audit.service");
const { differenceInYears, differenceInMonths } = require("date-fns");

function calculerAnciennete(dateEmbauche) {
  const debut = new Date(dateEmbauche);
  const now = new Date();
  const annees = differenceInYears(now, debut);
  const moisTotal = differenceInMonths(now, debut);
  return { annees, mois_total: moisTotal, mois_restants: moisTotal - annees * 12 };
}

async function lister(req, res) {
  try {
    const { id_entreprise } = req.utilisateur;
    const { search, page = 1, limit = 20, inclure_archives } = req.query;
    const where = { id_entreprise };
    if (!inclure_archives) where.deleted_at = null;
    if (search) where[Op.or] = [
      { nom: { [Op.iLike]: `%${search}%` } },
      { prenom: { [Op.iLike]: `%${search}%` } },
      { matricule: { [Op.iLike]: `%${search}%` } },
    ];
    const { count, rows } = await Employe.findAndCountAll({
      where, paranoid: !inclure_archives,
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      order: [["nom","ASC"],["prenom","ASC"]],
    });
    const employes = rows.map(e => ({ ...e.toJSON(), anciennete: calculerAnciennete(e.date_embauche) }));
    res.json({ success: true, employes, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function creer(req, res) {
  try {
    const id_entreprise = req.utilisateur.id_entreprise || req.body.id_entreprise;
    const employe = await Employe.create({ ...req.body, id_entreprise });
    await enregistrer({ utilisateurId: req.utilisateur.id, entrepriseId: id_entreprise,
      action: "EMPLOYE_CREATE", entite: "employes", entiteId: employe.id,
      apres: employe.toJSON(), req });
    res.status(201).json({ success: true, employe: { ...employe.toJSON(), anciennete: calculerAnciennete(employe.date_embauche) } });
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError")
      return res.status(409).json({ success: false, message: "Matricule déjà utilisé dans cette entreprise." });
    res.status(500).json({ success: false, message: e.message });
  }
}

async function getById(req, res) {
  try {
    const employe = await Employe.findOne({ where: { id: req.params.id, id_entreprise: req.utilisateur.id_entreprise } });
    if (!employe) return res.status(404).json({ success: false, message: "Employé introuvable." });
    res.json({ success: true, employe: { ...employe.toJSON(), anciennete: calculerAnciennete(employe.date_embauche) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function modifier(req, res) {
  try {
    const employe = await Employe.findOne({ where: { id: req.params.id, id_entreprise: req.utilisateur.id_entreprise } });
    if (!employe) return res.status(404).json({ success: false, message: "Employé introuvable." });
    const avant = employe.toJSON();
    const interdits = ["id","id_entreprise","deleted_at"];
    Object.entries(req.body).forEach(([k, v]) => { if (!interdits.includes(k)) employe[k] = v; });
    await employe.save();
    await enregistrer({ utilisateurId: req.utilisateur.id, entrepriseId: employe.id_entreprise,
      action: "EMPLOYE_UPDATE", entite: "employes", entiteId: employe.id, avant, apres: employe.toJSON(), req });
    res.json({ success: true, employe: { ...employe.toJSON(), anciennete: calculerAnciennete(employe.date_embauche) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function archiver(req, res) {
  try {
    const employe = await Employe.findOne({ where: { id: req.params.id, id_entreprise: req.utilisateur.id_entreprise } });
    if (!employe) return res.status(404).json({ success: false, message: "Employé introuvable." });
    await employe.destroy(); // Soft delete (paranoid)
    await enregistrer({ utilisateurId: req.utilisateur.id, entrepriseId: employe.id_entreprise,
      action: "EMPLOYE_ARCHIVE", entite: "employes", entiteId: employe.id,
      avant: employe.toJSON(), req });
    res.json({ success: true, message: "Employé archivé avec succès." });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

module.exports = { lister, creer, getById, modifier, archiver };

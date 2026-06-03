const { Bulletin, Employe, PeriodePaie, LigneBulletin, ConfigurationLegale, BaremeIuts, Entreprise } = require("../models");
const { calculerBulletin } = require("../services/calcul-paie.service");
const { enregistrer } = require("../services/audit.service");
const { Op } = require("sequelize");

// Récupère la configuration légale effective (entreprise ou globale)
async function getConfig(id_entreprise) {
  let config = await ConfigurationLegale.findOne({
    where: { id_entreprise },
    include: [{ model: BaremeIuts, as: "baremes", order: [["ordre","ASC"]] }]
  });
  if (!config) {
    config = await ConfigurationLegale.findOne({
      where: { id_entreprise: null },
      include: [{ model: BaremeIuts, as: "baremes", order: [["ordre","ASC"]] }]
    });
  }
  if (!config) throw new Error("Aucune configuration légale trouvée.");
  return config;
}

async function listerParPeriode(req, res) {
  try {
    const { id_periode } = req.params;
    const { id_entreprise } = req.utilisateur;
    const bulletins = await Bulletin.findAll({
      where: { id_periode, id_entreprise },
      include: [{ model: Employe, as: "employe", attributes: ["id","nom","prenom","matricule","poste"] }],
      order: [[{ model: Employe, as: "employe" }, "nom", "ASC"]],
    });
    res.json({ success: true, bulletins });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function calculer(req, res) {
  try {
    const { id_employe, id_periode, heures_supp_25 = 0, heures_supp_50 = 0, jours_absence = 0, acompte = 0, lignes = [] } = req.body;
    const { id_entreprise } = req.utilisateur;

    const [employe, periode, config] = await Promise.all([
      Employe.findOne({ where: { id: id_employe, id_entreprise } }),
      PeriodePaie.findOne({ where: { id: id_periode, id_entreprise } }),
      getConfig(id_entreprise),
    ]);
    if (!employe) return res.status(404).json({ success: false, message: "Employé introuvable." });
    if (!periode) return res.status(404).json({ success: false, message: "Période introuvable." });
    if (periode.statut === "CLOTURE") return res.status(400).json({ success: false, message: "Période clôturée — modification impossible." });

    const saisie = { heures_supp_25, heures_supp_50, jours_absence, acompte };
    const resultat = calculerBulletin(employe.toJSON(), config.toJSON(), config.baremes.map(b => b.toJSON()), saisie, lignes);

    // Upsert bulletin
    const [bulletin, created] = await Bulletin.findOrCreate({
      where: { id_employe, id_periode },
      defaults: { id_entreprise, ...saisie, ...resultat, statut: "BROUILLON" },
    });
    if (!created) await bulletin.update({ ...saisie, ...resultat, statut: "BROUILLON" });

    // Mettre à jour lignes
    if (lignes.length > 0) {
      await LigneBulletin.destroy({ where: { id_bulletin: bulletin.id } });
      await LigneBulletin.bulkCreate(lignes.map(l => ({ ...l, id_bulletin: bulletin.id })));
    }

    res.json({ success: true, bulletin: await Bulletin.findByPk(bulletin.id, { include: [{ model: LigneBulletin, as: "lignes" }] }), created });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function getBulletin(req, res) {
  try {
    const { id } = req.params;
    const { id_entreprise, role, id: userId } = req.utilisateur;
    const where = { id };
    if (role !== "SUPER_ADMIN") where.id_entreprise = id_entreprise;
    const bulletin = await Bulletin.findOne({
      where,
      include: [
        { model: Employe, as: "employe" },
        { model: PeriodePaie, as: "periode" },
        { model: LigneBulletin, as: "lignes", order: [["ordre_affichage","ASC"]] },
      ],
    });
    if (!bulletin) return res.status(404).json({ success: false, message: "Bulletin introuvable." });
    // Restriction employé : ne peut voir que ses propres bulletins
    if (role === "EMPLOYE" && bulletin.employe?.id_utilisateur !== userId)
      return res.status(403).json({ success: false, message: "Accès refusé." });
    res.json({ success: true, bulletin });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function cloturer(req, res) {
  try {
    const { id_periode } = req.params;
    const { id_entreprise } = req.utilisateur;
    const periode = await PeriodePaie.findOne({ where: { id: id_periode, id_entreprise } });
    if (!periode) return res.status(404).json({ success: false, message: "Période introuvable." });
    if (periode.statut === "CLOTURE") return res.status(400).json({ success: false, message: "Déjà clôturée." });

    const config = await getConfig(id_entreprise);

    // Figer le snapshot FSP dans la période
    await periode.update({
      statut: "CLOTURE",
      cloture_le: new Date(),
      cloture_par: req.utilisateur.id,
      fsp_actif_snapshot: config.fsp_actif,
      fsp_taux_snapshot: config.fsp_taux,
    });

    // Figer tous les bulletins de la période
    await Bulletin.update({ statut: "CLOTURE" }, { where: { id_periode, id_entreprise } });

    await enregistrer({ utilisateurId: req.utilisateur.id, entrepriseId: id_entreprise,
      action: "PERIODE_CLOTURE", entite: "periodes_paie", entiteId: id_periode,
      apres: { statut: "CLOTURE", fsp_actif: config.fsp_actif, fsp_taux: config.fsp_taux }, req });

    res.json({ success: true, message: "Période clôturée avec succès.", periode });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function journalPaie(req, res) {
  try {
    const { id_periode } = req.params;
    const { id_entreprise } = req.utilisateur;
    const bulletins = await Bulletin.findAll({
      where: { id_periode, id_entreprise },
      include: [{ model: Employe, as: "employe" }, { model: PeriodePaie, as: "periode" }],
      order: [[{ model: Employe, as: "employe" }, "nom", "ASC"]],
    });
    res.json({ success: true, bulletins });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

module.exports = { listerParPeriode, calculer, getBulletin, cloturer, journalPaie };

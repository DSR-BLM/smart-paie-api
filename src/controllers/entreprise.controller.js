const { Entreprise, ConfigurationLegale, BaremeIuts, Utilisateur } = require("../models");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

async function lister(req, res) {
  try {
    const entreprises = await Entreprise.findAll({ order: [["nom","ASC"]] });
    res.json({ success: true, entreprises });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function creer(req, res) {
  const t = await Entreprise.sequelize.transaction();
  try {
    const entreprise = await Entreprise.create(req.body, { transaction: t });
    // Cloner la configuration légale globale
    const configGlobale = await ConfigurationLegale.findOne({ where: { id_entreprise: null }, include: [{ model: BaremeIuts, as: "baremes" }] });
    if (configGlobale) {
      const configId = uuidv4();
      await ConfigurationLegale.create({ ...configGlobale.toJSON(), id: configId, id_entreprise: entreprise.id }, { transaction: t });
      if (configGlobale.baremes?.length) {
        await BaremeIuts.bulkCreate(configGlobale.baremes.map(b => ({ ...b.toJSON(), id: uuidv4(), id_configuration: configId })), { transaction: t });
      }
    }
    // Admin par défaut si données fournies
    if (req.body.admin_email && req.body.admin_mot_de_passe) {
      const hash = await bcrypt.hash(req.body.admin_mot_de_passe, parseInt(process.env.BCRYPT_ROUNDS || "12"));
      await Utilisateur.create({ id_entreprise: entreprise.id, nom: req.body.admin_nom || "Admin", prenom: req.body.admin_prenom || "Entreprise",
        email: req.body.admin_email, mot_de_passe_hash: hash, role: "ADMIN_ENTREPRISE" }, { transaction: t });
    }
    await t.commit();
    res.status(201).json({ success: true, entreprise });
  } catch (e) { await t.rollback(); res.status(500).json({ success: false, message: e.message }); }
}

async function modifier(req, res) {
  try {
    const e = await Entreprise.findByPk(req.params.id);
    if (!e) return res.status(404).json({ success: false, message: "Entreprise introuvable." });
    await e.update(req.body);
    res.json({ success: true, entreprise: e });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

module.exports = { lister, creer, modifier };

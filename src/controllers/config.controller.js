const { ConfigurationLegale, BaremeIuts } = require("../models");
const { enregistrer } = require("../services/audit.service");
const { v4: uuidv4 } = require("uuid");

async function getConfig(req, res) {
  try {
    const { id_entreprise } = req.query;
    const where = id_entreprise ? { id_entreprise } : { id_entreprise: null };
    const config = await ConfigurationLegale.findOne({
      where, include: [{ model: BaremeIuts, as: "baremes", order: [["ordre","ASC"]] }]
    });
    if (!config) return res.status(404).json({ success: false, message: "Configuration introuvable." });
    res.json({ success: true, configuration: config });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function updateConfig(req, res) {
  try {
    const { id } = req.params;
    const config = await ConfigurationLegale.findByPk(id);
    if (!config) return res.status(404).json({ success: false, message: "Configuration introuvable." });
    const avant = config.toJSON();
    const champs = ["cnss_taux_salarial","cnss_taux_patronal","cnss_plafond_mensuel","cnss_actif",
      "fsp_actif","fsp_taux","fsp_libelle","iuts_abattement_base","iuts_abattement_par_enfant","iuts_abattement_conjoint"];
    champs.forEach(c => { if (req.body[c] !== undefined) config[c] = req.body[c]; });
    config.version = (config.version || 1) + 1;
    config.modifie_par = req.utilisateur.id;
    await config.save();
    if (avant.fsp_actif !== config.fsp_actif || String(avant.fsp_taux) !== String(config.fsp_taux)) {
      await enregistrer({ utilisateurId: req.utilisateur.id, entrepriseId: config.id_entreprise,
        action: "CONFIG_FSP_UPDATE", entite: "configurations_legales", entiteId: config.id,
        avant: { fsp_actif: avant.fsp_actif, fsp_taux: avant.fsp_taux },
        apres: { fsp_actif: config.fsp_actif, fsp_taux: config.fsp_taux }, req });
    }
    res.json({ success: true, configuration: config });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function updateBaremes(req, res) {
  try {
    const { id_configuration } = req.params;
    const { baremes } = req.body;
    if (!Array.isArray(baremes)) return res.status(400).json({ success: false, message: "Barèmes invalides." });
    await BaremeIuts.destroy({ where: { id_configuration } });
    const created = await BaremeIuts.bulkCreate(
      baremes.map((b, i) => ({ ...b, id: uuidv4(), id_configuration, ordre: b.ordre || i + 1 }))
    );
    res.json({ success: true, baremes: created });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

module.exports = { getConfig, updateConfig, updateBaremes };

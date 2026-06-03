"use strict";
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

/**
 * SMART-PAIE — Seeder Données Initiales
 * Insère : barèmes IUTS officiels Burkina Faso, configuration légale par défaut,
 *          et le compte SuperAdmin initial.
 */

// IDs constants pour les relations
const CONFIG_GLOBALE_ID = uuidv4();
const SUPER_ADMIN_ID = uuidv4();

// Barèmes IUTS Burkina Faso (Code Général des Impôts — Annexe Fiscale)
// Base annuelle imposable (le calcul dans le moteur sera mensuel × 12)
const TRANCHES_IUTS = [
  { min: 0,       max: 600000,    taux: 0.0000, ordre: 1 }, // Tranche exonérée
  { min: 600000,  max: 1500000,   taux: 0.1000, ordre: 2 }, // 10%
  { min: 1500000, max: 3000000,   taux: 0.1500, ordre: 3 }, // 15%
  { min: 3000000, max: 6000000,   taux: 0.2000, ordre: 4 }, // 20%
  { min: 6000000, max: 10000000,  taux: 0.2500, ordre: 5 }, // 25%
  { min: 10000000,max: null,      taux: 0.3000, ordre: 6 }, // 30% (sans plafond)
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // 1. SuperAdmin par défaut (mot de passe à changer immédiatement en prod)
    const hash = await bcrypt.hash("Admin@SmartPaie2024!", 12);
    await queryInterface.bulkInsert("utilisateurs", [
      {
        id: SUPER_ADMIN_ID,
        id_entreprise: null,
        nom: "Administrateur",
        prenom: "Système",
        email: "admin@smart-paie.bf",
        mot_de_passe_hash: hash,
        role: "SUPER_ADMIN",
        actif: true,
        derniere_connexion: null,
        token_refresh: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    // 2. Configuration légale globale (id_entreprise = NULL)
    await queryInterface.bulkInsert("configurations_legales", [
      {
        id: CONFIG_GLOBALE_ID,
        id_entreprise: null,
        cnss_taux_salarial:  "0.0550", // 5.5%
        cnss_taux_patronal:  "0.1600", // 16%
        cnss_plafond_mensuel:"425000.0000",
        cnss_actif:          true,
        fsp_actif:           false,    // Désactivé par défaut, toggle dans l'UI
        fsp_taux:            "0.0100", // 1% — modifiable à tout moment
        fsp_libelle:         "Fonds de Soutien Patriotique",
        iuts_abattement_base:         "1000.0000",
        iuts_abattement_par_enfant:   "1000.0000",
        iuts_abattement_conjoint:     "1000.0000",
        version:             1,
        modifie_par:         SUPER_ADMIN_ID,
        created_at:          now,
        updated_at:          now,
      },
    ]);

    // 3. Barèmes IUTS officiels Burkina Faso
    const baremes = TRANCHES_IUTS.map((t) => ({
      id:               uuidv4(),
      id_configuration: CONFIG_GLOBALE_ID,
      tranche_min:      t.min.toFixed(4),
      tranche_max:      t.max !== null ? t.max.toFixed(4) : null,
      taux:             t.taux.toFixed(4),
      ordre:            t.ordre,
      created_at:       now,
      updated_at:       now,
    }));

    await queryInterface.bulkInsert("baremes_iuts", baremes);

    console.log("✅ SMART-PAIE : Données initiales insérées.");
    console.log("⚠️  SuperAdmin : admin@smart-paie.bf / Admin@SmartPaie2024!");
    console.log("⚠️  CHANGEZ CE MOT DE PASSE AVANT TOUT DÉPLOIEMENT !");
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("baremes_iuts", null, {});
    await queryInterface.bulkDelete("configurations_legales", null, {});
    await queryInterface.bulkDelete("utilisateurs", { role: "SUPER_ADMIN" }, {});
  },
};

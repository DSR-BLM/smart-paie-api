/**
 * SMART-PAIE — Tests unitaires Phase 5
 * Valide l'algorithme complet avec cas burkinabè réels
 */

const { calculerBulletin, calculerIUTS } = require("../src/services/calcul-paie.service");

// Barèmes IUTS officiels Burkina Faso
const BAREMES_TEST = [
  { ordre: 1, tranche_min: "0",        tranche_max: "600000",   taux: "0.0000" },
  { ordre: 2, tranche_min: "600000",   tranche_max: "1500000",  taux: "0.1000" },
  { ordre: 3, tranche_min: "1500000",  tranche_max: "3000000",  taux: "0.1500" },
  { ordre: 4, tranche_min: "3000000",  tranche_max: "6000000",  taux: "0.2000" },
  { ordre: 5, tranche_min: "6000000",  tranche_max: "10000000", taux: "0.2500" },
  { ordre: 6, tranche_min: "10000000", tranche_max: null,       taux: "0.3000" },
];

const CONFIG_BASE = {
  cnss_taux_salarial: "0.0550",
  cnss_taux_patronal: "0.1600",
  cnss_plafond_mensuel: "425000.0000",
  cnss_actif: true,
  fsp_actif: false,
  fsp_taux: "0.0100",
  iuts_abattement_base: "1000.0000",
  iuts_abattement_par_enfant: "1000.0000",
  iuts_abattement_conjoint: "1000.0000",
};

describe("Moteur de calcul SMART-PAIE", () => {

  // ── Test 1 : Employé célibataire, salaire moyen ──────────────
  test("Célibataire sans enfant — calcul CNSS + IUTS standard", () => {
    const employe = { salaire_base: "150000", nb_enfants_charge: 0, conjoint_a_charge: false };
    const r = calculerBulletin(employe, CONFIG_BASE, BAREMES_TEST);

    expect(r.salaire_brut).toBe(150000);
    // CNSS : 150000 * 5.5% = 8250
    expect(r.montant_cnss_salarial).toBe(8250);
    // Net fiscal : 150000 - 8250 = 141750
    expect(r.salaire_net_fiscal).toBe(141750);
    // Abattement base seul : 1000
    expect(r.abattement_iuts_total).toBe(1000);
    // Base imposable : 141750 - 1000 = 140750
    expect(r.base_imposable_iuts).toBe(140750);
    // IUTS annualisé: base=1689000 → tranche 10%: (1500000-600000)*10%=90000 + tranche 15%: (1689000-1500000)*15%=28350 = 118350/12 = 9862.5
    expect(r.montant_iuts).toBe(9862.5);
    expect(r.fsp_actif).toBe(false);
    expect(r.montant_fsp).toBe(0);
    expect(r.salaire_net_a_payer).toBe(r.salaire_net_intermediaire);
  });

  // ── Test 2 : Employé marié, 3 enfants — abattements IUTS réduit
  test("Marié avec 3 enfants — abattement IUTS augmenté (IUTS réduit)", () => {
    const employe = { salaire_base: "150000", nb_enfants_charge: 3, conjoint_a_charge: true };
    const r = calculerBulletin(employe, CONFIG_BASE, BAREMES_TEST);

    // Abattement : 1000 (base) + 3*1000 (enfants) + 1000 (conjoint) = 5000
    expect(r.abattement_iuts_total).toBe(5000);
    // Base imposable : 141750 - 5000 = 136750
    expect(r.base_imposable_iuts).toBe(136750);
    // L'IUTS doit être INFÉRIEUR à celui du célibataire
    const employeCelib = { salaire_base: "150000", nb_enfants_charge: 0, conjoint_a_charge: false };
    const rCelib = calculerBulletin(employeCelib, CONFIG_BASE, BAREMES_TEST);
    expect(r.montant_iuts).toBeLessThan(rCelib.montant_iuts);
  });

  // ── Test 3 : FSP — règle critique ────────────────────────────
  test("FSP actif — se calcule sur le Net Intermédiaire (pas sur le brut)", () => {
    const configFSP = { ...CONFIG_BASE, fsp_actif: true, fsp_taux: "0.0100" };
    const employe = { salaire_base: "200000", nb_enfants_charge: 0, conjoint_a_charge: false };
    const r = calculerBulletin(employe, configFSP, BAREMES_TEST);

    expect(r.fsp_actif).toBe(true);
    expect(r.fsp_taux_applique).toBe(0.01);

    // FSP = Net Intermédiaire * 1% (PAS sur le brut)
    const fspAttendu = Math.round(r.salaire_net_intermediaire * 0.01 * 10000) / 10000;
    expect(r.montant_fsp).toBeCloseTo(fspAttendu, 2);

    // FSP NE DOIT PAS être calculé sur le brut
    const fspSurBrut = Math.round(r.salaire_brut * 0.01 * 10000) / 10000;
    expect(r.montant_fsp).not.toBe(fspSurBrut);

    // Net à payer = Net intermédiaire - FSP
    expect(r.salaire_net_a_payer).toBeCloseTo(r.salaire_net_intermediaire - r.montant_fsp, 2);
  });

  // ── Test 4 : FSP désactivé ────────────────────────────────────
  test("FSP désactivé — retenue = 0 même si taux renseigné", () => {
    const configFSPOff = { ...CONFIG_BASE, fsp_actif: false, fsp_taux: "0.0500" }; // 5% mais désactivé
    const employe = { salaire_base: "300000", nb_enfants_charge: 0, conjoint_a_charge: false };
    const r = calculerBulletin(employe, configFSPOff, BAREMES_TEST);
    expect(r.montant_fsp).toBe(0);
    expect(r.salaire_net_a_payer).toBe(r.salaire_net_intermediaire);
  });

  // ── Test 5 : Plafond CNSS ─────────────────────────────────────
  test("Salaire > plafond CNSS — assiette plafonnée à 425 000", () => {
    const employe = { salaire_base: "800000", nb_enfants_charge: 0, conjoint_a_charge: false };
    const r = calculerBulletin(employe, CONFIG_BASE, BAREMES_TEST);
    expect(r.assiette_cnss).toBe(425000);
    expect(r.montant_cnss_salarial).toBe(Math.round(425000 * 0.055 * 10000) / 10000);
  });

  // ── Test 6 : Heures supplémentaires ──────────────────────────
  test("Heures supplémentaires à 25% et 50% bien intégrées dans le brut", () => {
    const employe = { salaire_base: "173330", nb_enfants_charge: 0, conjoint_a_charge: false };
    const saisie = { heures_supp_25: 10, heures_supp_50: 5, jours_absence: 0, acompte: 0 };
    const r = calculerBulletin(employe, CONFIG_BASE, BAREMES_TEST, saisie);
    const tauxH = 173330 / 173.33;
    const hs25 = Math.round(10 * tauxH * 1.25 * 10000) / 10000;
    const hs50 = Math.round(5 * tauxH * 1.50 * 10000) / 10000;
    expect(r.salaire_brut).toBeCloseTo(173330 + hs25 + hs50, 0);
  });

  // ── Test 7 : Acompte déduit du net final ─────────────────────
  test("Acompte déduit du net à payer", () => {
    const employe = { salaire_base: "150000", nb_enfants_charge: 0, conjoint_a_charge: false };
    const saisie = { acompte: 30000 };
    const r = calculerBulletin(employe, CONFIG_BASE, BAREMES_TEST, saisie);
    const rSansAcompte = calculerBulletin(employe, CONFIG_BASE, BAREMES_TEST, { acompte: 0 });
    expect(r.salaire_net_a_payer).toBeCloseTo(rSansAcompte.salaire_net_a_payer - 30000, 2);
  });

  // ── Test 8 : Barème IUTS tranche haute ───────────────────────
  test("Salaire élevé — IUTS calcul multi-tranches", () => {
    const employe = { salaire_base: "1200000", nb_enfants_charge: 0, conjoint_a_charge: false };
    const r = calculerBulletin(employe, CONFIG_BASE, BAREMES_TEST);
    // Net fiscal annualisé > 10M → tranche 30% activée
    expect(r.montant_iuts).toBeGreaterThan(0);
    // IUTS doit être > 0 et cohérent (pas > 40% du net fiscal)
    expect(r.montant_iuts).toBeLessThan(r.salaire_net_fiscal * 0.40);
  });

  // ── Test 9 : FSP taux zéro ────────────────────────────────────
  test("FSP actif mais taux = 0 — retenue = 0", () => {
    const configFSP0 = { ...CONFIG_BASE, fsp_actif: true, fsp_taux: "0.0000" };
    const employe = { salaire_base: "200000", nb_enfants_charge: 0, conjoint_a_charge: false };
    const r = calculerBulletin(employe, configFSP0, BAREMES_TEST);
    expect(r.montant_fsp).toBe(0);
  });

});

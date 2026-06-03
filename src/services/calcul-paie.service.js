/**
 * SMART-PAIE — Moteur de Calcul de la Paie (Phase 3)
 *
 * Algorithme officiel Burkina Faso :
 * 1. Salaire BRUT = Base + Primes + Heures sup - Absences
 * 2. Assiette CNSS = min(Brut, plafond_mensuel)
 * 3. CNSS salariale = Assiette * taux_salarial
 * 4. Salaire Net Fiscal = Brut - CNSS salariale
 * 5. Abattement IUTS = base + (nb_enfants * par_enfant) + (conjoint ? montant : 0)
 * 6. Base imposable IUTS = max(0, Net Fiscal - Abattement)
 * 7. IUTS = calcul progressif par tranches annualisees
 * 8. Salaire Net Intermediaire = Net Fiscal - IUTS
 * 9. Si fsp_actif: Retenue FSP = Net Intermediaire * fsp_taux
 * 10. Net a Payer = Net Intermediaire - FSP - Acompte
 */

/**
 * Arrondit a 4 decimales (FCFA: pas de centime, mais precision comptable)
 */
function arrondir(val) {
  return Math.round(parseFloat(val) * 10000) / 10000;
}

/**
 * Calcul IUTS progressif par tranches
 * Le bareme officiel est annuel, on annualise la base mensuelle
 */
function calculerIUTS(baseImposableMensuelle, baremes) {
  const baseAnnuelle = parseFloat(baseImposableMensuelle) * 12;
  if (baseAnnuelle <= 0) return 0;

  const sorted = [...baremes].sort((a, b) => a.ordre - b.ordre);
  let iutsAnnuel = 0;

  for (const tranche of sorted) {
    const min = parseFloat(tranche.tranche_min);
    const max = tranche.tranche_max !== null ? parseFloat(tranche.tranche_max) : Infinity;
    const taux = parseFloat(tranche.taux);

    if (baseAnnuelle <= min) break;
    const borneHaute = Math.min(baseAnnuelle, max);
    const montantDansLaTranche = borneHaute - min;
    if (montantDansLaTranche > 0) {
      iutsAnnuel += montantDansLaTranche * taux;
    }
  }

  return arrondir(iutsAnnuel / 12);
}

/**
 * Calcule le salaire brut
 */
function calculerSalaireBrut(employe, saisie, lignesRubriques) {
  const salaire_base = parseFloat(employe.salaire_base);
  const taux_horaire = salaire_base / 173.33;

  const hs25 = parseFloat(saisie.heures_supp_25 || 0);
  const hs50 = parseFloat(saisie.heures_supp_50 || 0);
  const absences = parseFloat(saisie.jours_absence || 0);

  const montant_hs25 = arrondir(hs25 * taux_horaire * 1.25);
  const montant_hs50 = arrondir(hs50 * taux_horaire * 1.50);
  const deduction_absence = arrondir(absences * (salaire_base / 26));

  let totalGains = 0;
  let totalRetenues = 0;
  for (const ligne of (lignesRubriques || [])) {
    if (ligne.type_rubrique === "GAIN") totalGains += parseFloat(ligne.montant);
    else totalRetenues += parseFloat(ligne.montant);
  }

  const brut = salaire_base + montant_hs25 + montant_hs50 + totalGains - deduction_absence - totalRetenues;
  return {
    salaire_brut: arrondir(Math.max(brut, 0)),
    detail_hs25: montant_hs25,
    detail_hs50: montant_hs50,
    detail_absence: deduction_absence,
  };
}

/**
 * Moteur principal
 */
function calculerBulletin(employe, config, baremes, saisie = {}, lignesRubriques = []) {
  // 1. Brut
  const { salaire_brut, detail_hs25, detail_hs50, detail_absence } =
    calculerSalaireBrut(employe, saisie, lignesRubriques);

  // 2. CNSS
  const plafond = parseFloat(config.cnss_plafond_mensuel);
  const assiette_cnss = config.cnss_actif ? arrondir(Math.min(salaire_brut, plafond)) : 0;
  const montant_cnss_salarial = config.cnss_actif ? arrondir(assiette_cnss * parseFloat(config.cnss_taux_salarial)) : 0;
  const montant_cnss_patronal = config.cnss_actif ? arrondir(assiette_cnss * parseFloat(config.cnss_taux_patronal)) : 0;

  // 3. Net Fiscal
  const salaire_net_fiscal = arrondir(salaire_brut - montant_cnss_salarial);

  // 4. Abattements IUTS
  const nb_enfants = parseInt(employe.nb_enfants_charge, 10) || 0;
  const abattement_iuts_total = arrondir(
    parseFloat(config.iuts_abattement_base || 1000) +
    (nb_enfants * parseFloat(config.iuts_abattement_par_enfant || 1000)) +
    (employe.conjoint_a_charge ? parseFloat(config.iuts_abattement_conjoint || 1000) : 0)
  );

  // 5. Base imposable IUTS
  const base_imposable_iuts = arrondir(Math.max(salaire_net_fiscal - abattement_iuts_total, 0));

  // 6. IUTS progressif
  const montant_iuts = calculerIUTS(base_imposable_iuts, baremes);

  // 7. Net Intermediaire
  const salaire_net_intermediaire = arrondir(salaire_net_fiscal - montant_iuts);

  // 8. FSP — REGLE CRITIQUE: calcule sur Net Intermediaire, taux lu depuis config
  const fsp_actif = config.fsp_actif === true;
  const fsp_taux = parseFloat(config.fsp_taux || 0);
  const montant_fsp = fsp_actif ? arrondir(Math.max(salaire_net_intermediaire, 0) * fsp_taux) : 0;

  // 9. Net a Payer
  const acompte = parseFloat(saisie.acompte || 0);
  const salaire_net_a_payer = arrondir(salaire_net_intermediaire - montant_fsp - acompte);

  return {
    salaire_brut, detail_hs25, detail_hs50, detail_absence,
    assiette_cnss, montant_cnss_salarial, montant_cnss_patronal,
    salaire_net_fiscal, abattement_iuts_total, base_imposable_iuts, montant_iuts,
    salaire_net_intermediaire,
    fsp_actif, fsp_taux_applique: fsp_taux, montant_fsp,
    salaire_net_a_payer,
  };
}

module.exports = { calculerBulletin, calculerIUTS, calculerSalaireBrut };

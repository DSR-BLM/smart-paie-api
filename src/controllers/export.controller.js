/**
 * SMART-PAIE — Export PDF (Puppeteer) et Excel (ExcelJS)
 * Phase 4 : Édition des documents
 */
const path = require("path");
const fs = require("fs");
const { Bulletin, Employe, PeriodePaie, LigneBulletin, Entreprise } = require("../models");

// Formatage FCFA
function fcfa(val) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(parseFloat(val || 0)));
}

function pct(val) {
  return (parseFloat(val || 0) * 100).toFixed(2) + " %";
}

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

async function getBulletinComplet(id, id_entreprise, role) {
  const where = { id };
  if (role !== "SUPER_ADMIN") where.id_entreprise = id_entreprise;
  return Bulletin.findOne({
    where,
    include: [
      { model: Employe, as: "employe" },
      { model: PeriodePaie, as: "periode" },
      { model: LigneBulletin, as: "lignes", order: [["ordre_affichage","ASC"]] },
      { model: Entreprise, as: "entreprise" },
    ],
  });
}

function genererHTMLBulletin(b) {
  const e = b.employe;
  const p = b.periode;
  const ent = b.entreprise;
  const mois = MOIS_FR[(p.mois || 1) - 1];

  const lignesGains = (b.lignes || []).filter(l => l.type_rubrique === "GAIN");
  const lignesRetenues = (b.lignes || []).filter(l => l.type_rubrique === "RETENUE");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 11px; color: #333; background: white; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a5276; padding-bottom: 10px; margin-bottom: 15px; }
  .entreprise-name { font-size: 16px; font-weight: bold; color: #1a5276; }
  .bulletin-title { font-size: 14px; font-weight: bold; text-align: right; color: #1a5276; }
  .periode-badge { background: #1a5276; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin-top: 4px; }
  .employe-section { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .field { display: flex; gap: 6px; }
  .field label { font-weight: bold; color: #555; min-width: 130px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .section-header { background: #1a5276; color: white; padding: 5px 8px; font-weight: bold; font-size: 11px; }
  td, th { padding: 4px 8px; border: 1px solid #dee2e6; }
  th { background: #eaf2ff; font-weight: bold; text-align: left; }
  .montant { text-align: right; font-family: monospace; }
  .row-odd { background: #f8f9fa; }
  .totaux-section { margin-top: 15px; border-top: 2px solid #1a5276; }
  .totaux-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
  .total-box { border: 1px solid #dee2e6; border-radius: 4px; padding: 8px; }
  .total-box .label { color: #666; font-size: 10px; }
  .total-box .valeur { font-size: 14px; font-weight: bold; color: #1a5276; text-align: right; }
  .net-a-payer { background: #1a5276; color: white; border-radius: 6px; padding: 12px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
  .net-a-payer .label { font-size: 14px; font-weight: bold; }
  .net-a-payer .montant { font-size: 20px; font-weight: bold; }
  .fsp-line { background: #fff3cd; border: 1px solid #ffc107; }
  .footer { margin-top: 20px; border-top: 1px solid #dee2e6; padding-top: 8px; font-size: 9px; color: #888; display: flex; justify-content: space-between; }
  .signature-zone { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .signature-box { border-top: 1px solid #333; padding-top: 6px; text-align: center; font-size: 10px; color: #666; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="entreprise-name">${ent?.nom || "Entreprise"}</div>
      <div style="font-size:10px; color:#666">${ent?.adresse || ""} ${ent?.ifu ? "| IFU : " + ent.ifu : ""}</div>
    </div>
    <div style="text-align:right">
      <div class="bulletin-title">BULLETIN DE PAIE</div>
      <div class="periode-badge">${mois} ${p.annee}</div>
    </div>
  </div>

  <div class="employe-section">
    <div class="field"><label>Matricule :</label><span>${e.matricule}</span></div>
    <div class="field"><label>Nom & Prénom :</label><span>${e.nom} ${e.prenom}</span></div>
    <div class="field"><label>Poste :</label><span>${e.poste}</span></div>
    <div class="field"><label>Date d'embauche :</label><span>${e.date_embauche}</span></div>
    <div class="field"><label>Type de contrat :</label><span>${e.type_contrat}</span></div>
    <div class="field"><label>N° CNSS :</label><span>${e.numero_cnss || "—"}</span></div>
    <div class="field"><label>Situation familiale :</label><span>${e.situation_familiale} — ${e.nb_enfants_charge} enfant(s)</span></div>
    <div class="field"><label>Banque / Compte :</label><span>${e.banque || "—"} ${e.numero_compte_bancaire || ""}</span></div>
  </div>

  <table>
    <tr><td colspan="3" class="section-header">ÉLÉMENTS DE RÉMUNÉRATION</td></tr>
    <tr><th>Désignation</th><th class="montant">Base</th><th class="montant">Montant (FCFA)</th></tr>
    <tr><td>Salaire de base</td><td class="montant">${fcfa(e.salaire_base)}</td><td class="montant">${fcfa(e.salaire_base)}</td></tr>
    ${parseFloat(b.detail_hs25 || 0) > 0 ? `<tr class="row-odd"><td>Heures supplémentaires (25%)</td><td class="montant">${b.heures_supp_25}h</td><td class="montant">${fcfa(b.detail_hs25)}</td></tr>` : ""}
    ${parseFloat(b.detail_hs50 || 0) > 0 ? `<tr><td>Heures supplémentaires (50%)</td><td class="montant">${b.heures_supp_50}h</td><td class="montant">${fcfa(b.detail_hs50)}</td></tr>` : ""}
    ${lignesGains.map((l, i) => `<tr class="${i % 2 === 0 ? 'row-odd' : ''}"><td>${l.libelle_snapshot}</td><td class="montant">—</td><td class="montant">${fcfa(l.montant)}</td></tr>`).join("")}
    ${parseFloat(b.detail_absence || 0) > 0 ? `<tr style="color:#c0392b"><td>Absences déduites</td><td class="montant">${b.jours_absence}j</td><td class="montant">- ${fcfa(b.detail_absence)}</td></tr>` : ""}
    <tr style="font-weight:bold; background:#eaf2ff"><td colspan="2">SALAIRE BRUT</td><td class="montant">${fcfa(b.salaire_brut)}</td></tr>
  </table>

  <table>
    <tr><td colspan="3" class="section-header">COTISATIONS ET RETENUES</td></tr>
    <tr><th>Désignation</th><th class="montant">Taux</th><th class="montant">Montant (FCFA)</th></tr>
    <tr><td>Cotisation CNSS (part salariale)</td><td class="montant">${pct(b.fsp_taux_applique ? "0.055" : 0)}</td><td class="montant">- ${fcfa(b.montant_cnss_salarial)}</td></tr>
    <tr class="row-odd"><td>IUTS (Impôt sur Traitements et Salaires)</td><td class="montant">Progressif</td><td class="montant">- ${fcfa(b.montant_iuts)}</td></tr>
    ${parseFloat(b.montant_fsp || 0) > 0 ? `<tr class="fsp-line"><td>${b.fsp_libelle || "Fonds de Soutien Patriotique"} (${pct(b.fsp_taux_applique)})</td><td class="montant">${pct(b.fsp_taux_applique)}</td><td class="montant">- ${fcfa(b.montant_fsp)}</td></tr>` : ""}
    ${lignesRetenues.map(l => `<tr><td>${l.libelle_snapshot}</td><td class="montant">—</td><td class="montant">- ${fcfa(l.montant)}</td></tr>`).join("")}
    ${parseFloat(b.acompte || 0) > 0 ? `<tr><td>Acompte sur salaire</td><td class="montant">—</td><td class="montant">- ${fcfa(b.acompte)}</td></tr>` : ""}
  </table>

  <div class="totaux-section">
    <div class="totaux-grid">
      <div class="total-box"><div class="label">Salaire Net Fiscal</div><div class="valeur">${fcfa(b.salaire_net_fiscal)} FCFA</div></div>
      <div class="total-box"><div class="label">Base imposable IUTS</div><div class="valeur">${fcfa(b.base_imposable_iuts)} FCFA</div></div>
      <div class="total-box"><div class="label">CNSS Patronale (charge employeur)</div><div class="valeur">${fcfa(b.montant_cnss_patronal)} FCFA</div></div>
      <div class="total-box"><div class="label">Abattement IUTS</div><div class="valeur">${fcfa(b.abattement_iuts_total)} FCFA</div></div>
    </div>
    <div class="net-a-payer">
      <div class="label">NET À PAYER</div>
      <div class="montant">${fcfa(b.salaire_net_a_payer)} FCFA</div>
    </div>
  </div>

  <div class="signature-zone">
    <div class="signature-box">Signature de l'employeur</div>
    <div class="signature-box">Signature de l'employé (pour acquit)</div>
  </div>

  <div class="footer">
    <span>SMART-PAIE — Bulletin généré le ${new Date().toLocaleDateString("fr-FR")}</span>
    <span>Document confidentiel — Ne pas divulguer</span>
  </div>
</div>
</body>
</html>`;
}

async function telechargerPDF(req, res) {
  try {
    const { id } = req.params;
    const { id_entreprise, role } = req.utilisateur;
    const bulletin = await getBulletinComplet(id, id_entreprise, role);
    if (!bulletin) return res.status(404).json({ success: false, message: "Bulletin introuvable." });

    let puppeteer;
    try { puppeteer = require("puppeteer"); } catch {
      // Fallback : renvoyer le HTML si Puppeteer n'est pas installé
      const html = genererHTMLBulletin(bulletin);
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `inline; filename="bulletin_${id}.html"`);
      return res.send(html);
    }

    const html = genererHTMLBulletin(bulletin);
    const browser = await puppeteer.launch({ args: ["--no-sandbox","--disable-setuid-sandbox"], headless: "new" });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", bottom: "0", left: "0", right: "0" } });
    await browser.close();

    const mois = MOIS_FR[(bulletin.periode.mois || 1) - 1];
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="bulletin_${bulletin.employe.matricule}_${mois}_${bulletin.periode.annee}.pdf"`);
    res.send(pdf);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function exporterExcel(req, res) {
  try {
    const ExcelJS = require("exceljs");
    const { id_periode } = req.params;
    const { id_entreprise } = req.utilisateur;

    const bulletins = await Bulletin.findAll({
      where: { id_periode, id_entreprise },
      include: [{ model: Employe, as: "employe" }, { model: PeriodePaie, as: "periode" }],
      order: [[{ model: Employe, as: "employe" }, "nom", "ASC"]],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "SMART-PAIE";
    const ws = wb.addWorksheet("Journal de Paie");

    // En-têtes
    const colonnes = [
      { header: "Matricule", key: "matricule", width: 14 },
      { header: "Nom", key: "nom", width: 18 },
      { header: "Prénom", key: "prenom", width: 18 },
      { header: "Poste", key: "poste", width: 22 },
      { header: "Salaire Brut", key: "salaire_brut", width: 16, style: { numFmt: "#,##0" } },
      { header: "CNSS Salariale", key: "cnss_sal", width: 16, style: { numFmt: "#,##0" } },
      { header: "CNSS Patronale", key: "cnss_pat", width: 16, style: { numFmt: "#,##0" } },
      { header: "Net Fiscal", key: "net_fiscal", width: 16, style: { numFmt: "#,##0" } },
      { header: "IUTS", key: "iuts", width: 14, style: { numFmt: "#,##0" } },
      { header: "Net Intermédiaire", key: "net_inter", width: 18, style: { numFmt: "#,##0" } },
      { header: "Retenue_FSP", key: "fsp", width: 16, style: { numFmt: "#,##0" } },  // Colonne obligatoire
      { header: "FSP Actif", key: "fsp_actif", width: 10 },
      { header: "Taux FSP", key: "fsp_taux", width: 10 },
      { header: "Acompte", key: "acompte", width: 14, style: { numFmt: "#,##0" } },
      { header: "NET À PAYER", key: "net_a_payer", width: 16, style: { numFmt: "#,##0" } },
    ];
    ws.columns = colonnes;

    // Style en-tête
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
      cell.alignment = { horizontal: "center" };
    });

    // Données
    let totalBrut = 0, totalNet = 0, totalFSP = 0;
    bulletins.forEach((b, i) => {
      const row = ws.addRow({
        matricule: b.employe.matricule,
        nom: b.employe.nom,
        prenom: b.employe.prenom,
        poste: b.employe.poste,
        salaire_brut: parseFloat(b.salaire_brut || 0),
        cnss_sal: parseFloat(b.montant_cnss_salarial || 0),
        cnss_pat: parseFloat(b.montant_cnss_patronal || 0),
        net_fiscal: parseFloat(b.salaire_net_fiscal || 0),
        iuts: parseFloat(b.montant_iuts || 0),
        net_inter: parseFloat(b.salaire_net_intermediaire || 0),
        fsp: parseFloat(b.montant_fsp || 0),
        fsp_actif: b.fsp_actif ? "Oui" : "Non",
        fsp_taux: parseFloat(b.fsp_taux_applique || 0) * 100 + " %",
        acompte: parseFloat(b.acompte || 0),
        net_a_payer: parseFloat(b.salaire_net_a_payer || 0),
      });
      if (i % 2 === 1) row.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F8FF" } }; });
      // Mettre en évidence la colonne FSP si > 0
      const fspCell = row.getCell("fsp");
      if (parseFloat(b.montant_fsp || 0) > 0) fspCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
      totalBrut += parseFloat(b.salaire_brut || 0);
      totalNet += parseFloat(b.salaire_net_a_payer || 0);
      totalFSP += parseFloat(b.montant_fsp || 0);
    });

    // Ligne totaux
    const totalRow = ws.addRow({ matricule: "TOTAUX", salaire_brut: totalBrut, fsp: totalFSP, net_a_payer: totalNet });
    totalRow.eachCell(c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDAECF7" } }; });

    ws.autoFilter = { from: "A1", to: `O1` };

    const periode = bulletins[0]?.periode;
    const mois = periode ? MOIS_FR[(periode.mois || 1) - 1] : "Export";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="journal_paie_${mois}_${periode?.annee || ""}.xlsx"`);
    await wb.xlsx.write(res);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

module.exports = { telechargerPDF, exporterExcel, genererHTMLBulletin };

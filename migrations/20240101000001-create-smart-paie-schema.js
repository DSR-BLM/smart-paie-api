"use strict";

/**
 * SMART-PAIE — Migration Principale (Phase 1)
 * Crée l'intégralité du schéma relationnel multi-entreprises
 *
 * Règles critiques respectées :
 *  • DECIMAL(15,4) pour tous les montants monétaires et taux fiscaux
 *  • DECIMAL(5,4)  pour les taux proportionnels (ex: 0.0100 = 1%)
 *  • Soft Delete (deleted_at) sur la table employes
 *  • Table configurations_legales avec fsp_actif + fsp_taux
 *  • Isolation multi-entreprises via id_entreprise sur toutes les tables liées
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ══════════════════════════════════════════════════════════
      // 1. TABLE : entreprises
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "entreprises",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          nom: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          sigle: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          ifu: {
            type: Sequelize.STRING(50),
            allowNull: true,
            unique: true,
            comment: "Identifiant Fiscal Unique (DGI Burkina)",
          },
          rccm: {
            type: Sequelize.STRING(100),
            allowNull: true,
            comment: "Registre du Commerce et du Crédit Mobilier",
          },
          adresse: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          telephone: {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          email: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          secteur_activite: {
            type: Sequelize.STRING(150),
            allowNull: true,
          },
          logo_url: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          actif: {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
            allowNull: false,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      // ══════════════════════════════════════════════════════════
      // 2. TABLE : utilisateurs (RBAC)
      //    Rôles : SUPER_ADMIN | ADMIN_ENTREPRISE | COMPTABLE | EMPLOYE
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "utilisateurs",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          id_entreprise: {
            type: Sequelize.UUID,
            allowNull: true, // NULL pour SuperAdmin (accès global)
            references: { model: "entreprises", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          nom: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          prenom: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          email: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true,
          },
          mot_de_passe_hash: {
            type: Sequelize.STRING(255),
            allowNull: false,
            comment: "Hash Bcrypt rounds=12",
          },
          role: {
            type: Sequelize.ENUM(
              "SUPER_ADMIN",
              "ADMIN_ENTREPRISE",
              "COMPTABLE",
              "EMPLOYE"
            ),
            allowNull: false,
            defaultValue: "EMPLOYE",
          },
          actif: {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
          },
          derniere_connexion: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          token_refresh: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      // ══════════════════════════════════════════════════════════
      // 3. TABLE : configurations_legales
      //    Paramètres fiscaux — JAMAIS hardcodés dans le code
      //    Un enregistrement par entreprise (ou global id_entreprise = NULL)
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "configurations_legales",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          id_entreprise: {
            type: Sequelize.UUID,
            allowNull: true,
            unique: true, // 1 config par entreprise
            references: { model: "entreprises", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
            comment: "NULL = configuration globale système",
          },
          // ── CNSS ────────────────────────────────
          cnss_taux_salarial: {
            type: "DECIMAL(5,4)",
            allowNull: false,
            defaultValue: "0.0550",
            comment: "Taux CNSS part salariale (ex: 5.5% = 0.0550)",
          },
          cnss_taux_patronal: {
            type: "DECIMAL(5,4)",
            allowNull: false,
            defaultValue: "0.1600",
            comment: "Taux CNSS part patronale (ex: 16% = 0.1600)",
          },
          cnss_plafond_mensuel: {
            type: "DECIMAL(15,4)",
            allowNull: false,
            defaultValue: "425000.0000",
            comment: "Plafond mensuel de cotisation CNSS en FCFA",
          },
          cnss_actif: {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
            allowNull: false,
          },
          // ── FSP (Fonds de Soutien Patriotique) ──
          fsp_actif: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            comment: "Toggle pour activer/désactiver la retenue FSP",
          },
          fsp_taux: {
            type: "DECIMAL(5,4)",
            allowNull: false,
            defaultValue: "0.0100",
            comment:
              "Taux FSP (ex: 1% = 0.0100). Valeur présente même si fsp_actif=false.",
          },
          fsp_libelle: {
            type: Sequelize.STRING(200),
            defaultValue: "Fonds de Soutien Patriotique",
            comment: "Libellé affiché sur le bulletin si FSP actif",
          },
          // ── Abattements IUTS ─────────────────────
          iuts_abattement_base: {
            type: "DECIMAL(15,4)",
            allowNull: false,
            defaultValue: "1000.0000",
            comment: "Abattement IUTS de base (personne seule)",
          },
          iuts_abattement_par_enfant: {
            type: "DECIMAL(15,4)",
            allowNull: false,
            defaultValue: "1000.0000",
            comment: "Abattement IUTS supplémentaire par enfant à charge",
          },
          iuts_abattement_conjoint: {
            type: "DECIMAL(15,4)",
            allowNull: false,
            defaultValue: "1000.0000",
            comment: "Abattement IUTS pour conjoint(e) à charge",
          },
          // ── Métadonnées ───────────────────────────
          version: {
            type: Sequelize.INTEGER,
            defaultValue: 1,
            comment: "Versioning pour audit des modifications",
          },
          modifie_par: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "utilisateurs", key: "id" },
            onDelete: "SET NULL",
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      // ══════════════════════════════════════════════════════════
      // 4. TABLE : baremes_iuts
      //    Tranches de l'Impôt Unique sur les Traitements et Salaires
      //    Source : Code Général des Impôts du Burkina Faso
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "baremes_iuts",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          id_configuration: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "configurations_legales", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          tranche_min: {
            type: "DECIMAL(15,4)",
            allowNull: false,
            comment: "Borne inférieure de la tranche (incluse)",
          },
          tranche_max: {
            type: "DECIMAL(15,4)",
            allowNull: true,
            comment: "Borne supérieure (NULL = infini pour la dernière tranche)",
          },
          taux: {
            type: "DECIMAL(5,4)",
            allowNull: false,
            comment: "Taux IUTS applicable sur cette tranche (ex: 0.2000 = 20%)",
          },
          ordre: {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: "Ordre de la tranche pour le calcul progressif",
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      // ══════════════════════════════════════════════════════════
      // 5. TABLE : employes
      //    Soft Delete activé (deleted_at / paranoid)
      //    Ancienneté calculée dynamiquement depuis date_embauche
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "employes",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          id_entreprise: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "entreprises", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          // Lien vers le compte utilisateur (si espace employé activé)
          id_utilisateur: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "utilisateurs", key: "id" },
            onDelete: "SET NULL",
          },
          // ── Identité ─────────────────────────────
          matricule: {
            type: Sequelize.STRING(50),
            allowNull: false,
            comment: "Matricule interne unique par entreprise",
          },
          nom: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          prenom: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          date_naissance: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          lieu_naissance: {
            type: Sequelize.STRING(150),
            allowNull: true,
          },
          sexe: {
            type: Sequelize.ENUM("M", "F"),
            allowNull: true,
          },
          nationalite: {
            type: Sequelize.STRING(80),
            defaultValue: "Burkinabè",
          },
          // ── Situation familiale (impact sur abattements IUTS) ──
          situation_familiale: {
            type: Sequelize.ENUM("CELIBATAIRE", "MARIE", "DIVORCE", "VEUF"),
            defaultValue: "CELIBATAIRE",
            allowNull: false,
          },
          nb_enfants_charge: {
            type: Sequelize.SMALLINT,
            defaultValue: 0,
            allowNull: false,
          },
          conjoint_a_charge: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false,
          },
          // ── Emploi ────────────────────────────────
          poste: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          categorie: {
            type: Sequelize.STRING(50),
            allowNull: true,
            comment: "Catégorie professionnelle (grille CCT)",
          },
          date_embauche: {
            type: Sequelize.DATEONLY,
            allowNull: false,
            comment:
              "Date de début du contrat. Ancienneté calculée dynamiquement.",
          },
          type_contrat: {
            type: Sequelize.ENUM("CDI", "CDD", "STAGE", "CONSULTANT"),
            defaultValue: "CDI",
            allowNull: false,
          },
          // ── Rémunération de base ──────────────────
          salaire_base: {
            type: "DECIMAL(15,4)",
            allowNull: false,
            comment: "Salaire de base mensuel en FCFA",
          },
          // ── CNSS / IFU ────────────────────────────
          numero_cnss: {
            type: Sequelize.STRING(50),
            allowNull: true,
            unique: true,
          },
          numero_ifu: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          // ── Coordonnées bancaires ─────────────────
          banque: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          numero_compte_bancaire: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          // ── Soft Delete ───────────────────────────
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: "NULL = actif ; renseigné = archivé (Soft Delete)",
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      // Contrainte unique : matricule par entreprise
      await queryInterface.addConstraint("employes", {
        fields: ["id_entreprise", "matricule"],
        type: "unique",
        name: "uq_employe_matricule_entreprise",
        transaction,
      });

      // ══════════════════════════════════════════════════════════
      // 6. TABLE : rubriques
      //    Éléments de salaire paramétrables (primes, retenues, etc.)
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "rubriques",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          id_entreprise: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "entreprises", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          code: {
            type: Sequelize.STRING(20),
            allowNull: false,
          },
          libelle: {
            type: Sequelize.STRING(200),
            allowNull: false,
          },
          type_rubrique: {
            type: Sequelize.ENUM("GAIN", "RETENUE"),
            allowNull: false,
          },
          soumis_cnss: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            comment: "Inclus dans l'assiette de cotisation CNSS",
          },
          soumis_iuts: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            comment: "Inclus dans la base imposable IUTS",
          },
          exonere: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            comment:
              "Totalement exonéré (ni CNSS ni IUTS). Prioritaire sur les deux flags ci-dessus.",
          },
          mode_calcul: {
            type: Sequelize.ENUM("MONTANT_FIXE", "POURCENTAGE_BRUT", "FORMULE"),
            defaultValue: "MONTANT_FIXE",
          },
          valeur_defaut: {
            type: "DECIMAL(15,4)",
            allowNull: true,
            comment: "Montant fixe ou taux par défaut",
          },
          actif: {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
          },
          ordre_affichage: {
            type: Sequelize.INTEGER,
            defaultValue: 100,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      await queryInterface.addConstraint("rubriques", {
        fields: ["id_entreprise", "code"],
        type: "unique",
        name: "uq_rubrique_code_entreprise",
        transaction,
      });

      // ══════════════════════════════════════════════════════════
      // 7. TABLE : periodes_paie
      //    Gère le cycle mensuel et le verrou de clôture
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "periodes_paie",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          id_entreprise: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "entreprises", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          annee: {
            type: Sequelize.SMALLINT,
            allowNull: false,
          },
          mois: {
            type: Sequelize.SMALLINT,
            allowNull: false,
            comment: "1–12",
          },
          statut: {
            type: Sequelize.ENUM("BROUILLON", "VALIDE", "CLOTURE"),
            defaultValue: "BROUILLON",
            allowNull: false,
          },
          cloture_le: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          cloture_par: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "utilisateurs", key: "id" },
            onDelete: "SET NULL",
          },
          // Snapshot du taux FSP au moment de la clôture (immuable après)
          fsp_actif_snapshot: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            comment: "Valeur de fsp_actif figée lors de la clôture",
          },
          fsp_taux_snapshot: {
            type: "DECIMAL(5,4)",
            allowNull: true,
            comment: "Taux FSP figé lors de la clôture — ne peut plus changer",
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      await queryInterface.addConstraint("periodes_paie", {
        fields: ["id_entreprise", "annee", "mois"],
        type: "unique",
        name: "uq_periode_entreprise_annee_mois",
        transaction,
      });

      // ══════════════════════════════════════════════════════════
      // 8. TABLE : bulletins
      //    Un bulletin par employé par période
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "bulletins",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          id_entreprise: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "entreprises", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          id_employe: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "employes", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          id_periode: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "periodes_paie", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          statut: {
            type: Sequelize.ENUM("BROUILLON", "VALIDE", "CLOTURE"),
            defaultValue: "BROUILLON",
          },
          // ── Éléments de saisie mensuelle ──────────
          heures_supp_25: {
            type: "DECIMAL(6,2)",
            defaultValue: "0.00",
          },
          heures_supp_50: {
            type: "DECIMAL(6,2)",
            defaultValue: "0.00",
          },
          jours_absence: {
            type: "DECIMAL(6,2)",
            defaultValue: "0.00",
          },
          acompte: {
            type: "DECIMAL(15,4)",
            defaultValue: "0.0000",
          },
          // ── Montants calculés (figés à la clôture) ─
          salaire_brut: {
            type: "DECIMAL(15,4)",
            allowNull: true,
          },
          assiette_cnss: {
            type: "DECIMAL(15,4)",
            allowNull: true,
          },
          montant_cnss_salarial: {
            type: "DECIMAL(15,4)",
            allowNull: true,
          },
          montant_cnss_patronal: {
            type: "DECIMAL(15,4)",
            allowNull: true,
          },
          salaire_net_fiscal: {
            type: "DECIMAL(15,4)",
            allowNull: true,
            comment: "Brut - CNSS salariale",
          },
          abattement_iuts_total: {
            type: "DECIMAL(15,4)",
            allowNull: true,
          },
          base_imposable_iuts: {
            type: "DECIMAL(15,4)",
            allowNull: true,
          },
          montant_iuts: {
            type: "DECIMAL(15,4)",
            allowNull: true,
          },
          salaire_net_intermediaire: {
            type: "DECIMAL(15,4)",
            allowNull: true,
            comment: "Net fiscal - IUTS (base de calcul FSP si actif)",
          },
          // ── FSP (snapshot figé) ───────────────────
          fsp_actif: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            comment: "Snapshot du toggle FSP au moment du calcul",
          },
          fsp_taux_applique: {
            type: "DECIMAL(5,4)",
            defaultValue: "0.0000",
            comment: "Taux FSP réellement appliqué (figé à la clôture)",
          },
          montant_fsp: {
            type: "DECIMAL(15,4)",
            defaultValue: "0.0000",
          },
          // ── Net final ─────────────────────────────
          salaire_net_a_payer: {
            type: "DECIMAL(15,4)",
            allowNull: true,
            comment: "Net intermédiaire - FSP - Acompte",
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      await queryInterface.addConstraint("bulletins", {
        fields: ["id_employe", "id_periode"],
        type: "unique",
        name: "uq_bulletin_employe_periode",
        transaction,
      });

      // ══════════════════════════════════════════════════════════
      // 9. TABLE : lignes_bulletins
      //    Détail de chaque rubrique dans le bulletin
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "lignes_bulletins",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          id_bulletin: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "bulletins", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          id_rubrique: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "rubriques", key: "id" },
            onDelete: "SET NULL",
          },
          libelle_snapshot: {
            type: Sequelize.STRING(200),
            allowNull: false,
            comment: "Libellé figé au moment du calcul",
          },
          type_rubrique: {
            type: Sequelize.ENUM("GAIN", "RETENUE"),
            allowNull: false,
          },
          soumis_cnss: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
          },
          soumis_iuts: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
          },
          montant: {
            type: "DECIMAL(15,4)",
            allowNull: false,
          },
          ordre_affichage: {
            type: Sequelize.INTEGER,
            defaultValue: 100,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      // ══════════════════════════════════════════════════════════
      // 10. TABLE : logs_activites (Piste d'audit — Phase 5)
      //     Enregistre toutes les actions sensibles
      // ══════════════════════════════════════════════════════════
      await queryInterface.createTable(
        "logs_activites",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          id_utilisateur: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "utilisateurs", key: "id" },
            onDelete: "SET NULL",
          },
          id_entreprise: {
            type: Sequelize.UUID,
            allowNull: true,
          },
          action: {
            type: Sequelize.STRING(100),
            allowNull: false,
            comment:
              "Ex: CONFIG_FSP_UPDATE, EMPLOYE_ARCHIVE, PERIODE_CLOTURE, USER_LOGIN",
          },
          entite: {
            type: Sequelize.STRING(80),
            allowNull: true,
            comment: "Nom de la table/entité impactée",
          },
          entite_id: {
            type: Sequelize.UUID,
            allowNull: true,
          },
          donnees_avant: {
            type: Sequelize.JSONB,
            allowNull: true,
            comment: "Snapshot JSON des données avant modification",
          },
          donnees_apres: {
            type: Sequelize.JSONB,
            allowNull: true,
            comment: "Snapshot JSON des données après modification",
          },
          ip_address: {
            type: Sequelize.STRING(45),
            allowNull: true,
          },
          user_agent: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        },
        { transaction }
      );

      // ══════════════════════════════════════════════════════════
      // INDEX DE PERFORMANCE
      // ══════════════════════════════════════════════════════════
      const indexes = [
        // employes
        { table: "employes", fields: ["id_entreprise"], name: "idx_employes_entreprise" },
        { table: "employes", fields: ["deleted_at"], name: "idx_employes_soft_delete" },
        { table: "employes", fields: ["numero_cnss"], name: "idx_employes_cnss" },
        // bulletins
        { table: "bulletins", fields: ["id_entreprise"], name: "idx_bulletins_entreprise" },
        { table: "bulletins", fields: ["id_employe"], name: "idx_bulletins_employe" },
        { table: "bulletins", fields: ["id_periode"], name: "idx_bulletins_periode" },
        { table: "bulletins", fields: ["statut"], name: "idx_bulletins_statut" },
        // periodes_paie
        { table: "periodes_paie", fields: ["id_entreprise", "annee", "mois"], name: "idx_periodes_annee_mois" },
        // logs_activites
        { table: "logs_activites", fields: ["id_utilisateur"], name: "idx_logs_utilisateur" },
        { table: "logs_activites", fields: ["action"], name: "idx_logs_action" },
        { table: "logs_activites", fields: ["created_at"], name: "idx_logs_date" },
      ];

      for (const idx of indexes) {
        await queryInterface.addIndex(idx.table, idx.fields, {
          name: idx.name,
          transaction,
        });
      }

      await transaction.commit();
      console.log("✅ SMART-PAIE : Migration Phase 1 terminée avec succès.");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ SMART-PAIE : Échec de la migration :", error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Suppression dans l'ordre inverse (respect des FK)
      const tables = [
        "logs_activites",
        "lignes_bulletins",
        "bulletins",
        "periodes_paie",
        "rubriques",
        "employes",
        "baremes_iuts",
        "configurations_legales",
        "utilisateurs",
        "entreprises",
      ];
      for (const table of tables) {
        await queryInterface.dropTable(table, { transaction, cascade: true });
      }
      // Supprimer les ENUM créés par Sequelize
      const enums = [
        "enum_utilisateurs_role",
        "enum_employes_sexe",
        "enum_employes_situation_familiale",
        "enum_employes_type_contrat",
        "enum_rubriques_type_rubrique",
        "enum_rubriques_mode_calcul",
        "enum_periodes_paie_statut",
        "enum_bulletins_statut",
        "enum_lignes_bulletins_type_rubrique",
      ];
      for (const enumType of enums) {
        await queryInterface.sequelize.query(
          `DROP TYPE IF EXISTS "${enumType}" CASCADE;`,
          { transaction }
        );
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};

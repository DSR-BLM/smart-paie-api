/**
 * SMART-PAIE — Middlewares d'Authentification & Autorisation RBAC
 *
 * Matrice des rôles :
 * ┌─────────────────────────┬────────────┬──────────────────┬───────────┬─────────┐
 * │ Permission              │ SUPER_ADMIN│ ADMIN_ENTREPRISE │ COMPTABLE │ EMPLOYE │
 * ├─────────────────────────┼────────────┼──────────────────┼───────────┼─────────┤
 * │ Gérer les entreprises   │     ✓      │                  │           │         │
 * │ Configurer taux IUTS    │     ✓      │                  │           │         │
 * │ Toggle/modifier FSP     │     ✓      │                  │           │         │
 * │ Gérer utilisateurs      │     ✓      │       ✓          │           │         │
 * │ Gérer employés          │     ✓      │       ✓          │           │         │
 * │ Saisir paie mensuelle   │     ✓      │       ✓          │     ✓     │         │
 * │ Valider bulletins       │     ✓      │       ✓          │     ✓     │         │
 * │ Clôturer période        │     ✓      │       ✓          │           │         │
 * │ Exporter journaux       │     ✓      │       ✓          │     ✓     │         │
 * │ Voir ses bulletins      │     ✓      │       ✓          │     ✓     │    ✓    │
 * └─────────────────────────┴────────────┴──────────────────┴───────────┴─────────┘
 */

const jwt = require("jsonwebtoken");

/** Hiérarchie des rôles pour comparaisons rapides */
const ROLES = Object.freeze({
  SUPER_ADMIN:       4,
  ADMIN_ENTREPRISE:  3,
  COMPTABLE:         2,
  EMPLOYE:           1,
});

/**
 * Vérifie et décode le token JWT en header Authorization: Bearer <token>
 * Attache req.utilisateur = { id, email, role, id_entreprise }
 */
const authentifier = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      code: "AUTH_MISSING_TOKEN",
      message: "Token d'authentification manquant.",
    });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = {
      id:            decoded.id,
      email:         decoded.email,
      role:          decoded.role,
      id_entreprise: decoded.id_entreprise || null,
    };
    next();
  } catch (err) {
    const code =
      err.name === "TokenExpiredError"
        ? "AUTH_TOKEN_EXPIRED"
        : "AUTH_TOKEN_INVALID";
    return res.status(401).json({ success: false, code, message: err.message });
  }
};

/**
 * Autorise uniquement les rôles listés.
 * Usage : router.get("/...", authentifier, autoriser("SUPER_ADMIN", "ADMIN_ENTREPRISE"), handler)
 */
const autoriser = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!req.utilisateur) {
      return res.status(401).json({ success: false, code: "AUTH_REQUIRED" });
    }
    if (!rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({
        success: false,
        code: "AUTH_FORBIDDEN",
        message: `Accès refusé. Rôles requis : ${rolesAutorises.join(", ")}.`,
      });
    }
    next();
  };
};

/**
 * Autorise si le rôle est >= au rôle minimum requis (hiérarchie).
 * Usage : router.get("/...", authentifier, niveauMinimum("COMPTABLE"), handler)
 */
const niveauMinimum = (roleMinimum) => {
  return (req, res, next) => {
    if (!req.utilisateur) {
      return res.status(401).json({ success: false, code: "AUTH_REQUIRED" });
    }
    const niveauUser = ROLES[req.utilisateur.role] || 0;
    const niveauRequis = ROLES[roleMinimum] || 0;
    if (niveauUser < niveauRequis) {
      return res.status(403).json({
        success: false,
        code: "AUTH_INSUFFICIENT_LEVEL",
        message: `Niveau minimum requis : ${roleMinimum}.`,
      });
    }
    next();
  };
};

/**
 * Vérifie que l'utilisateur appartient à l'entreprise demandée
 * (extraite de req.params.id_entreprise ou req.body.id_entreprise).
 * Le SuperAdmin est exempté de cette vérification.
 */
const verifierEntreprise = (req, res, next) => {
  const { utilisateur } = req;
  if (!utilisateur) {
    return res.status(401).json({ success: false, code: "AUTH_REQUIRED" });
  }

  // SuperAdmin accède à tout
  if (utilisateur.role === "SUPER_ADMIN") return next();

  const idEntrepriseRequis =
    req.params.id_entreprise ||
    req.body?.id_entreprise ||
    req.query?.id_entreprise;

  if (
    idEntrepriseRequis &&
    utilisateur.id_entreprise !== idEntrepriseRequis
  ) {
    return res.status(403).json({
      success: false,
      code: "AUTH_CROSS_COMPANY",
      message: "Accès interdit : cette ressource appartient à une autre entreprise.",
    });
  }
  next();
};

/**
 * Middleware spécifique FSP : seul SUPER_ADMIN peut modifier le taux/toggle FSP.
 */
const superAdminSeulement = autoriser("SUPER_ADMIN");

/**
 * Raccourci pour les routes de configuration légale (taux, barèmes)
 */
const adminOuSuperAdmin = autoriser("SUPER_ADMIN", "ADMIN_ENTREPRISE");

/**
 * Raccourci pour opérations de paie (saisie, calcul, export)
 */
const equipeComptable = autoriser(
  "SUPER_ADMIN",
  "ADMIN_ENTREPRISE",
  "COMPTABLE"
);

module.exports = {
  authentifier,
  autoriser,
  niveauMinimum,
  verifierEntreprise,
  superAdminSeulement,
  adminOuSuperAdmin,
  equipeComptable,
  ROLES,
};

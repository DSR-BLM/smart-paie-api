const router = require("express").Router();
const { listerParPeriode, calculer, getBulletin, cloturer, journalPaie } = require("../controllers/bulletin.controller");
const { authentifier, equipeComptable, adminOuSuperAdmin } = require("../middlewares/auth.middleware");
router.get("/periode/:id_periode", authentifier, equipeComptable, listerParPeriode);
router.post("/calculer", authentifier, equipeComptable, calculer);
router.get("/:id", authentifier, getBulletin);
router.post("/periode/:id_periode/cloturer", authentifier, adminOuSuperAdmin, cloturer);
router.get("/periode/:id_periode/journal", authentifier, equipeComptable, journalPaie);
module.exports = router;

const router = require("express").Router();
const { lister, creer, modifier, supprimer } = require("../controllers/rubrique.controller");
const { authentifier, equipeComptable, adminOuSuperAdmin } = require("../middlewares/auth.middleware");
router.get("/", authentifier, equipeComptable, lister);
router.post("/", authentifier, adminOuSuperAdmin, creer);
router.put("/:id", authentifier, adminOuSuperAdmin, modifier);
router.delete("/:id", authentifier, adminOuSuperAdmin, supprimer);
module.exports = router;

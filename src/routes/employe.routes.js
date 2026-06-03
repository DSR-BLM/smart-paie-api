const router = require("express").Router();
const { lister, creer, getById, modifier, archiver } = require("../controllers/employe.controller");
const { authentifier, adminOuSuperAdmin, equipeComptable } = require("../middlewares/auth.middleware");
router.get("/", authentifier, equipeComptable, lister);
router.post("/", authentifier, adminOuSuperAdmin, creer);
router.get("/:id", authentifier, equipeComptable, getById);
router.put("/:id", authentifier, adminOuSuperAdmin, modifier);
router.delete("/:id", authentifier, adminOuSuperAdmin, archiver);
module.exports = router;

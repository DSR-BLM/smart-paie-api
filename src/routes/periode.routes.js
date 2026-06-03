const router = require("express").Router();
const { lister, creer } = require("../controllers/periode.controller");
const { authentifier, equipeComptable, adminOuSuperAdmin } = require("../middlewares/auth.middleware");
router.get("/", authentifier, equipeComptable, lister);
router.post("/", authentifier, adminOuSuperAdmin, creer);
module.exports = router;

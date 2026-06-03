const router = require("express").Router();
const { lister, creer, modifier } = require("../controllers/entreprise.controller");
const { authentifier, superAdminSeulement } = require("../middlewares/auth.middleware");
router.get("/", authentifier, superAdminSeulement, lister);
router.post("/", authentifier, superAdminSeulement, creer);
router.put("/:id", authentifier, superAdminSeulement, modifier);
module.exports = router;

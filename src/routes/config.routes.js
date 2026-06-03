const router = require("express").Router();
const { getConfig, updateConfig, updateBaremes } = require("../controllers/config.controller");
const { authentifier, superAdminSeulement } = require("../middlewares/auth.middleware");
router.get("/", authentifier, getConfig);
router.put("/:id", authentifier, superAdminSeulement, updateConfig);
router.put("/:id_configuration/baremes", authentifier, superAdminSeulement, updateBaremes);
module.exports = router;

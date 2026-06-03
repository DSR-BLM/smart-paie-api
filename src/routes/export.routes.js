const router = require("express").Router();
const { telechargerPDF, exporterExcel } = require("../controllers/export.controller");
const { authentifier } = require("../middlewares/auth.middleware");
router.get("/bulletin/:id/pdf", authentifier, telechargerPDF);
router.get("/periode/:id_periode/excel", authentifier, exporterExcel);
module.exports = router;

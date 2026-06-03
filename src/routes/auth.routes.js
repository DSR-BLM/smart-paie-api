const router = require("express").Router();
const { login, logout, profil, validerConnexion } = require("../controllers/auth.controller");
const { authentifier } = require("../middlewares/auth.middleware");
router.post("/login", validerConnexion, login);
router.post("/logout", authentifier, logout);
router.get("/profil", authentifier, profil);
module.exports = router;

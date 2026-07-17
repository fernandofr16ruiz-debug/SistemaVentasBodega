const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios');

router.post('/login', usuariosController.login);
router.get('/', usuariosController.listarUsuarios);

module.exports = router;
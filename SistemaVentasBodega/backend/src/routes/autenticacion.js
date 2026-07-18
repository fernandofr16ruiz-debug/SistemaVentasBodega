const express = require('express');
const router = express.Router();
const AutenticacionController = require('../controllers/autenticacion');

// REGISTRO
router.post('/registro/correo', AutenticacionController.registroConCorreo);
router.post('/registro/celular', AutenticacionController.registroConCelular);
router.post('/registro/facebook', AutenticacionController.registroConFacebook);

// LOGIN
router.post('/login/correo', AutenticacionController.loginConCorreo);
router.post('/login/celular', AutenticacionController.loginConCelular);

// VERIFICACIÓN
router.post('/verificar-codigo', AutenticacionController.verificarCodigo);

// RECUPERACIÓN DE CONTRASEÑA
router.post('/recuperar-contrasena', AutenticacionController.recuperarContrasena);
router.post('/restablecer-contrasena', AutenticacionController.restablecerContrasena);

// PERFIL
router.get('/perfil/:cliente_id', AutenticacionController.obtenerPerfil);

module.exports = router;

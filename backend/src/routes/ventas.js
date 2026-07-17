const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventas');

router.post('/', ventasController.registrarVenta);
router.get('/reportes/top', ventasController.obtenerReporteTop);

module.exports = router;
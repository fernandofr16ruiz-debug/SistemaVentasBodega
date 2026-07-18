const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventas');

router.post('/', ventasController.registrarVenta);
router.get('/', ventasController.listarVentas);
router.get('/:id/detalle', ventasController.obtenerDetalle);
router.delete('/:id', ventasController.anularVenta);
router.get('/reportes/top', ventasController.obtenerReporteTop);

module.exports = router;
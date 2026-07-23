const express = require('express');
const router = express.Router();
const PagosController = require('../controllers/pagos');

// MÉTODOS DE PAGO
router.get('/metodos', PagosController.obtenerMetodos);

// PROCESAR PAGO
router.post('/procesar', PagosController.procesarPago);
router.get('/:pago_id/confirmar', PagosController.confirmarPago);
router.get('/:pago_id/estado', PagosController.obtenerEstadoPago);

// HISTORIAL
router.get('/historial/:cliente_id', PagosController.obtenerHistorialPagos);

// REVERTIR PAGO
router.post('/:pago_id/revertir', PagosController.revertirPago);

// ESTADÍSTICAS
router.get('/estadisticas', PagosController.obtenerEstadisticas);

module.exports = router;

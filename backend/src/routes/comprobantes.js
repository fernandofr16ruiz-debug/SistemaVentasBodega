const express = require('express');
const router = express.Router();
const ComprobantesController = require('../controllers/comprobantes');

// CREAR COMPROBANTE
router.post('/generar', ComprobantesController.generarComprobante);

// OBTENER COMPROBANTE
router.get('/:comprobante_id', ComprobantesController.obtenerComprobante);
router.get('/numero/:numero', ComprobantesController.obtenerPorNumero);

// OBTENER COMPROBANTES POR CLIENTE
router.get('/cliente/:cliente_correo', ComprobantesController.obtenerComprobantesCliente);

// DESCARGAR COMPROBANTE
router.get('/:comprobante_id/descargar', ComprobantesController.descargarComprobante);

// ANULAR COMPROBANTE
router.post('/:comprobante_id/anular', ComprobantesController.anularComprobante);

// ESTADÍSTICAS
router.get('/estadisticas/general', ComprobantesController.obtenerEstadisticas);

module.exports = router;

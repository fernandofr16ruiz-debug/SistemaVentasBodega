
const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productos');

router.get('/', productosController.listarProductos);       // GET /api/productos
router.post('/', productosController.crearProducto);       // POST /api/productos
router.put('/:id/stock', productosController.modificarStock); // PUT /api/productos/:id/stock

module.exports = router;
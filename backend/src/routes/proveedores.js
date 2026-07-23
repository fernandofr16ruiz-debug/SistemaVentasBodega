const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedores');

router.get('/', proveedoresController.listarProveedores);
router.post('/', proveedoresController.crearProveedor);
router.delete('/:id', proveedoresController.eliminarProveedor);

module.exports = router;

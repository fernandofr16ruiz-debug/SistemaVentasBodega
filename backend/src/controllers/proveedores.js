const ProveedoresModel = require('../models/proveedores');

const proveedoresController = {
    listarProveedores: async (req, res) => {
        try {
            const proveedores = await ProveedoresModel.obtenerTodos();
            res.status(200).json(proveedores);
        } catch (error) {
            console.error('Error en listarProveedores:', error);
            res.status(500).json({ error: 'Error interno al obtener los proveedores' });
        }
    },

    crearProveedor: async (req, res) => {
        const { ruc, empresa } = req.body;

        if (!ruc || !empresa) {
            return res.status(400).json({ error: 'RUC y Empresa (Razón Social) son campos obligatorios.' });
        }

        try {
            const nuevoId = await ProveedoresModel.crear(req.body);
            res.status(201).json({
                success: true,
                mensaje: 'Proveedor registrado exitosamente',
                id: nuevoId
            });
        } catch (error) {
            console.error('Error en crearProveedor:', error);
            res.status(500).json({ error: 'Error interno al registrar el proveedor' });
        }
    },

    eliminarProveedor: async (req, res) => {
        const { id } = req.params;

        try {
            const eliminado = await ProveedoresModel.eliminar(id);
            if (!eliminado) {
                return res.status(404).json({ error: 'El proveedor no existe' });
            }
            res.status(200).json({ success: true, mensaje: 'Proveedor eliminado correctamente' });
        } catch (error) {
            console.error('Error en eliminarProveedor:', error);
            res.status(500).json({ error: 'Error interno al eliminar el proveedor' });
        }
    }
};

module.exports = proveedoresController;

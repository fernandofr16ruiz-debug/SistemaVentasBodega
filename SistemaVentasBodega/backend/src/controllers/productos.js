
const ProductosModel = require('../models/productos');

const productosController = {
    listarProductos: async (req, res) => {
        try {
            const productos = await ProductosModel.obtenerTodos();
            res.status(200).json(productos); // 200 OK + Payload JSON
        } catch (error) {
            console.error('Error en listarProductos:', error);
            res.status(500).json({ error: 'Error interno al obtener los productos' });
        }
    },

    crearProducto: async (req, res) => {
        const { nombre, precio, stock } = req.body;

        if (!nombre || !precio || stock === undefined) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, precio o stock' });
        }

        try {
            const nuevoId = await ProductosModel.crear(req.body);
            res.status(201).json({ 
                success: true, 
                mensaje: 'Producto registrado exitosamente', 
                id: nuevoId 
            }); // 201 Created
        } catch (error) {
            console.error('Error en crearProducto:', error);
            res.status(500).json({ error: 'Error interno al registrar el producto' });
        }
    },

    modificarStock: async (req, res) => {
        const { id } = req.params;
        const { nuevoStock } = req.body;

        if (nuevoStock === undefined || nuevoStock < 0) {
            return res.status(400).json({ error: 'El stock proporcionado es inválido' });
        }

        try {
            const productoExistente = await ProductosModel.obtenerPorId(id);
            if (!productoExistente) {
                return res.status(404).json({ error: 'El producto no existe en el catálogo' }); // 404 Not Found
            }

            await ProductosModel.actualizarStock(id, nuevoStock);
            res.status(200).json({ success: true, mensaje: 'Stock actualizado correctamente' });
        } catch (error) {
            console.error('Error en modificarStock:', error);
            res.status(500).json({ error: 'Error interno al actualizar el inventario' });
        }
    },

    actualizarProducto: async (req, res) => {
        const { id } = req.params;
        const { nombre, precio, stock, categoria } = req.body;

        // Validación básica de campos
        if (!nombre || precio === undefined || stock === undefined) {
            return res.status(400).json({ error: 'Nombre, precio y stock son campos obligatorios.' });
        }

        try {
            const productoExistente = await ProductosModel.obtenerPorId(id);
            if (!productoExistente) {
                return res.status(404).json({ error: 'El producto no existe en el catálogo' });
            }

            // Llamamos al modelo para actualizar todos los campos correspondientes
            // Nota: Asegúrate de que tu ProductosModel tenga este método implementado (Paso 3)
            await ProductosModel.actualizarCampos(id, { nombre, precio, stock, categoria });
            
            res.status(200).json({ success: true, mensaje: 'Producto actualizado completamente' });
        } catch (error) {
            console.error('Error en actualizarProducto:', error);
            res.status(500).json({ error: 'Error interno al actualizar el producto' });
        }
    },

    eliminarProducto: async (req, res) => {
        const { id } = req.params;

        try {
            const productoExistente = await ProductosModel.obtenerPorId(id);
            if (!productoExistente) {
                return res.status(404).json({ error: 'El producto no existe en el catálogo' });
            }

            await ProductosModel.eliminar(id);
            res.status(200).json({ success: true, mensaje: 'Producto eliminado correctamente' });
        } catch (error) {
            console.error('Error en eliminarProducto:', error);
            // ER_ROW_IS_REFERENCED_2 (error code 1451) represents foreign key delete restriction
            if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
                return res.status(400).json({ error: 'No se puede eliminar el producto porque registra ventas históricas.' });
            }
            res.status(500).json({ error: 'Error interno al eliminar el producto' });
        }
    }
};

module.exports = productosController;
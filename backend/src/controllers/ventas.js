const db = require('../../config/db');
const VentasModel = require('../models/ventas');
const ProductosModel = require('../models/productos');

const ventasController = {
    registrarVenta: async (req, res) => {
        const { total, usuario_id, productos } = req.body;

        if (!total || !usuario_id || !productos || !productos.length) {
            return res.status(400).json({ error: 'Datos de venta incompletos o inválidos' });
        }

        // Obtener una conexión del pool para transacciones
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const codigo_tx = `TX-${Date.now()}`;
            const ventaId = await VentasModel.crearCabecera({ codigo_tx, total, usuario_id }, connection);

            for (const item of productos) {
                // Obtener el producto usando la conexión transaccional
                const producto = await ProductosModel.obtenerPorId(item.producto_id, connection);
                
                if (!producto) {
                    throw new Error(`El producto ID: ${item.producto_id} no existe.`);
                }
                
                if (producto.stock < item.cantidad) {
                    // Lanzar un error para hacer rollback de la transacción entera
                    throw new Error(`Stock insuficiente para el producto '${producto.nombre}'. Stock actual: ${producto.stock}, solicitado: ${item.cantidad}`);
                }

                // Registrar detalle de venta con precio_unitario
                await VentasModel.crearDetalle(ventaId, {
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio,
                    subtotal: item.precio * item.cantidad
                }, connection);

                // Actualizar el stock del producto
                const nuevoStock = producto.stock - item.cantidad;
                await ProductosModel.actualizarStock(item.producto_id, nuevoStock, connection);
            }

            await connection.commit();
            res.status(201).json({ success: true, codigo_tx, venta_id: ventaId });
        } catch (error) {
            await connection.rollback();
            console.error('Error en registrarVenta (Transacción revertida):', error.message);
            res.status(400).json({ error: error.message || 'Error interno al procesar la venta' });
        } finally {
            connection.release();
        }
    },

    listarVentas: async (req, res) => {
        try {
            const ventas = await VentasModel.obtenerTodas();
            res.status(200).json(ventas);
        } catch (error) {
            console.error('Error en listarVentas:', error);
            res.status(500).json({ error: 'Error interno al obtener el historial de ventas' });
        }
    },

    obtenerDetalle: async (req, res) => {
        const { id } = req.params;
        try {
            const detalles = await VentasModel.obtenerDetallePorVentaId(id);
            res.status(200).json(detalles);
        } catch (error) {
            console.error('Error en obtenerDetalle:', error);
            res.status(500).json({ error: 'Error interno al obtener los detalles de la venta' });
        }
    },

    anularVenta: async (req, res) => {
        const { id } = req.params;
        try {
            const anulado = await VentasModel.eliminar(id);
            if (!anulado) {
                return res.status(404).json({ error: 'La transacción de venta no existe' });
            }
            res.status(200).json({ success: true, mensaje: 'Transacción de venta anulada correctamente' });
        } catch (error) {
            console.error('Error en anularVenta:', error);
            res.status(500).json({ error: 'Error interno al anular la transacción de venta' });
        }
    },

    obtenerReporteTop: async (req, res) => {
        try {
            const topProductos = await VentasModel.obtenerTop7();
            res.status(200).json(topProductos);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al generar el reporte estadístico' });
        }
    }
};

module.exports = ventasController;
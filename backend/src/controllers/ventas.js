const VentasModel = require('../models/ventas');
const ProductosModel = require('../models/productos');

const ventasController = {
    registrarVenta: async (req, res) => {
        const { total, usuario_id, productos } = req.body;

        if (!total || !usuario_id || !productos || !productos.length) {
            return res.status(400).json({ error: 'Datos de venta incompletos o inválidos' });
        }

        try {
            const codigo_tx = `TX-${Date.now()}`;
            const ventaId = await VentasModel.crearCabecera({ codigo_tx, total, usuario_id });

            for (const item of productos) {
                const producto = await ProductosModel.obtenerPorId(item.producto_id);
                
                if (!producto || producto.stock < item.cantidad) {
                    return res.status(400).json({ error: `Stock insuficiente para el producto ID: ${item.producto_id}` });
                }

                await VentasModel.crearDetalle(ventaId, {
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    subtotal: item.precio * item.cantidad
                });

                const nuevoStock = producto.stock - item.cantidad;
                await ProductosModel.actualizarStock(item.producto_id, nuevoStock);
            }

            res.status(201).json({ success: true, codigo_tx, venta_id: ventaId });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error interno al procesar la venta' });
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
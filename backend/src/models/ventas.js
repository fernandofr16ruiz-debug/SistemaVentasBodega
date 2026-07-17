const db = require('../../config/db');

const VentasModel = {
    crearCabecera: async (ventaData) => {
        const { codigo_tx, total, usuario_id } = ventaData;
        const [result] = await db.execute(
            'INSERT INTO ventas (codigo_tx, total, usuario_id) VALUES (?, ?, ?)',
            [codigo_tx, total, usuario_id]
        );
        return result.insertId;
    },

    crearDetalle: async (ventaId, detalle) => {
        const [result] = await db.execute(
            'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, subtotal) VALUES (?, ?, ?, ?)',
            [ventaId, detalle.producto_id, detalle.cantidad, detalle.subtotal]
        );
        return result.affectedRows > 0;
    },

    obtenerTop7: async () => {
        const [rows] = await db.execute(
            'SELECT p.nombre AS producto, SUM(dv.subtotal) AS total_recaudado FROM detalle_ventas dv JOIN productos p ON dv.producto_id = p.id GROUP BY dv.producto_id, p.nombre ORDER BY total_recaudado DESC LIMIT 7'
        );
        return rows;
    }
};

module.exports = VentasModel;
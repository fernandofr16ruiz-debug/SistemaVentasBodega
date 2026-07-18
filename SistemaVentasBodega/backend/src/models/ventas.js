const db = require('../../config/db');

const VentasModel = {
    crearCabecera: async (ventaData, connection = null) => {
        const { codigo_tx, total, usuario_id } = ventaData;
        const executor = connection || db;
        const [result] = await executor.execute(
            'INSERT INTO ventas (codigo_tx, total, usuario_id) VALUES (?, ?, ?)',
            [codigo_tx, total, usuario_id]
        );
        return result.insertId;
    },

    crearDetalle: async (ventaId, detalle, connection = null) => {
        const executor = connection || db;
        const [result] = await executor.execute(
            'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
            [ventaId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario, detalle.subtotal]
        );
        return result.affectedRows > 0;
    },

    obtenerTodas: async () => {
        const [rows] = await db.execute(
            `SELECT v.id, v.codigo_tx, DATE_FORMAT(v.fecha, '%Y-%m-%d %H:%i:%s') AS fecha_formato, 
                    u.nombre_completo AS operador, v.total 
             FROM ventas v 
             JOIN usuarios u ON v.usuario_id = u.id 
             ORDER BY v.fecha DESC`
        );
        return rows;
    },

    obtenerDetallePorVentaId: async (ventaId) => {
        const [rows] = await db.execute(
            `SELECT dv.cantidad, p.nombre AS producto, dv.precio_unitario, dv.subtotal 
             FROM detalle_ventas dv 
             JOIN productos p ON dv.producto_id = p.id 
             WHERE dv.venta_id = ?`,
            [ventaId]
        );
        return rows;
    },

    eliminar: async (id) => {
        // Al anular la cabecera, los detalles se eliminan automáticamente gracias a la clave foránea ON DELETE CASCADE
        const [result] = await db.execute('DELETE FROM ventas WHERE id = ?', [id]);
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
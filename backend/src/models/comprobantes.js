const db = require('../../config/db');

const ComprobantesModel = {
    // Crear comprobante (boleta o ticket)
    crear: async (comprobanteData) => {
        const { venta_id, tipo_comprobante, numero_comprobante, cliente_nombre, cliente_dni, cliente_correo, subtotal, igv, total, contenido_html } = comprobanteData;
        const [result] = await db.execute(
            'INSERT INTO comprobantes (venta_id, tipo_comprobante, numero_comprobante, cliente_nombre, cliente_dni, cliente_correo, subtotal, igv, total, contenido_html, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "emitido")',
            [venta_id, tipo_comprobante, numero_comprobante, cliente_nombre || null, cliente_dni || null, cliente_correo || null, subtotal, igv || 0, total, contenido_html]
        );
        return result.insertId;
    },

    // Obtener comprobante por ID
    obtenerPorId: async (comprobanteId) => {
        const [rows] = await db.execute(
            'SELECT * FROM comprobantes WHERE id = ?',
            [comprobanteId]
        );
        return rows[0];
    },

    // Obtener comprobante por venta
    obtenerPorVenta: async (ventaId) => {
        const [rows] = await db.execute(
            'SELECT * FROM comprobantes WHERE venta_id = ?',
            [ventaId]
        );
        return rows[0];
    },

    // Obtener comprobante por número
    obtenerPorNumero: async (numeroComprobante) => {
        const [rows] = await db.execute(
            'SELECT * FROM comprobantes WHERE numero_comprobante = ?',
            [numeroComprobante]
        );
        return rows[0];
    },

    // Obtener comprobantes por cliente
    obtenerPorCliente: async (clienteCorreo) => {
        const [rows] = await db.execute(
            'SELECT id, numero_comprobante, tipo_comprobante, cliente_nombre, subtotal, igv, total, fecha_generacion FROM comprobantes WHERE cliente_correo = ? AND estado = "emitido" ORDER BY fecha_generacion DESC',
            [clienteCorreo]
        );
        return rows;
    },

    // Generar número de comprobante único
    generarNumeroComprobante: async (tipo) => {
        const prefijo = tipo === 'boleta_dni' ? 'BDN' : 'B';
        const timestamp = Date.now().toString().slice(-6);
        const numero = `${prefijo}-${timestamp}`;
        return numero;
    },

    // Actualizar estado del comprobante
    actualizarEstado: async (comprobanteId, nuevoEstado) => {
        const [result] = await db.execute(
            'UPDATE comprobantes SET estado = ? WHERE id = ?',
            [nuevoEstado, comprobanteId]
        );
        return result.affectedRows > 0;
    },

    // Obtener comprobantes por rango de fecha
    obtenerPorFecha: async (fechaInicio, fechaFin) => {
        const [rows] = await db.execute(
            'SELECT numero_comprobante, tipo_comprobante, cliente_nombre, total, fecha_generacion FROM comprobantes WHERE fecha_generacion BETWEEN ? AND ? AND estado = "emitido" ORDER BY fecha_generacion DESC',
            [fechaInicio, fechaFin]
        );
        return rows;
    },

    // Obtener total de ventas por tipo de comprobante
    obtenerTotalPorTipo: async () => {
        const [rows] = await db.execute(
            'SELECT tipo_comprobante, COUNT(*) as cantidad, SUM(total) as monto_total FROM comprobantes WHERE estado = "emitido" GROUP BY tipo_comprobante'
        );
        return rows;
    },

    // Anular comprobante
    anular: async (comprobanteId, motivo) => {
        const [result] = await db.execute(
            'UPDATE comprobantes SET estado = "anulado" WHERE id = ?',
            [comprobanteId]
        );
        return result.affectedRows > 0;
    }
};

module.exports = ComprobantesModel;

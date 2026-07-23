const db = require('../../config/db');

const PagosModel = {
    // Obtener métodos de pago disponibles
    obtenerMetodos: async () => {
        const [rows] = await db.execute(
            'SELECT id, nombre, categoria, codigo FROM metodos_pago WHERE activo = TRUE ORDER BY categoria, nombre'
        );
        return rows;
    },

    // Obtener método por ID
    obtenerMetodoPorId: async (metodoPagoId) => {
        const [rows] = await db.execute(
            'SELECT id, nombre, categoria, codigo FROM metodos_pago WHERE id = ? AND activo = TRUE',
            [metodoPagoId]
        );
        return rows[0];
    },

    // Crear registro de pago
    crearPago: async (pagoData) => {
        const { venta_id, cliente_id, metodo_pago_id, monto, codigo_transaccion, detalles_json } = pagoData;
        const [result] = await db.execute(
            'INSERT INTO historial_pagos (venta_id, cliente_id, metodo_pago_id, monto, codigo_transaccion, estado, detalles_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [venta_id, cliente_id || null, metodo_pago_id, monto, codigo_transaccion, 'pendiente', detalles_json || null]
        );
        return result.insertId;
    },

    // Actualizar estado del pago
    actualizarEstadoPago: async (pagoId, nuevoEstado) => {
        const [result] = await db.execute(
            'UPDATE historial_pagos SET estado = ? WHERE id = ?',
            [nuevoEstado, pagoId]
        );
        return result.affectedRows > 0;
    },

    // Obtener pago por ID
    obtenerPorId: async (pagoId) => {
        const [rows] = await db.execute(
            'SELECT h.*, mp.nombre as metodo_nombre FROM historial_pagos h JOIN metodos_pago mp ON h.metodo_pago_id = mp.id WHERE h.id = ?',
            [pagoId]
        );
        return rows[0];
    },

    // Obtener pagos por venta
    obtenerPorVenta: async (ventaId) => {
        const [rows] = await db.execute(
            'SELECT h.*, mp.nombre as metodo_nombre FROM historial_pagos h JOIN metodos_pago mp ON h.metodo_pago_id = mp.id WHERE h.venta_id = ? ORDER BY h.fecha_pago DESC',
            [ventaId]
        );
        return rows;
    },

    // Obtener pagos por cliente
    obtenerPorCliente: async (clienteId) => {
        const [rows] = await db.execute(
            'SELECT h.id, h.venta_id, h.monto, h.estado, h.fecha_pago, mp.nombre as metodo_nombre, mp.categoria FROM historial_pagos h JOIN metodos_pago mp ON h.metodo_pago_id = mp.id WHERE h.cliente_id = ? ORDER BY h.fecha_pago DESC',
            [clienteId]
        );
        return rows;
    },

    // Verificar si existe pago para una venta
    existePagoParaVenta: async (ventaId) => {
        const [rows] = await db.execute(
            'SELECT id FROM historial_pagos WHERE venta_id = ? AND estado = "completado" LIMIT 1',
            [ventaId]
        );
        return rows.length > 0;
    },

    // Obtener total pagado por cliente
    obtenerTotalPagadoPorCliente: async (clienteId) => {
        const [rows] = await db.execute(
            'SELECT SUM(monto) as total FROM historial_pagos WHERE cliente_id = ? AND estado = "completado"',
            [clienteId]
        );
        return rows[0]?.total || 0;
    }
};

module.exports = PagosModel;

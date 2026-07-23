const db = require('../../config/db');

const ProveedoresModel = {
    obtenerTodos: async () => {
        const [rows] = await db.execute('SELECT id, ruc, empresa, representante, telefono, estado FROM proveedores');
        return rows;
    },

    crear: async (proveedorData) => {
        const { ruc, empresa, representante, telefono, estado } = proveedorData;
        const [result] = await db.execute(
            'INSERT INTO proveedores (ruc, empresa, representante, telefono, estado) VALUES (?, ?, ?, ?, ?)',
            [ruc, empresa, representante || null, telefono || null, estado || 'Activo']
        );
        return result.insertId;
    },

    eliminar: async (id) => {
        const [result] = await db.execute('DELETE FROM proveedores WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = ProveedoresModel;

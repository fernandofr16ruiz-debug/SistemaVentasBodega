
const db = require('../../config/db');

const UsuariosModel = {
    buscarPorUsername: async (username) => {
        const [rows] = await db.execute(
            'SELECT id, nombre_completo, username, password, rol FROM usuarios WHERE username = ?', 
            [username]
        );
        return rows[0];
    },

    obtenerTodos: async () => {
        const [rows] = await db.execute('SELECT id, nombre_completo, username, rol FROM usuarios');
        return rows;
    },

    crear: async (usuarioData) => {
        const { nombre_completo, username, password, rol } = usuarioData;
        const [result] = await db.execute(
            'INSERT INTO usuarios (nombre_completo, username, password, rol) VALUES (?, ?, ?, ?)',
            [nombre_completo, username, password, rol || 'cajero']
        );
        return result.insertId;
    },

    eliminar: async (id) => {
        const [result] = await db.execute('DELETE FROM usuarios WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = UsuariosModel;
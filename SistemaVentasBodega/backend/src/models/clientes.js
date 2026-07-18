const db = require('../../config/db');

const ClientesModel = {
    // Buscar cliente por correo
    buscarPorCorreo: async (correo) => {
        const [rows] = await db.execute(
            'SELECT id, nombre_completo, correo, celular, dni, tipo_registro, contrasena, email_verificado, celular_verificado FROM clientes WHERE correo = ?',
            [correo]
        );
        return rows[0];
    },

    // Buscar cliente por celular
    buscarPorCelular: async (celular) => {
        const [rows] = await db.execute(
            'SELECT id, nombre_completo, correo, celular, dni, tipo_registro, contrasena, email_verificado, celular_verificado FROM clientes WHERE celular = ?',
            [celular]
        );
        return rows[0];
    },

    // Buscar cliente por ID
    buscarPorId: async (id) => {
        const [rows] = await db.execute(
            'SELECT id, nombre_completo, correo, celular, dni, tipo_registro, email_verificado, celular_verificado, fecha_registro, ultimo_acceso FROM clientes WHERE id = ?',
            [id]
        );
        return rows[0];
    },

    // Crear nuevo cliente
    crear: async (clienteData) => {
        const { nombre_completo, correo, celular, tipo_registro, contrasena, dni } = clienteData;
        const [result] = await db.execute(
            'INSERT INTO clientes (nombre_completo, correo, celular, tipo_registro, contrasena, dni, email_verificado, celular_verificado) VALUES (?, ?, ?, ?, ?, ?, FALSE, FALSE)',
            [nombre_completo, correo || null, celular || null, tipo_registro, contrasena || null, dni || null]
        );
        return result.insertId;
    },

    // Registrar código de verificación
    registrarCodigoVerificacion: async (clienteId, codigo) => {
        const [result] = await db.execute(
            'UPDATE clientes SET codigo_verificacion = ? WHERE id = ?',
            [codigo, clienteId]
        );
        return result.affectedRows > 0;
    },

    // Verificar código y marcar como verificado
    verificarCodigo: async (clienteId, codigo, tipo) => {
        const [row] = await db.execute(
            'SELECT codigo_verificacion FROM clientes WHERE id = ?',
            [clienteId]
        );

        if (!row || row[0].codigo_verificacion !== codigo) {
            return false;
        }

        const campo = tipo === 'email' ? 'email_verificado' : 'celular_verificado';
        const [result] = await db.execute(
            `UPDATE clientes SET ${campo} = TRUE, codigo_verificacion = NULL WHERE id = ?`,
            [clienteId]
        );

        return result.affectedRows > 0;
    },

    // Actualizar contraseña
    actualizarContrasena: async (clienteId, nuevaContrasena) => {
        const [result] = await db.execute(
            'UPDATE clientes SET contrasena = ? WHERE id = ?',
            [nuevaContrasena, clienteId]
        );
        return result.affectedRows > 0;
    },

    // Registrar último acceso
    registrarUltimoAcceso: async (clienteId) => {
        const [result] = await db.execute(
            'UPDATE clientes SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?',
            [clienteId]
        );
        return result.affectedRows > 0;
    },

    // Obtener todos los clientes (para estadísticas)
    obtenerTodos: async () => {
        const [rows] = await db.execute(
            'SELECT id, nombre_completo, correo, celular, tipo_registro, fecha_registro FROM clientes ORDER BY fecha_registro DESC'
        );
        return rows;
    },

    // Eliminar cliente
    eliminar: async (clienteId) => {
        const [result] = await db.execute(
            'DELETE FROM clientes WHERE id = ?',
            [clienteId]
        );
        return result.affectedRows > 0;
    }
};

module.exports = ClientesModel;


const UsuariosModel = require('../models/usuarios');

const usuariosController = {
    login: async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username y password son obligatorios' });
        }

        try {
            const usuario = await UsuariosModel.buscarPorUsername(username);

            if (!usuario || usuario.password !== password) { 
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            res.status(200).json({
                success: true,
                mensaje: 'Autenticación exitosa',
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre_completo,
                    username: usuario.username,
                    rol: usuario.rol
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error interno en el servidor de autenticación' });
        }
    },

    listarUsuarios: async (req, res) => {
        try {
            const usuarios = await UsuariosModel.obtenerTodos();
            res.status(200).json(usuarios);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener el personal' });
        }
    },

    crearUsuario: async (req, res) => {
        const { nombre_completo, username, password, rol } = req.body;

        if (!nombre_completo || !username || !password) {
            return res.status(400).json({ error: 'Nombre completo, username y password son campos obligatorios.' });
        }

        try {
            const usuarioExistente = await UsuariosModel.buscarPorUsername(username);
            if (usuarioExistente) {
                return res.status(400).json({ error: 'El nombre de usuario (username) ya está registrado.' });
            }

            const nuevoId = await UsuariosModel.crear(req.body);
            res.status(201).json({
                success: true,
                mensaje: 'Usuario registrado exitosamente',
                id: nuevoId
            });
        } catch (error) {
            console.error('Error en crearUsuario:', error);
            res.status(500).json({ error: 'Error interno al registrar el usuario' });
        }
    },

    eliminarUsuario: async (req, res) => {
        const { id } = req.params;

        try {
            const eliminado = await UsuariosModel.eliminar(id);
            if (!eliminado) {
                return res.status(404).json({ error: 'El usuario no existe' });
            }
            res.status(200).json({ success: true, mensaje: 'Acceso de usuario revocado correctamente' });
        } catch (error) {
            console.error('Error en eliminarUsuario:', error);
            if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
                return res.status(400).json({ error: 'No se puede eliminar este usuario porque tiene ventas registradas en el sistema.' });
            }
            res.status(500).json({ error: 'Error interno al revocar acceso al usuario' });
        }
    }
};

module.exports = usuariosController;

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
    }
};

module.exports = usuariosController;
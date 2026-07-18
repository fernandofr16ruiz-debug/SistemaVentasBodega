const ClientesModel = require('../models/clientes');

// Utilidad: Generar código de verificación simulado
const generarCodigoVerificacion = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const AutenticacionController = {
    // REGISTRO CON CORREO
    registroConCorreo: async (req, res) => {
        try {
            const { nombre_completo, correo, contrasena } = req.body;

            if (!nombre_completo || !correo || !contrasena) {
                return res.status(400).json({ error: 'Todos los campos son requeridos' });
            }

            // Verificar si el correo ya existe
            const clienteExistente = await ClientesModel.buscarPorCorreo(correo);
            if (clienteExistente) {
                return res.status(409).json({ error: 'El correo ya está registrado' });
            }

            // Crear nuevo cliente
            const clienteId = await ClientesModel.crear({
                nombre_completo,
                correo,
                tipo_registro: 'correo',
                contrasena
            });

            // Generar código de verificación
            const codigoVerificacion = generarCodigoVerificacion();
            await ClientesModel.registrarCodigoVerificacion(clienteId, codigoVerificacion);

            return res.status(201).json({
                mensaje: 'Registro exitoso. Se envió un código a tu correo (simulado).',
                cliente_id: clienteId,
                codigo_simulado: codigoVerificacion // Solo para desarrollo/pruebas
            });
        } catch (error) {
            console.error('Error en registroConCorreo:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    },

    // REGISTRO CON CELULAR
    registroConCelular: async (req, res) => {
        try {
            const { nombre_completo, celular, contrasena } = req.body;

            if (!nombre_completo || !celular || !contrasena) {
                return res.status(400).json({ error: 'Todos los campos son requeridos' });
            }

            // Verificar si el celular ya existe
            const clienteExistente = await ClientesModel.buscarPorCelular(celular);
            if (clienteExistente) {
                return res.status(409).json({ error: 'El celular ya está registrado' });
            }

            // Crear nuevo cliente
            const clienteId = await ClientesModel.crear({
                nombre_completo,
                celular,
                tipo_registro: 'celular',
                contrasena
            });

            // Generar código de verificación
            const codigoVerificacion = generarCodigoVerificacion();
            await ClientesModel.registrarCodigoVerificacion(clienteId, codigoVerificacion);

            return res.status(201).json({
                mensaje: 'Registro exitoso. Se envió un SMS con un código (simulado).',
                cliente_id: clienteId,
                codigo_simulado: codigoVerificacion
            });
        } catch (error) {
            console.error('Error en registroConCelular:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    },

    // REGISTRO CON FACEBOOK (Simulado)
    registroConFacebook: async (req, res) => {
        try {
            const { nombre_completo, correo, token_facebook } = req.body;

            if (!nombre_completo || !correo) {
                return res.status(400).json({ error: 'Nombre y correo requeridos' });
            }

            // Verificar si el correo ya existe
            let cliente = await ClientesModel.buscarPorCorreo(correo);
            
            if (!cliente) {
                // Crear nuevo cliente desde Facebook
                const clienteId = await ClientesModel.crear({
                    nombre_completo,
                    correo,
                    tipo_registro: 'facebook'
                });
                cliente = await ClientesModel.buscarPorId(clienteId);
            }

            // Marcar email como verificado (simulando que Facebook lo verificó)
            await ClientesModel.verificarCodigo(cliente.id, '123456', 'email'); // Código dummy

            await ClientesModel.registrarUltimoAcceso(cliente.id);

            return res.status(200).json({
                mensaje: 'Inicio de sesión con Facebook exitoso',
                cliente: {
                    id: cliente.id,
                    nombre_completo: cliente.nombre_completo,
                    correo: cliente.correo,
                    tipo_registro: cliente.tipo_registro
                },
                token: `fb_token_${cliente.id}_${Date.now()}`
            });
        } catch (error) {
            console.error('Error en registroConFacebook:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    },

    // LOGIN CON CORREO
    loginConCorreo: async (req, res) => {
        try {
            const { correo, contrasena } = req.body;

            if (!correo || !contrasena) {
                return res.status(400).json({ error: 'Correo y contraseña requeridos' });
            }

            const cliente = await ClientesModel.buscarPorCorreo(correo);
            if (!cliente) {
                return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
            }

            if (cliente.contrasena !== contrasena) {
                return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
            }

            if (!cliente.email_verificado) {
                return res.status(403).json({ error: 'Correo no verificado. Revisa tu bandeja de entrada.' });
            }

            await ClientesModel.registrarUltimoAcceso(cliente.id);

            return res.status(200).json({
                mensaje: 'Inicio de sesión exitoso',
                cliente: {
                    id: cliente.id,
                    nombre_completo: cliente.nombre_completo,
                    correo: cliente.correo,
                    tipo_registro: cliente.tipo_registro
                },
                token: `client_token_${cliente.id}_${Date.now()}`
            });
        } catch (error) {
            console.error('Error en loginConCorreo:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    },

    // LOGIN CON CELULAR
    loginConCelular: async (req, res) => {
        try {
            const { celular, contrasena } = req.body;

            if (!celular || !contrasena) {
                return res.status(400).json({ error: 'Celular y contraseña requeridos' });
            }

            const cliente = await ClientesModel.buscarPorCelular(celular);
            if (!cliente) {
                return res.status(401).json({ error: 'Celular o contraseña incorrectos' });
            }

            if (cliente.contrasena !== contrasena) {
                return res.status(401).json({ error: 'Celular o contraseña incorrectos' });
            }

            if (!cliente.celular_verificado) {
                return res.status(403).json({ error: 'Celular no verificado. Revisa tu SMS.' });
            }

            await ClientesModel.registrarUltimoAcceso(cliente.id);

            return res.status(200).json({
                mensaje: 'Inicio de sesión exitoso',
                cliente: {
                    id: cliente.id,
                    nombre_completo: cliente.nombre_completo,
                    celular: cliente.celular,
                    tipo_registro: cliente.tipo_registro
                },
                token: `client_token_${cliente.id}_${Date.now()}`
            });
        } catch (error) {
            console.error('Error en loginConCelular:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    },

    // VERIFICAR CÓDIGO
    verificarCodigo: async (req, res) => {
        try {
            const { cliente_id, codigo, tipo } = req.body;

            if (!cliente_id || !codigo || !tipo) {
                return res.status(400).json({ error: 'Parámetros requeridos' });
            }

            const resultado = await ClientesModel.verificarCodigo(cliente_id, codigo, tipo);
            if (!resultado) {
                return res.status(400).json({ error: 'Código inválido o expirado' });
            }

            return res.status(200).json({ mensaje: 'Verificación exitosa' });
        } catch (error) {
            console.error('Error en verificarCodigo:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    },

    // RECUPERAR CONTRASEÑA
    recuperarContrasena: async (req, res) => {
        try {
            const { correo_o_celular } = req.body;

            if (!correo_o_celular) {
                return res.status(400).json({ error: 'Correo o celular requerido' });
            }

            let cliente = await ClientesModel.buscarPorCorreo(correo_o_celular);
            if (!cliente) {
                cliente = await ClientesModel.buscarPorCelular(correo_o_celular);
            }

            if (!cliente) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // Generar código de recuperación
            const codigoRecuperacion = generarCodigoVerificacion();
            await ClientesModel.registrarCodigoVerificacion(cliente.id, codigoRecuperacion);

            return res.status(200).json({
                mensaje: 'Se envió un código de recuperación (simulado)',
                cliente_id: cliente.id,
                tipo_contacto: cliente.correo ? 'correo' : 'celular',
                contacto_parcial: cliente.correo ? cliente.correo.substring(0, 3) + '***@***' : cliente.celular.substring(0, 3) + '***',
                codigo_simulado: codigoRecuperacion // Solo para desarrollo
            });
        } catch (error) {
            console.error('Error en recuperarContrasena:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    },

    // RESTABLECER CONTRASEÑA
    restablecerContrasena: async (req, res) => {
        try {
            const { cliente_id, codigo, nueva_contrasena } = req.body;

            if (!cliente_id || !codigo || !nueva_contrasena) {
                return res.status(400).json({ error: 'Parámetros requeridos' });
            }

            const cliente = await ClientesModel.buscarPorId(cliente_id);
            if (!cliente) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }

            // Verificar código
            const resultado = await ClientesModel.verificarCodigo(cliente_id, codigo, cliente.correo ? 'email' : 'celular');
            if (!resultado) {
                return res.status(400).json({ error: 'Código inválido o expirado' });
            }

            // Actualizar contraseña
            await ClientesModel.actualizarContrasena(cliente_id, nueva_contrasena);

            return res.status(200).json({ mensaje: 'Contraseña restablecida exitosamente' });
        } catch (error) {
            console.error('Error en restablecerContrasena:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    },

    // OBTENER PERFIL
    obtenerPerfil: async (req, res) => {
        try {
            const { cliente_id } = req.params;

            const cliente = await ClientesModel.buscarPorId(cliente_id);
            if (!cliente) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }

            return res.status(200).json({ cliente });
        } catch (error) {
            console.error('Error en obtenerPerfil:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
};

module.exports = AutenticacionController;

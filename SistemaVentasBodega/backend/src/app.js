
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas existentes
const usuariosRoutes = require('./routes/usuarios');
const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');
const proveedoresRoutes = require('./routes/proveedores');

// Nuevas rutas para funcionalidades adicionales
const autenticacionRoutes = require('./routes/autenticacion');
const pagosRoutes = require('./routes/pagos');
const comprobantesRoutes = require('./routes/comprobantes');

// Rutas existentes
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/proveedores', proveedoresRoutes);

// Nuevas rutas
app.use('/api/autenticacion', autenticacionRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/comprobantes', comprobantesRoutes);

app.get('/', (req, res) => {
    res.json({ 
        mensaje: "API REST de Bodega PRO activa y funcionando",
        version: "2.0",
        nuevas_funcionalidades: [
            "Autenticación mejorada (correo, celular, Facebook)",
            "Sistema de pagos integrado",
            "Generación de comprobantes (boletas/tickets)"
        ]
    });
});

module.exports = app;
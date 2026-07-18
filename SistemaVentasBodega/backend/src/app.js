
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const usuariosRoutes = require('./routes/usuarios');
const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');
const proveedoresRoutes = require('./routes/proveedores');

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/proveedores', proveedoresRoutes);

app.get('/', (req, res) => {
    res.json({ mensaje: "API REST de Bodega PRO activa y funcionando" });
});

module.exports = app;
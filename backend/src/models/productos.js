// src/models/productos.js
const db = require('../../config/db');

const ProductosModel = {
    obtenerTodos: async () => {
        const [rows] = await db.execute('SELECT * FROM productos');
        return rows;
    },

    obtenerPorId: async (id) => {
        const [rows] = await db.execute('SELECT * FROM productos WHERE id = ?', [id]);
        return rows[0];
    },

    crear: async (productoData) => {
        const { nombre, precio, stock, img, categoria } = productoData;
        const [result] = await db.execute(
            'INSERT INTO productos (nombre, precio, stock, img, categoria) VALUES (?, ?, ?, ?, ?)',
            [nombre, precio, stock, img, categoria || 'Abarrotes']
        );
        return result.insertId;
    },

    actualizarStock: async (id, nuevoStock) => {
        const [result] = await db.execute(
            'UPDATE productos SET stock = ? WHERE id = ?',
            [nuevoStock, id]
        );
        return result.affectedRows > 0;
    },

    actualizarCampos: async (id, datos) => {
        const { nombre, precio, stock, categoria } = datos;
        const sql = `UPDATE productos SET nombre = ?, precio = ?, stock = ?, categoria = ? WHERE id = ?`;
        return await db.query(sql, [nombre, precio, stock, categoria, id]);
    }
};

module.exports = ProductosModel;
const ComprobantesModel = require('../models/comprobantes');
const VentasModel = require('../models/ventas');
const ClientesModel = require('../models/clientes');

const ComprobantesController = {
    // GENERAR COMPROBANTE
    generarComprobante: async (req, res) => {
        try {
            const { venta_id, tipo_comprobante, cliente_nombre, cliente_dni, cliente_correo, cliente_id } = req.body;

            if (!venta_id || !tipo_comprobante) {
                return res.status(400).json({ error: 'Venta y tipo de comprobante requeridos' });
            }

            // Obtener detalles de la venta
            const detallesVenta = await VentasModel.obtenerDetallePorVentaId(venta_id);
            if (!detallesVenta || detallesVenta.length === 0) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }

            // Calcular totales
            const subtotal = detallesVenta.reduce((sum, item) => sum + item.subtotal, 0);
            const igv = tipo_comprobante === 'boleta_dni' ? subtotal * 0.18 : 0;
            const total = subtotal + igv;

            // Generar número de comprobante
            const numeroComprobante = await ComprobantesModel.generarNumeroComprobante(tipo_comprobante);

            // Generar contenido HTML del comprobante
            const contenidoHTML = generarHTML(numeroComprobante, tipo_comprobante, cliente_nombre, cliente_dni, detallesVenta, subtotal, igv, total);

            // Crear comprobante en BD
            const comprobanteId = await ComprobantesModel.crear({
                venta_id,
                tipo_comprobante,
                numero_comprobante: numeroComprobante,
                cliente_nombre: cliente_nombre || 'CONSUMIDOR FINAL',
                cliente_dni: cliente_dni || null,
                cliente_correo: cliente_correo || null,
                subtotal,
                igv,
                total,
                contenido_html: contenidoHTML
            });

            return res.status(201).json({
                mensaje: 'Comprobante generado exitosamente',
                comprobante: {
                    id: comprobanteId,
                    numero: numeroComprobante,
                    tipo: tipo_comprobante,
                    total,
                    contenido_html: contenidoHTML
                }
            });
        } catch (error) {
            console.error('Error en generarComprobante:', error);
            res.status(500).json({ error: 'Error al generar el comprobante' });
        }
    },

    // OBTENER COMPROBANTE
    obtenerComprobante: async (req, res) => {
        try {
            const { comprobante_id } = req.params;

            const comprobante = await ComprobantesModel.obtenerPorId(comprobante_id);
            if (!comprobante) {
                return res.status(404).json({ error: 'Comprobante no encontrado' });
            }

            return res.status(200).json({
                comprobante: {
                    id: comprobante.id,
                    numero: comprobante.numero_comprobante,
                    tipo: comprobante.tipo_comprobante,
                    cliente: comprobante.cliente_nombre,
                    dni: comprobante.cliente_dni,
                    subtotal: comprobante.subtotal,
                    igv: comprobante.igv,
                    total: comprobante.total,
                    fecha: comprobante.fecha_generacion,
                    contenido_html: comprobante.contenido_html
                }
            });
        } catch (error) {
            console.error('Error en obtenerComprobante:', error);
            res.status(500).json({ error: 'Error al obtener el comprobante' });
        }
    },

    // OBTENER COMPROBANTES POR CLIENTE
    obtenerComprobantesCliente: async (req, res) => {
        try {
            const { cliente_correo } = req.params;

            const comprobantes = await ComprobantesModel.obtenerPorCliente(cliente_correo);

            return res.status(200).json({
                comprobantes: comprobantes.map(c => ({
                    id: c.id,
                    numero: c.numero_comprobante,
                    tipo: c.tipo_comprobante,
                    total: c.total,
                    fecha: c.fecha_generacion
                }))
            });
        } catch (error) {
            console.error('Error en obtenerComprobantesCliente:', error);
            res.status(500).json({ error: 'Error al obtener comprobantes' });
        }
    },

    // OBTENER COMPROBANTE POR NÚMERO
    obtenerPorNumero: async (req, res) => {
        try {
            const { numero } = req.params;

            const comprobante = await ComprobantesModel.obtenerPorNumero(numero);
            if (!comprobante) {
                return res.status(404).json({ error: 'Comprobante no encontrado' });
            }

            return res.status(200).json({
                comprobante: {
                    id: comprobante.id,
                    numero: comprobante.numero_comprobante,
                    tipo: comprobante.tipo_comprobante,
                    cliente: comprobante.cliente_nombre,
                    dni: comprobante.cliente_dni,
                    total: comprobante.total,
                    fecha: comprobante.fecha_generacion,
                    contenido_html: comprobante.contenido_html
                }
            });
        } catch (error) {
            console.error('Error en obtenerPorNumero:', error);
            res.status(500).json({ error: 'Error al obtener el comprobante' });
        }
    },

    // DESCARGAR COMPROBANTE (Como HTML/PDF simulado)
    descargarComprobante: async (req, res) => {
        try {
            const { comprobante_id } = req.params;

            const comprobante = await ComprobantesModel.obtenerPorId(comprobante_id);
            if (!comprobante) {
                return res.status(404).json({ error: 'Comprobante no encontrado' });
            }

            // Configurar headers para descargar
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="comprobante_${comprobante.numero_comprobante}.html"`);
            res.send(comprobante.contenido_html);
        } catch (error) {
            console.error('Error en descargarComprobante:', error);
            res.status(500).json({ error: 'Error al descargar el comprobante' });
        }
    },

    // ANULAR COMPROBANTE
    anularComprobante: async (req, res) => {
        try {
            const { comprobante_id } = req.params;
            const { motivo } = req.body;

            const comprobante = await ComprobantesModel.obtenerPorId(comprobante_id);
            if (!comprobante) {
                return res.status(404).json({ error: 'Comprobante no encontrado' });
            }

            await ComprobantesModel.anular(comprobante_id, motivo);

            return res.status(200).json({
                mensaje: 'Comprobante anulado exitosamente'
            });
        } catch (error) {
            console.error('Error en anularComprobante:', error);
            res.status(500).json({ error: 'Error al anular el comprobante' });
        }
    },

    // OBTENER ESTADÍSTICAS
    obtenerEstadisticas: async (req, res) => {
        try {
            const estadisticas = await ComprobantesModel.obtenerTotalPorTipo();

            return res.status(200).json({
                estadisticas: {
                    por_tipo: estadisticas
                }
            });
        } catch (error) {
            console.error('Error en obtenerEstadisticas:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    }
};

// FUNCIÓN: Generar HTML del comprobante
function generarHTML(numero, tipo, nombreCliente, dni, detalles, subtotal, igv, total) {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-PE');
    const hora = ahora.toLocaleTimeString('es-PE');

    const tipoNombre = tipo === 'boleta_dni' ? 'BOLETA CON DNI' : (tipo === 'boleta_simple' ? 'BOLETA' : 'TICKET');

    let detallesHTML = '';
    detalles.forEach((d, index) => {
        detallesHTML += `
            <tr>
                <td style="border-bottom: 1px solid #ccc; padding: 8px;">${index + 1}</td>
                <td style="border-bottom: 1px solid #ccc; padding: 8px;">${d.producto}</td>
                <td style="border-bottom: 1px solid #ccc; padding: 8px; text-align: center;">${d.cantidad}</td>
                <td style="border-bottom: 1px solid #ccc; padding: 8px; text-align: right;">S/ ${parseFloat(d.precio_unitario).toFixed(2)}</td>
                <td style="border-bottom: 1px solid #ccc; padding: 8px; text-align: right;">S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
            </tr>
        `;
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante ${numero}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .comprobante { background: white; max-width: 800px; margin: 0 auto; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .encabezado { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .logo { font-size: 24px; font-weight: bold; color: #d32f2f; }
        .tipo-comprobante { font-size: 14px; color: #666; margin-top: 5px; }
        .numero { font-size: 18px; font-weight: bold; margin-top: 10px; }
        .info { display: flex; justify-content: space-between; margin: 15px 0; font-size: 12px; }
        .cliente-info { margin: 15px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #d32f2f; }
        .cliente-info strong { display: block; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #333; color: white; padding: 10px; text-align: left; }
        .totales { text-align: right; margin-top: 20px; }
        .total-final { font-size: 18px; font-weight: bold; color: #d32f2f; padding: 10px 0; border-top: 2px solid #333; margin-top: 10px; }
        .pie { text-align: center; font-size: 11px; color: #999; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="comprobante">
        <div class="encabezado">
            <div class="logo">🏪 BODEGA PRO</div>
            <div class="tipo-comprobante">${tipoNombre}</div>
            <div class="numero">Comprobante: ${numero}</div>
        </div>

        <div class="info">
            <div><strong>Fecha:</strong> ${fecha}</div>
            <div><strong>Hora:</strong> ${hora}</div>
        </div>

        <div class="cliente-info">
            <strong>DATOS DEL CLIENTE</strong>
            <div><strong>Nombre:</strong> ${nombreCliente || 'CONSUMIDOR FINAL'}</div>
            ${dni ? `<div><strong>DNI:</strong> ${dni}</div>` : ''}
        </div>

        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>PRODUCTO</th>
                    <th>CANTIDAD</th>
                    <th>PRECIO UNITARIO</th>
                    <th>SUBTOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${detallesHTML}
            </tbody>
        </table>

        <div class="totales">
            <div><strong>Subtotal:</strong> S/ ${parseFloat(subtotal).toFixed(2)}</div>
            ${igv > 0 ? `<div><strong>IGV (18%):</strong> S/ ${parseFloat(igv).toFixed(2)}</div>` : ''}
            <div class="total-final">TOTAL: S/ ${parseFloat(total).toFixed(2)}</div>
        </div>

        <div class="pie">
            <p>Gracias por su compra. ¡Vuelva pronto!</p>
            <p>Este comprobante es válido para reclamaciones. Conservelo.</p>
            <p style="margin-top: 20px; color: #333;">Bodega PRO - Sistema de Gestión © 2026</p>
        </div>
    </div>
</body>
</html>
    `;
}

module.exports = ComprobantesController;

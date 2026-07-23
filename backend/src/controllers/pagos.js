const PagosModel = require('../models/pagos');
const ComprobantesModel = require('../models/comprobantes');
const VentasModel = require('../models/ventas');

// Utilidad: Generar código de transacción único
const generarCodigoTransaccion = () => {
    return `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

// Utilidad: Simular procesamiento de pago con delay
const simularProcesamientoPago = (duracion = 3000) => {
    return new Promise(resolve => setTimeout(resolve, duracion));
};

const PagosController = {
    // OBTENER MÉTODOS DE PAGO DISPONIBLES
    obtenerMetodos: async (req, res) => {
        try {
            const metodos = await PagosModel.obtenerMetodos();
            
            // Agrupar por categoría
            const metodosAgrupados = {
                billeteras_digitales: metodos.filter(m => m.categoria === 'billetera_digital'),
                bancos: metodos.filter(m => m.categoria === 'banco'),
                tarjetas: metodos.filter(m => m.categoria === 'tarjeta'),
                efectivo: metodos.filter(m => m.categoria === 'efectivo')
            };

            res.status(200).json({ metodos: metodosAgrupados });
        } catch (error) {
            console.error('Error en obtenerMetodos:', error);
            res.status(500).json({ error: 'Error al obtener métodos de pago' });
        }
    },

    // PROCESAR PAGO (Simulado)
    procesarPago: async (req, res) => {
        try {
            const { venta_id, cliente_id, metodo_pago_id, monto, detalles_adicionales } = req.body;

            if (!venta_id || !metodo_pago_id || !monto) {
                return res.status(400).json({ error: 'Parámetros requeridos' });
            }

            // Verificar que la venta existe
            const ventaDetalles = await VentasModel.obtenerDetallePorVentaId(venta_id);
            if (!ventaDetalles || ventaDetalles.length === 0) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }

            // Verificar método de pago
            const metodo = await PagosModel.obtenerMetodoPorId(metodo_pago_id);
            if (!metodo) {
                return res.status(404).json({ error: 'Método de pago no válido' });
            }

            // Crear registro de pago con estado pendiente
            const codigoTransaccion = generarCodigoTransaccion();
            const pagoId = await PagosModel.crearPago({
                venta_id,
                cliente_id,
                metodo_pago_id,
                monto,
                codigo_transaccion: codigoTransaccion,
                detalles_json: JSON.stringify(detalles_adicionales || {})
            });

            // SIMULACIÓN: Procesar el pago
            await PagosModel.actualizarEstadoPago(pagoId, 'procesando');

            // Simular delay de procesamiento (3-5 segundos)
            const duracionSimulada = 3000 + Math.random() * 2000;
            await simularProcesamientoPago(duracionSimulada);

            // Simular éxito del pago (95% de probabilidad de éxito)
            const esExitoso = Math.random() < 0.95;

            if (esExitoso) {
                // Marcar como completado
                await PagosModel.actualizarEstadoPago(pagoId, 'completado');

                return res.status(200).json({
                    mensaje: 'Pago procesado exitosamente',
                    pago: {
                        id: pagoId,
                        codigo_transaccion: codigoTransaccion,
                        venta_id,
                        monto,
                        metodo: metodo.nombre,
                        estado: 'completado'
                    }
                });
            } else {
                // Simular fallo
                await PagosModel.actualizarEstadoPago(pagoId, 'fallido');

                return res.status(400).json({
                    error: 'El pago fue rechazado. Intenta con otro método.',
                    motivo_simulado: ['Fondos insuficientes', 'Datos inválidos', 'Conexión expirada'][Math.floor(Math.random() * 3)],
                    pago_id: pagoId
                });
            }
        } catch (error) {
            console.error('Error en procesarPago:', error);
            res.status(500).json({ error: 'Error al procesar el pago' });
        }
    },

    // CONFIRMAR PAGO
    confirmarPago: async (req, res) => {
        try {
            const { pago_id } = req.params;

            const pago = await PagosModel.obtenerPorId(pago_id);
            if (!pago) {
                return res.status(404).json({ error: 'Pago no encontrado' });
            }

            if (pago.estado !== 'completado') {
                return res.status(400).json({ error: 'El pago no está completado' });
            }

            return res.status(200).json({
                mensaje: 'Pago confirmado',
                pago: {
                    id: pago.id,
                    codigo_transaccion: pago.codigo_transaccion,
                    monto: pago.monto,
                    metodo: pago.metodo_nombre,
                    estado: pago.estado,
                    fecha: pago.fecha_pago
                }
            });
        } catch (error) {
            console.error('Error en confirmarPago:', error);
            res.status(500).json({ error: 'Error al confirmar el pago' });
        }
    },

    // OBTENER ESTADO DEL PAGO
    obtenerEstadoPago: async (req, res) => {
        try {
            const { pago_id } = req.params;

            const pago = await PagosModel.obtenerPorId(pago_id);
            if (!pago) {
                return res.status(404).json({ error: 'Pago no encontrado' });
            }

            return res.status(200).json({
                pago: {
                    id: pago.id,
                    codigo_transaccion: pago.codigo_transaccion,
                    estado: pago.estado,
                    monto: pago.monto,
                    metodo: pago.metodo_nombre,
                    fecha: pago.fecha_pago
                }
            });
        } catch (error) {
            console.error('Error en obtenerEstadoPago:', error);
            res.status(500).json({ error: 'Error al obtener estado del pago' });
        }
    },

    // OBTENER HISTORIAL DE PAGOS POR CLIENTE
    obtenerHistorialPagos: async (req, res) => {
        try {
            const { cliente_id } = req.params;

            const pagos = await PagosModel.obtenerPorCliente(cliente_id);

            return res.status(200).json({
                historial: pagos.map(p => ({
                    id: p.id,
                    venta_id: p.venta_id,
                    monto: p.monto,
                    metodo: p.metodo_nombre,
                    estado: p.estado,
                    fecha: p.fecha_pago
                }))
            });
        } catch (error) {
            console.error('Error en obtenerHistorialPagos:', error);
            res.status(500).json({ error: 'Error al obtener historial' });
        }
    },

    // REVERTIR PAGO
    revertirPago: async (req, res) => {
        try {
            const { pago_id } = req.params;

            const pago = await PagosModel.obtenerPorId(pago_id);
            if (!pago) {
                return res.status(404).json({ error: 'Pago no encontrado' });
            }

            if (pago.estado !== 'completado') {
                return res.status(400).json({ error: 'Solo se pueden revertir pagos completados' });
            }

            await PagosModel.actualizarEstadoPago(pago_id, 'revertido');

            return res.status(200).json({
                mensaje: 'Pago revertido exitosamente',
                pago_id
            });
        } catch (error) {
            console.error('Error en revertirPago:', error);
            res.status(500).json({ error: 'Error al revertir el pago' });
        }
    },

    // OBTENER ESTADÍSTICAS DE PAGOS
    obtenerEstadisticas: async (req, res) => {
        try {
            const { cliente_id } = req.query;

            if (!cliente_id) {
                return res.status(400).json({ error: 'Cliente requerido' });
            }

            const totalPagado = await PagosModel.obtenerTotalPagadoPorCliente(cliente_id);
            const pagos = await PagosModel.obtenerPorCliente(cliente_id);

            return res.status(200).json({
                estadisticas: {
                    total_pagado: totalPagado,
                    cantidad_transacciones: pagos.length,
                    ultimas_transacciones: pagos.slice(0, 5)
                }
            });
        } catch (error) {
            console.error('Error en obtenerEstadisticas:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    }
};

module.exports = PagosController;

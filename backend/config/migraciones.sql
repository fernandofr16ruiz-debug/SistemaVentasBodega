-- ========================================================
-- MIGRACIONES: Nuevas funcionalidades Sistema Bodega
-- ========================================================
-- Este archivo agrega nuevas tablas sin eliminar las existentes

USE `bodega_bd`;

-- ========================================================
-- 1. TABLA: clientes (Registro de clientes externos)
-- ========================================================
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(100) NOT NULL,
  `correo` varchar(100) UNIQUE,
  `celular` varchar(15) UNIQUE,
  `dni` varchar(8),
  `tipo_registro` ENUM('correo', 'celular', 'facebook') NOT NULL,
  `contrasena` varchar(255),
  `email_verificado` BOOLEAN DEFAULT FALSE,
  `celular_verificado` BOOLEAN DEFAULT FALSE,
  `codigo_verificacion` varchar(6),
  `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `ultimo_acceso` TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- 2. TABLA: metodos_pago (Catálogo de métodos de pago)
-- ========================================================
CREATE TABLE IF NOT EXISTS `metodos_pago` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `categoria` ENUM('billetera_digital', 'banco', 'tarjeta', 'efectivo') NOT NULL,
  `codigo` varchar(20) UNIQUE NOT NULL,
  `activo` BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar métodos de pago
INSERT INTO `metodos_pago` (`nombre`, `categoria`, `codigo`, `activo`) VALUES
('Yape', 'billetera_digital', 'yape', TRUE),
('Plin', 'billetera_digital', 'plin', TRUE),
('BCP', 'banco', 'bcp', TRUE),
('Interbank', 'banco', 'interbank', TRUE),
('Visa', 'tarjeta', 'visa', TRUE),
('Mastercard', 'tarjeta', 'mastercard', TRUE),
('American Express', 'tarjeta', 'amex', TRUE),
('Efectivo', 'efectivo', 'cash', TRUE);

-- ========================================================
-- 3. TABLA: historial_pagos (Registro de pagos)
-- ========================================================
CREATE TABLE IF NOT EXISTS `historial_pagos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `venta_id` int(11) NOT NULL,
  `cliente_id` int(11),
  `metodo_pago_id` int(11) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `estado` ENUM('pendiente', 'procesando', 'completado', 'fallido') DEFAULT 'pendiente',
  `codigo_transaccion` varchar(100) UNIQUE,
  `fecha_pago` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `detalles_json` JSON,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodos_pago`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- 4. TABLA: comprobantes (Boletas y Tickets)
-- ========================================================
CREATE TABLE IF NOT EXISTS `comprobantes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `venta_id` int(11) NOT NULL,
  `tipo_comprobante` ENUM('ticket', 'boleta_simple', 'boleta_dni') NOT NULL,
  `numero_comprobante` varchar(20) UNIQUE NOT NULL,
  `serie` varchar(5) DEFAULT 'B001',
  `cliente_nombre` varchar(100),
  `cliente_dni` varchar(8),
  `cliente_correo` varchar(100),
  `subtotal` decimal(10,2) NOT NULL,
  `igv` decimal(10,2) DEFAULT 0,
  `total` decimal(10,2) NOT NULL,
  `contenido_html` LONGTEXT,
  `fecha_generacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `estado` ENUM('borrador', 'emitido', 'anulado') DEFAULT 'emitido',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- 5. TABLA: recuperacion_contrasena (Códigos de recuperación)
-- ========================================================
CREATE TABLE IF NOT EXISTS `recuperacion_contrasena` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cliente_id` int(11) NOT NULL,
  `codigo` varchar(50) UNIQUE NOT NULL,
  `fecha_generacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` TIMESTAMP,
  `utilizado` BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- 6. Modificar tabla ventas para vincular clientes
-- ========================================================
ALTER TABLE `ventas` ADD COLUMN `cliente_id` INT(11) AFTER `usuario_id`;
ALTER TABLE `ventas` ADD FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL;

-- ========================================================
-- Verificación final
-- ========================================================
SELECT 'Migraciones completadas exitosamente' AS estado;
SHOW TABLES;

-- ========================================================
-- REESTRUCTURACIÓN RELACIONAL COMPLETA: bodega_bd
-- ========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

DROP DATABASE IF EXISTS `bodega_bd`;
CREATE DATABASE `bodega_bd` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `bodega_bd`;

-- --------------------------------------------------------
-- 1. ESTRUCTURA DE LA TABLA `usuarios` (Se crea primero para poder referenciarla)
-- --------------------------------------------------------
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Volcado de datos para la tabla `usuarios`
INSERT INTO `usuarios` (`id`, `nombre_completo`, `username`, `password`, `rol`) VALUES
(1, 'Administrador General', 'admin', '123', 'administrador'),
(2, 'Cajero Turno Mañana', 'cajero', '123', 'cajero');

-- --------------------------------------------------------
-- 2. ESTRUCTURA DE LA TABLA `productos`
-- --------------------------------------------------------
CREATE TABLE `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL,
  `img` varchar(255) DEFAULT NULL,
  `categoria` varchar(50) DEFAULT 'Abarrotes',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Volcado de datos para la tabla `productos`
INSERT INTO `productos` (`id`, `nombre`, `precio`, `stock`, `img`, `categoria`) VALUES
(1, 'Arroz 1kg', '4.50', 155, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100', 'gaseosa'),
(2, 'Leche Gloria', '4.20', 100, 'https://images.unsplash.com/photo-1550586678-f7225f03c44b?w=100', 'abarrotes'),
(3, 'Aceite 1L', '8.90', 3, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=100', 'abarrotes'),
(4, 'cocola', '10.00', 54, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/15-09-26-RalfR-WLC-0098_-_Coca-Cola_glass_bottle_%28Germany%29.jpg/960px-15-09-26-RalfR-WLC-0098_-_Coca-Cola_glass_bottle_%28Germany%29.jpg', 'gaseosa'),
(5, 'agua', '1.00', 65, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100', 'refresco');

-- --------------------------------------------------------
-- 3. ESTRUCTURA DE LA TABLA `ventas`
-- --------------------------------------------------------
CREATE TABLE `ventas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_tx` varchar(20) DEFAULT NULL,
  `fecha` datetime DEFAULT current_timestamp(),
  `usuario_id` int(11) NOT NULL, -- Reemplaza a la antigua columna de texto 'operador'
  `total` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_tx` (`codigo_tx`),
  KEY `usuario_id` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Volcado de datos mapeados (Asociados al Administrador ID: 1)
INSERT INTO `ventas` (`id`, `codigo_tx`, `fecha`, `usuario_id`, `total`) VALUES
(1, 'TX-562364', '2026-06-13 00:12:42', 1, '45.00'),
(2, 'TX-665336', '2026-06-13 00:14:25', 1, '67.50'),
(3, 'TX-189343', '2026-06-13 00:23:09', 1, '33.60'),
(5, 'TX-027786', '2026-06-13 00:53:47', 1, '39.60'),
(6, 'TX-235436', '2026-06-13 00:57:15', 1, '4.50');

-- --------------------------------------------------------
-- 4. ESTRUCTURA DE LA TABLA `detalle_ventas`
-- --------------------------------------------------------
CREATE TABLE `detalle_ventas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `venta_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `venta_id` (`venta_id`),
  KEY `producto_id` (`producto_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Volcado de datos para detalle_ventas
INSERT INTO `detalle_ventas` (`id`, `venta_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal`) VALUES
(1, 1, 1, 10, '4.50', '45.00'),
(2, 2, 1, 15, '4.50', '67.50'),
(3, 3, 2, 8, '4.20', '33.60'),
(5, 5, 1, 10, '4.50', '39.60'),
(6, 6, 1, 1, '4.50', '4.50');

-- --------------------------------------------------------
-- 5. ESTRUCTURA DE LA TABLA `proveedores`
-- --------------------------------------------------------
CREATE TABLE `proveedores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ruc` varchar(20) NOT NULL,
  `empresa` varchar(100) NOT NULL,
  `representante` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `estado` varchar(20) DEFAULT 'Activo',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Volcado de datos para la tabla `proveedores`
INSERT INTO `proveedores` (`id`, `ruc`, `empresa`, `representante`, `telefono`, `estado`) VALUES
(1, '201010', 'aaaaa', 'fefsdf', '9261654164', 'Activo'),
(2, '151422', 'fer', 'xcgrefrs', '5656421', 'Activo');

-- --------------------------------------------------------
-- RESTRICCIONES DE LLAVES FORÁNEAS (INTEGRIDAD REFERENCIAL)
-- --------------------------------------------------------

-- 1. Relación Ventas -> Usuarios (Si se elimina un usuario, se restringe si ya tiene ventas amarradas)
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_ventas_usuarios` 
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Relación Detalle -> Ventas (Borrado en cascada del detalle si se anula la cabecera)
ALTER TABLE `detalle_ventas`
  ADD CONSTRAINT `fk_detalle_ventas_cabecera` 
  FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Relación Detalle -> Productos (No se puede borrar un producto si registra ventas históricas)
ALTER TABLE `detalle_ventas`
  ADD CONSTRAINT `fk_detalle_ventas_productos` 
  FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
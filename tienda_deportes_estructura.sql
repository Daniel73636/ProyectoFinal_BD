-- =====================================================================
-- TIENDA DE DEPORTES - Estructura de la base de datos (Bloque A)
-- Trabajo Final: CRUD desde codigo | PostgreSQL 11 o superior
-- =====================================================================
-- COMO EJECUTARLO:
--   1. Conectado a la BD "postgres", ejecutar SOLO esta linea:
--        CREATE DATABASE tienda_deportes;
--   2. Conectarse a "tienda_deportes" (pgAdmin: clic derecho en la BD
--      -> Query Tool; psql: \c tienda_deportes).
--   3. Ejecutar el resto de este script (desde el PASO 1).
--
-- IMPORTANTE: el script crea tablas, asi que si ya existen da error
-- ("already exists"). Para volver a empezar, borrar la BD completa
-- (desde "postgres": DROP DATABASE tienda_deportes;) y repetir.
-- =====================================================================


-- =====================================================================
-- PASO 1: TABLAS PADRE (no dependen de ninguna otra)
-- =====================================================================

CREATE TABLE categoria (
    id_categoria INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE marca (
    id_marca     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       VARCHAR(50) NOT NULL UNIQUE,
    pais_origen  VARCHAR(50)
);

-- La cedula es PK natural: la digita el usuario (sin identity).
CREATE TABLE cliente (
    cedula          VARCHAR(15)  PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    email           VARCHAR(100) UNIQUE,
    telefono        VARCHAR(20),
    fecha_registro  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE empleado (
    id_empleado  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    cargo        VARCHAR(50)
);


-- =====================================================================
-- PASO 2: PRODUCTO (depende de categoria y marca)
-- =====================================================================

CREATE TABLE producto (
    id_producto   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    precio        NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    id_categoria  INTEGER NOT NULL
        REFERENCES categoria(id_categoria) ON DELETE RESTRICT,
    id_marca      INTEGER NOT NULL
        REFERENCES marca(id_marca) ON DELETE RESTRICT
);


-- =====================================================================
-- PASO 3: VENTA y DETALLE_VENTA
-- =====================================================================

CREATE TABLE venta (
    id_venta        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha           TIMESTAMP NOT NULL DEFAULT now(),
    total           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    cedula_cliente  VARCHAR(15) NOT NULL
        REFERENCES cliente(cedula) ON DELETE RESTRICT,
    id_empleado     INTEGER NOT NULL
        REFERENCES empleado(id_empleado) ON DELETE RESTRICT
);

-- Tabla intermedia de la relacion N a M entre venta y producto.
CREATE TABLE detalle_venta (
    id_venta         INTEGER NOT NULL
        REFERENCES venta(id_venta) ON DELETE RESTRICT,
    id_producto      INTEGER NOT NULL
        REFERENCES producto(id_producto) ON DELETE RESTRICT,
    cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(10,2) NOT NULL CHECK (precio_unitario > 0),
    PRIMARY KEY (id_venta, id_producto)
);


-- =====================================================================
-- PASO 4: AUDITORIA DE PRECIOS (la llena el trigger del Bloque B)
-- =====================================================================

CREATE TABLE auditoria_precio (
    id_auditoria     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_producto      INTEGER NOT NULL
        REFERENCES producto(id_producto) ON DELETE RESTRICT,
    precio_anterior  NUMERIC(10,2),
    precio_nuevo     NUMERIC(10,2),
    fecha_cambio     TIMESTAMP NOT NULL DEFAULT now()
);


-- =====================================================================
-- PASO 5: INDICES (las FK no se indexan solas en PostgreSQL)
-- =====================================================================

CREATE INDEX idx_producto_nombre    ON producto(nombre);
CREATE INDEX idx_producto_categoria ON producto(id_categoria);
CREATE INDEX idx_venta_cliente      ON venta(cedula_cliente);


-- =====================================================================
-- PASO 6: DATOS DE PRUEBA (respetar el orden: padres primero)
-- No se insertan ventas: se registran con sp_registrar_venta (Bloque B)
-- para que el trigger de stock se dispare.
-- =====================================================================

INSERT INTO categoria (nombre) VALUES
    ('Calzado'), ('Ropa deportiva'), ('Balones'), ('Accesorios');

INSERT INTO marca (nombre, pais_origen) VALUES
    ('Nike',   'Estados Unidos'),
    ('Adidas', 'Alemania'),
    ('Puma',   'Alemania'),
    ('Mikasa', 'Japón');

-- Los dos ultimos numeros son id_categoria e id_marca (FK).
INSERT INTO producto (nombre, precio, stock, id_categoria, id_marca) VALUES
    ('Guayos Mercurial',   350000, 15, 1, 1),
    ('Tenis Runfalcon',    220000, 20, 1, 2),
    ('Camiseta Dri-FIT',   120000, 30, 2, 1),
    ('Balón de fútbol N5',  95000, 25, 3, 4),
    ('Guantes de portero',  80000, 10, 4, 3);

INSERT INTO cliente (cedula, nombre, email, telefono) VALUES
    ('1001234567', 'Carlos Pérez', 'carlos@correo.com', '3001112233'),
    ('1007654321', 'Laura Gómez',  'laura@correo.com',  '3014445566');

INSERT INTO empleado (nombre, cargo) VALUES
    ('Andrea Ríos', 'Vendedora'),
    ('Mateo Cano',  'Cajero');


-- =====================================================================
-- VERIFICACION: deben salir 5 productos con su categoria y marca
-- =====================================================================

SELECT p.nombre, p.precio, p.stock, c.nombre AS categoria, m.nombre AS marca
FROM producto p
JOIN categoria c ON c.id_categoria = p.id_categoria
JOIN marca m     ON m.id_marca = p.id_marca;


-- =====================================================================
-- PRUEBAS DE ERROR (comentadas a proposito: descomentar y ejecutar
-- UNA POR UNA, seleccionando solo la sentencia. Cada una DEBE fallar)
-- =====================================================================

-- Prueba 1: PK duplicada -> SQLSTATE 23505
-- INSERT INTO cliente (cedula, nombre) VALUES ('1001234567', 'Repetido');

-- Prueba 2: borrar un padre que tiene hijos (ON DELETE RESTRICT) -> 23001
-- DELETE FROM categoria WHERE id_categoria = 1;

-- Prueba 3: violacion de CHECK (precio negativo) -> 23514
-- INSERT INTO producto (nombre, precio, id_categoria, id_marca)
-- VALUES ('Malo', -5, 1, 1);

-- Prueba 4: valor manual en un campo GENERATED ALWAYS -> 428C9
-- INSERT INTO producto (id_producto, nombre, precio, id_categoria, id_marca)
-- VALUES (99, 'Con id manual', 100, 1, 1);

-- Prueba 5: FK inexistente al insertar -> 23503
-- INSERT INTO producto (nombre, precio, id_categoria, id_marca)
-- VALUES ('Sin categoria', 100, 99, 1);

-- Nota: un INSERT fallido igual consume un valor del contador identity,
-- por eso despues de las pruebas el siguiente id puede tener un salto.

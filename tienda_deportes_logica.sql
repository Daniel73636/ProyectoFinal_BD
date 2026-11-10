-- TIENDA DE DEPORTES - BLOQUE B: LOGICA DE NEGOCIO
-- Ejecutar en la base tienda_deportes DESPUES de tienda_deportes_estructura.sql.
-- PostgreSQL 11+. No crea tablas ni modifica datos de prueba existentes.
-- Se puede volver a ejecutar: reemplaza funciones/procedimientos y recrea triggers.

-- 1. TRIGGER: controlar y descontar stock antes de insertar detalle.
CREATE OR REPLACE FUNCTION fn_control_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- UPDATE atomico: evita vender por encima del stock aun con concurrencia.
    UPDATE producto
       SET stock = stock - NEW.cantidad
     WHERE id_producto = NEW.id_producto
       AND stock >= NEW.cantidad;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto % inexistente o stock insuficiente para % unidades',
            NEW.id_producto, NEW.cantidad
            USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_control_stock ON detalle_venta;
CREATE TRIGGER trg_control_stock
BEFORE INSERT ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_control_stock();

-- 2. TRIGGER: registrar cambios reales de precio.
CREATE OR REPLACE FUNCTION fn_auditoria_precio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO auditoria_precio (id_producto, precio_anterior, precio_nuevo, fecha_cambio)
    VALUES (OLD.id_producto, OLD.precio, NEW.precio, CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_precio ON producto;
CREATE TRIGGER trg_auditoria_precio
AFTER UPDATE OF precio ON producto
FOR EACH ROW
WHEN (OLD.precio IS DISTINCT FROM NEW.precio)
EXECUTE FUNCTION fn_auditoria_precio();

-- 3. PROCEDIMIENTO: registrar una venta de un producto.
-- Se usa una sola transaccion por CALL: si algo falla, se revierte todo.
CREATE OR REPLACE PROCEDURE sp_registrar_venta(
    IN p_cedula_cliente VARCHAR(15),
    IN p_id_empleado INTEGER,
    IN p_id_producto INTEGER,
    IN p_cantidad INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_precio NUMERIC(10,2);
    v_id_venta INTEGER;
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad de venta debe ser mayor que cero'
            USING ERRCODE = '22023';
    END IF;

    -- Bloquea el producto hasta terminar la operacion; precio y stock coherentes.
    SELECT precio INTO v_precio
      FROM producto
     WHERE id_producto = p_id_producto
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto % no existe', p_id_producto
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO venta (cedula_cliente, id_empleado)
    VALUES (p_cedula_cliente, p_id_empleado)
    RETURNING id_venta INTO v_id_venta;

    -- Dispara trg_control_stock, que valida y descuenta existencias.
    INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
    VALUES (v_id_venta, p_id_producto, p_cantidad, v_precio);

    UPDATE venta
       SET total = p_cantidad * v_precio
     WHERE id_venta = v_id_venta;

    RAISE NOTICE 'Venta % registrada; total: %', v_id_venta, p_cantidad * v_precio;
END;
$$;

-- 4. PROCEDIMIENTO: reponer stock.
CREATE OR REPLACE PROCEDURE sp_reponer_stock(
    IN p_id_producto INTEGER,
    IN p_cantidad INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad a reponer debe ser mayor que cero'
            USING ERRCODE = '22023';
    END IF;

    UPDATE producto
       SET stock = stock + p_cantidad
     WHERE id_producto = p_id_producto;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe el producto %', p_id_producto
            USING ERRCODE = 'P0001';
    END IF;

    RAISE NOTICE 'Se repusieron % unidades del producto %', p_cantidad, p_id_producto;
END;
$$;

-- Verificacion de objetos:
-- SELECT tgname FROM pg_trigger WHERE NOT tgisinternal
--   AND tgrelid IN ('producto'::regclass, 'detalle_venta'::regclass);
-- SELECT proname, prokind FROM pg_proc
--   WHERE proname IN ('sp_registrar_venta', 'sp_reponer_stock',
--                     'fn_control_stock', 'fn_auditoria_precio');

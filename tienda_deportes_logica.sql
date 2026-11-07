-- =====================================================================
-- TIENDA DE DEPORTES - Lógica de la BD (Bloque B)
-- 2 procedimientos + 2 triggers
-- Ejecutar CONECTADO a la BD tienda_deportes (después del script de estructura).
-- =====================================================================

-- ---------------------------------------------------------------------
-- FUNCIÓN + TRIGGER: control de stock al insertar detalle de venta
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_control_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock INTEGER;
    v_nombre VARCHAR(100);
BEGIN
    SELECT stock, nombre INTO v_stock, v_nombre
    FROM producto
    WHERE id_producto = NEW.id_producto
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto % no existe', NEW.id_producto
            USING ERRCODE = '23503';
    END IF;

    IF v_stock < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para "%": disponible %, solicitado %',
            v_nombre, v_stock, NEW.cantidad
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE producto
    SET stock = stock - NEW.cantidad
    WHERE id_producto = NEW.id_producto;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_control_stock ON detalle_venta;
CREATE TRIGGER trg_control_stock
BEFORE INSERT ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_control_stock();


-- ---------------------------------------------------------------------
-- FUNCIÓN + TRIGGER: auditoría de precios
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auditoria_precio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.precio IS DISTINCT FROM OLD.precio THEN
        INSERT INTO auditoria_precio (id_producto, precio_anterior, precio_nuevo)
        VALUES (OLD.id_producto, OLD.precio, NEW.precio);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_precio ON producto;
CREATE TRIGGER trg_auditoria_precio
AFTER UPDATE OF precio ON producto
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_precio();


-- ---------------------------------------------------------------------
-- PROCEDIMIENTO: registrar venta (dispara el trigger de stock)
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_registrar_venta(
    p_cedula_cliente VARCHAR(15),
    p_id_empleado    INTEGER,
    p_id_producto    INTEGER,
    p_cantidad       INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_venta INTEGER;
    v_precio   NUMERIC(10,2);
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor que 0'
            USING ERRCODE = '23514';
    END IF;

    SELECT precio INTO v_precio
    FROM producto
    WHERE id_producto = p_id_producto;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto % no existe', p_id_producto
            USING ERRCODE = '23503';
    END IF;

    INSERT INTO venta (cedula_cliente, id_empleado, total)
    VALUES (p_cedula_cliente, p_id_empleado, 0)
    RETURNING id_venta INTO v_id_venta;

    INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
    VALUES (v_id_venta, p_id_producto, p_cantidad, v_precio);

    UPDATE venta
    SET total = p_cantidad * v_precio
    WHERE id_venta = v_id_venta;
END;
$$;


-- ---------------------------------------------------------------------
-- PROCEDIMIENTO: reponer stock
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_reponer_stock(
    p_id_producto INTEGER,
    p_cantidad    INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad a reponer debe ser mayor que 0'
            USING ERRCODE = '23514';
    END IF;

    UPDATE producto
    SET stock = stock + p_cantidad
    WHERE id_producto = p_id_producto;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto % no existe', p_id_producto
            USING ERRCODE = '23503';
    END IF;
END;
$$;

# Tienda Deportes — Trabajo Final BD + C#

Proyecto de **tienda de deportes** con PostgreSQL y C# (API + panel web).  
Cumple el enunciado: BD relacional con integridad referencial, constraints, índices, procedimientos, triggers y CRUD de dos tablas con manejo de excepciones.

**Equipo:** David, Daniel y Josué  
**Repo:** https://github.com/Daniel73636/ProyectoFinal_BD

---

## Qué incluye

| Elemento | Detalle |
|----------|---------|
| Tablas | 8 (`categoria`, `marca`, `cliente`, `empleado`, `producto`, `venta`, `detalle_venta`, `auditoria_precio`) |
| Constraints | `CHECK`, `UNIQUE`, `NOT NULL`, `DEFAULT`, FK con `ON DELETE RESTRICT` |
| Índices | `idx_producto_nombre`, `idx_producto_categoria`, `idx_venta_cliente` |
| Triggers | `trg_control_stock`, `trg_auditoria_precio` |
| Procedimientos | `sp_registrar_venta`, `sp_reponer_stock` |
| CRUD | Tablas **cliente** y **producto** (C# + panel) |
| Excepciones | Captura de `SqlState` (23505, 23001, 23503, 23502, 23514, 22P02, 428C9, P0001…) sin que el programa cancele |

---

## Estructura del repo

```
ProyectoFinal_BD/
├── tienda_deportes_estructura.sql   # Tablas, constraints, índices, datos
├── tienda_deportes_logica.sql       # Triggers + procedimientos (Bloque B)
├── modelo_tienda_deportes.pdf
├── docker-compose.yml
├── scripts/init-db.ps1
├── Backend/
│   ├── TiendaDeportes.Api/          # API ASP.NET + Npgsql
│   └── TiendaDeportes.Console/      # Prueba rápida de conexión
└── Frontend/                        # Panel CRUD (modales + notificaciones)
```

---

## Cómo ejecutar (Docker)

### Requisitos
- Docker Desktop encendido
- Puertos libres: `5432`, `8080`, `8088`

### 1. Levantar servicios
```powershell
cd "C:\Users\danie\Desktop\Semestre 4\ProyectoFinal_BD"
docker compose up -d --build
```

### 2. Cargar la base de datos (primera vez o BD vacía)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-db.ps1
```

Eso crea `tienda_deportes`, ejecuta el script de **estructura** (si hace falta) y luego el de **lógica** (SP + triggers).

### 3. Abrir el panel
- **Front:** http://localhost:8088  
- **API:** http://localhost:8080  
- **Health:** http://localhost:8080/api/health  

### Cadena de conexión
```
Host=localhost;Port=5432;Database=tienda_deportes;Username=postgres;Password=postgres
```

---

## Uso del panel

1. Pestaña **Productos** o **Clientes**
2. Formulario superior → **crear**
3. En cada tarjeta → **Editar** (modal) / **Eliminar** (confirmación)
4. Los errores de PostgreSQL (constraints, FK, triggers) llegan como **notificaciones** con código `SqlState` y motivo

Ejemplos para la demo:
- Cliente con cédula duplicada → `23505`
- Precio negativo → `23514`
- Borrar cliente/producto con dependencias → `23001`

---

## Probar SP y triggers en SQL

```sql
-- Registrar venta (dispara trg_control_stock)
CALL sp_registrar_venta('1001234567', 1, 1, 2);

-- Reponer stock
CALL sp_reponer_stock(1, 5);

-- Ver auditoría (dispara trg_auditoria_precio al cambiar precio)
UPDATE producto SET precio = precio + 1000 WHERE id_producto = 2;
SELECT * FROM auditoria_precio ORDER BY id_auditoria DESC;
```

---

## Manejo de errores (sustentación)

Archivo clave del backend:

`Backend/TiendaDeportes.Api/Services/PostgresErrorMapper.cs`

Ahí se traduce `PostgresException.SqlState` a un JSON que el front muestra.  
La BD **aplica** las reglas; el programa **captura** y no se cierra.

---

## Consola de prueba (opcional)

```powershell
docker compose run --rm console
```

Lista los nombres de productos para verificar conexión.

---

## Detener

```powershell
docker compose down
```

Para borrar también los datos del volumen:

```powershell
docker compose down -v
```

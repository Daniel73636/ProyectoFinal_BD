# Tienda Deportes — Trabajo Final BD + C#

Proyecto de **tienda de deportes** con PostgreSQL y C# (API + panel web), todo en **Docker** para no depender de rutas ni instalaciones locales (.NET, PostgreSQL, etc.).

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
| Excepciones | Captura de `SqlState` sin que el programa cancele |

---

## Requisitos

Solo **Docker Desktop** (o Docker Engine + Compose).  
Puertos libres: `5432`, `8080`, `8088`.

No hace falta instalar .NET ni PostgreSQL en el PC.

---

## Cómo ejecutar (solo Docker)

Desde la carpeta del repositorio (después de clonar):

```bash
docker compose up -d --build
docker compose run --rm db-init
```

1. `up` levanta **db**, **api** y **frontend** en contenedores.  
2. `db-init` crea la BD y ejecuta los `.sql` **dentro de Docker** (sin rutas locales).

### Abrir
- **Panel CRUD:** http://localhost:8088  
- **API:** http://localhost:8080  
- **Health:** http://localhost:8080/api/health  

### Cadena (dentro de Docker la API usa `Host=db`)
```
Host=localhost;Port=5432;Database=tienda_deportes;Username=postgres;Password=postgres
```

### Detener
```bash
docker compose down
```

Borrar también los datos:
```bash
docker compose down -v
```

### Reinicio limpio (demo)
```bash
docker compose down -v
docker compose up -d --build
docker compose run --rm db-init
```

---

## Estructura del repo

```
ProyectoFinal_BD/
├── docker-compose.yml
├── tienda_deportes_estructura.sql
├── tienda_deportes_logica.sql
├── scripts/init-db.sh          # init 100% Docker
├── Backend/TiendaDeportes.Api/
├── Backend/TiendaDeportes.Console/
└── Frontend/
```

---

## Uso del panel

1. Pestaña **Productos** o **Clientes**
2. Formulario superior → **crear**
3. En cada tarjeta → **Editar** (modal) / **Eliminar**
4. Errores de PostgreSQL → notificaciones con `SqlState` y motivo

Ejemplos para la demo:
- Cédula duplicada → `23505`
- Precio negativo → `23514`
- Borrar con dependencias → `23001`

---

## Probar SP y triggers (también por Docker)

```bash
docker compose exec db psql -U postgres -d tienda_deportes
```

Dentro de `psql`:

```sql
CALL sp_registrar_venta('1001234567', 1, 1, 2);
CALL sp_reponer_stock(1, 5);
UPDATE producto SET precio = precio + 1000 WHERE id_producto = 2;
SELECT * FROM auditoria_precio ORDER BY id_auditoria DESC;
```

---

## Manejo de errores (sustentación)

Archivo: `Backend/TiendaDeportes.Api/Services/PostgresErrorMapper.cs`

La BD aplica constraints/triggers; el backend captura `PostgresException` y el front muestra código + motivo. El programa no se cancela.

---

## Consola C# de prueba (opcional)

```bash
docker compose --profile console run --rm console
```

# Ejecuta scripts SQL sin modificarlos.
# - Estructura: solo si aún no existen tablas
# - Lógica (SP/triggers): siempre (CREATE OR REPLACE)
$ErrorActionPreference = "Stop"
$container = "tienda_deportes_db"

Write-Host "Esperando PostgreSQL..."
docker exec $container pg_isready -U postgres | Out-Null

$exists = docker exec $container psql -U postgres -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = 'tienda_deportes'"
if ($exists -ne "1") {
    Write-Host "Creando base de datos tienda_deportes..."
    docker exec $container psql -U postgres -d postgres -c "CREATE DATABASE tienda_deportes;"
}

$hasProducto = docker exec $container psql -U postgres -d tienda_deportes -Atc "SELECT to_regclass('public.producto') IS NOT NULL"
if ($hasProducto -ne "t") {
    Write-Host "Ejecutando tienda_deportes_estructura.sql..."
    docker exec -i $container psql -U postgres -d tienda_deportes -v ON_ERROR_STOP=1 -f /scripts/tienda_deportes_estructura.sql
} else {
    Write-Host "Estructura ya presente; se omite el script de tablas."
}

Write-Host "Ejecutando tienda_deportes_logica.sql (SP + triggers)..."
docker exec -i $container psql -U postgres -d tienda_deportes -v ON_ERROR_STOP=1 -f /scripts/tienda_deportes_logica.sql

Write-Host "Listo."

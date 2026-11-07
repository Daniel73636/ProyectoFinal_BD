# Ejecuta el script SQL original SIN modificarlo.
# 1) CREATE DATABASE tienda_deportes (como indica el encabezado del .sql)
# 2) Ejecuta el resto del script contra esa BD

$ErrorActionPreference = "Stop"
$container = "tienda_deportes_db"
$scriptInContainer = "/scripts/tienda_deportes_estructura.sql"

Write-Host "Creando base de datos tienda_deportes (si no existe)..."
docker exec $container psql -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'tienda_deportes'" | ForEach-Object { $_.Trim() } | Out-Null
$exists = docker exec $container psql -U postgres -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = 'tienda_deportes'"
if ($exists -ne "1") {
    docker exec $container psql -U postgres -d postgres -c "CREATE DATABASE tienda_deportes;"
} else {
    Write-Host "La BD ya existe. Si el script falla por tablas existentes, ejecuta: DROP DATABASE tienda_deportes;"
}

Write-Host "Ejecutando tienda_deportes_estructura.sql sin cambios..."
docker exec -i $container psql -U postgres -d tienda_deportes -v ON_ERROR_STOP=1 -f $scriptInContainer

Write-Host "Listo."

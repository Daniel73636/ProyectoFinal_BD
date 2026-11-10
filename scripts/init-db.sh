#!/bin/sh
# Inicializa la BD SOLO con Docker (sin rutas locales de Windows).
set -e

echo "Esperando PostgreSQL en host=${PGHOST:-db}..."
until pg_isready -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" >/dev/null 2>&1; do
  sleep 1
done

EXISTS=$(psql -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = 'tienda_deportes'")

if [ "$EXISTS" != "1" ]; then
  echo "Creando base de datos tienda_deportes..."
  psql -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" -d postgres -c "CREATE DATABASE tienda_deportes;"
fi

HAS_PRODUCTO=$(psql -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" -d tienda_deportes -Atc "SELECT to_regclass('public.producto') IS NOT NULL")

if [ "$HAS_PRODUCTO" != "t" ]; then
  echo "Ejecutando tienda_deportes_estructura.sql..."
  psql -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" -d tienda_deportes -v ON_ERROR_STOP=1 -f /scripts/tienda_deportes_estructura.sql
else
  echo "Estructura ya presente; se omite el script de tablas."
fi

echo "Ejecutando tienda_deportes_logica.sql (SP + triggers)..."
psql -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" -d tienda_deportes -v ON_ERROR_STOP=1 -f /scripts/tienda_deportes_logica.sql

echo "Listo."
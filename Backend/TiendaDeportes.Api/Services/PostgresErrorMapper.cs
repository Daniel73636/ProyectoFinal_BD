using Npgsql;
using TiendaDeportes.Api.Models;

namespace TiendaDeportes.Api.Services;

/// <summary>
/// Traduce errores reales de PostgreSQL (constraints, FK, triggers, SP)
/// a un JSON para el front. No evita la restricción: solo la captura.
/// En la sustentación explicar este archivo al profesor.
/// </summary>
public static class PostgresErrorMapper
{
    public static (int StatusCode, ApiError Error) Map(PostgresException ex)
    {
        var detalle = string.IsNullOrWhiteSpace(ex.MessageText) ? null : ex.MessageText;

        var (tipo, mensajeBase, status) = ex.SqlState switch
        {
            "23505" => ("PK_O_UNIQUE",
                "Violación de clave primaria o UNIQUE (dato duplicado).",
                StatusCodes.Status409Conflict),
            "23001" => ("RESTRICT",
                "Violación de integridad referencial: no se puede borrar un padre que aún tiene hijos (ON DELETE RESTRICT).",
                StatusCodes.Status409Conflict),
            "23503" => ("FK",
                "Violación de llave foránea: la referencia apunta a un valor inexistente.",
                StatusCodes.Status400BadRequest),
            "23502" => ("NOT_NULL",
                "Violación de obligatoriedad: falta un campo obligatorio (NOT NULL).",
                StatusCodes.Status400BadRequest),
            "23514" => ("CHECK",
                "Violación de restricción CHECK (valor fuera de rango o inválido).",
                StatusCodes.Status400BadRequest),
            "22P02" => ("TIPO_DATO",
                "Violación del tipo de dato.",
                StatusCodes.Status400BadRequest),
            "428C9" => ("IDENTITY",
                "Intento de ingresar valor manual en un campo Identity / GENERATED ALWAYS.",
                StatusCodes.Status400BadRequest),
            // Errores lanzados por triggers / RAISE EXCEPTION en la BD
            "P0001" => ("TRIGGER_O_SP",
                "Regla de negocio de la BD (trigger o procedimiento) rechazó la operación.",
                StatusCodes.Status400BadRequest),
            _ => ("POSTGRES",
                detalle ?? "Error de base de datos.",
                StatusCodes.Status400BadRequest)
        };

        // Código + por qué (y detalle de PG/trigger si viene)
        var mensaje = detalle is null || detalle == mensajeBase
            ? mensajeBase
            : $"{mensajeBase} Detalle BD: {detalle}";

        return (status, new ApiError
        {
            SqlState = ex.SqlState,
            Tipo = tipo,
            Mensaje = mensaje
        });
    }

    public static (int StatusCode, ApiError Error) MapUnexpected(Exception ex) =>
        (StatusCodes.Status500InternalServerError, new ApiError
        {
            SqlState = "",
            Tipo = "INESPERADO",
            Mensaje = "Error inesperado controlado: el programa no se cancela. " + ex.Message
        });
}

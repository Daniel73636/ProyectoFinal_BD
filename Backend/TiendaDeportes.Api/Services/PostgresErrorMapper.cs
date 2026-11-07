using Npgsql;
using TiendaDeportes.Api.Models;

namespace TiendaDeportes.Api.Services;

public static class PostgresErrorMapper
{
    public static (int StatusCode, ApiError Error) Map(PostgresException ex)
    {
        var (tipo, mensaje, status) = ex.SqlState switch
        {
            "23505" => ("PK_O_UNIQUE", "Violación de clave primaria o UNIQUE (dato duplicado).", StatusCodes.Status409Conflict),
            "23001" => ("RESTRICT", "Violación de integridad referencial: no se puede borrar un registro que tiene dependencias.", StatusCodes.Status409Conflict),
            "23503" => ("FK", "Violación de llave foránea: la referencia apunta a un valor inexistente.", StatusCodes.Status400BadRequest),
            "23502" => ("NOT_NULL", "Violación de obligatoriedad: falta un campo obligatorio (NOT NULL).", StatusCodes.Status400BadRequest),
            "23514" => ("CHECK", "Violación de restricción CHECK (valor fuera de rango o inválido).", StatusCodes.Status400BadRequest),
            "22P02" => ("TIPO_DATO", "Violación del tipo de dato.", StatusCodes.Status400BadRequest),
            "428C9" => ("IDENTITY", "No se puede ingresar un valor manual en un campo Identity / GENERATED ALWAYS.", StatusCodes.Status400BadRequest),
            _ => ("POSTGRES", string.IsNullOrWhiteSpace(ex.MessageText) ? "Error de base de datos." : ex.MessageText, StatusCodes.Status400BadRequest)
        };

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

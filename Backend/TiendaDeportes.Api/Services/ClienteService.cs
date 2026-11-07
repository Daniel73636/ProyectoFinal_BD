using Npgsql;
using TiendaDeportes.Api.Models;

namespace TiendaDeportes.Api.Services;

public class ClienteService(IConfiguration config)
{
    private string Cs =>
        config.GetConnectionString("Default")
        ?? "Host=localhost;Port=5432;Database=tienda_deportes;Username=postgres;Password=postgres";

    public async Task<IReadOnlyList<Cliente>> ListarAsync()
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            """
            SELECT cedula, nombre, email, telefono, fecha_registro
            FROM cliente
            ORDER BY nombre;
            """, conn);

        var list = new List<Cliente>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new Cliente
            {
                Cedula = reader.GetString(0),
                Nombre = reader.GetString(1),
                Email = reader.IsDBNull(2) ? null : reader.GetString(2),
                Telefono = reader.IsDBNull(3) ? null : reader.GetString(3),
                FechaRegistro = reader.GetFieldValue<DateTime>(4)
            });
        }
        return list;
    }

    public async Task CrearAsync(ClienteCreateDto dto)
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO cliente (cedula, nombre, email, telefono)
            VALUES (@cedula, @nombre, @email, @telefono);
            """, conn);
        cmd.Parameters.AddWithValue("cedula", dto.Cedula.Trim());
        cmd.Parameters.AddWithValue("nombre", dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("email", (object?)dto.Email?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("telefono", (object?)dto.Telefono?.Trim() ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<bool> ActualizarAsync(string cedula, ClienteUpdateDto dto)
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            """
            UPDATE cliente
            SET nombre = @nombre, email = @email, telefono = @telefono
            WHERE cedula = @cedula;
            """, conn);
        cmd.Parameters.AddWithValue("cedula", cedula);
        cmd.Parameters.AddWithValue("nombre", dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("email", (object?)dto.Email?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("telefono", (object?)dto.Telefono?.Trim() ?? DBNull.Value);
        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> EliminarAsync(string cedula)
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "DELETE FROM cliente WHERE cedula = @cedula;", conn);
        cmd.Parameters.AddWithValue("cedula", cedula);
        return await cmd.ExecuteNonQueryAsync() > 0;
    }
}

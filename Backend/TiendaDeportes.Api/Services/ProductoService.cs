using Npgsql;
using TiendaDeportes.Api.Models;

namespace TiendaDeportes.Api.Services;

public class ProductoService(IConfiguration config)
{
    private string Cs =>
        config.GetConnectionString("Default")
        ?? "Host=localhost;Port=5432;Database=tienda_deportes;Username=postgres;Password=postgres";

    public async Task<IReadOnlyList<Producto>> ListarAsync()
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            """
            SELECT p.id_producto, p.nombre, p.precio, p.stock,
                   p.id_categoria, p.id_marca, c.nombre, m.nombre
            FROM producto p
            JOIN categoria c ON c.id_categoria = p.id_categoria
            JOIN marca m ON m.id_marca = p.id_marca
            ORDER BY p.id_producto;
            """, conn);

        var list = new List<Producto>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new Producto
            {
                IdProducto = reader.GetInt32(0),
                Nombre = reader.GetString(1),
                Precio = reader.GetDecimal(2),
                Stock = reader.GetInt32(3),
                IdCategoria = reader.GetInt32(4),
                IdMarca = reader.GetInt32(5),
                Categoria = reader.GetString(6),
                Marca = reader.GetString(7)
            });
        }
        return list;
    }

    public async Task<int> CrearAsync(ProductoCreateDto dto)
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO producto (nombre, precio, stock, id_categoria, id_marca)
            VALUES (@nombre, @precio, @stock, @id_categoria, @id_marca)
            RETURNING id_producto;
            """, conn);
        cmd.Parameters.AddWithValue("nombre", dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("precio", dto.Precio);
        cmd.Parameters.AddWithValue("stock", dto.Stock);
        cmd.Parameters.AddWithValue("id_categoria", dto.IdCategoria);
        cmd.Parameters.AddWithValue("id_marca", dto.IdMarca);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    public async Task<bool> ActualizarAsync(int id, ProductoUpdateDto dto)
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            """
            UPDATE producto
            SET nombre = @nombre,
                precio = @precio,
                stock = @stock,
                id_categoria = @id_categoria,
                id_marca = @id_marca
            WHERE id_producto = @id;
            """, conn);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("nombre", dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("precio", dto.Precio);
        cmd.Parameters.AddWithValue("stock", dto.Stock);
        cmd.Parameters.AddWithValue("id_categoria", dto.IdCategoria);
        cmd.Parameters.AddWithValue("id_marca", dto.IdMarca);
        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> EliminarAsync(int id)
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "DELETE FROM producto WHERE id_producto = @id;", conn);
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    public async Task ReponerStockAsync(int idProducto, int cantidad)
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "CALL sp_reponer_stock(@id, @cantidad);", conn);
        cmd.Parameters.AddWithValue("id", idProducto);
        cmd.Parameters.AddWithValue("cantidad", cantidad);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<IReadOnlyList<CatalogoItem>> CategoriasAsync()
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "SELECT id_categoria, nombre FROM categoria ORDER BY nombre;", conn);
        var list = new List<CatalogoItem>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new CatalogoItem { Id = reader.GetInt32(0), Nombre = reader.GetString(1) });
        }
        return list;
    }

    public async Task<IReadOnlyList<CatalogoItem>> MarcasAsync()
    {
        await using var conn = new NpgsqlConnection(Cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "SELECT id_marca, nombre FROM marca ORDER BY nombre;", conn);
        var list = new List<CatalogoItem>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new CatalogoItem { Id = reader.GetInt32(0), Nombre = reader.GetString(1) });
        }
        return list;
    }
}

using Npgsql;

// Cadena de conexión:
// - Local / host: Host=localhost
// - Docker Compose: Host=db (variable ConnectionStrings__Default)
var connectionString =
    Environment.GetEnvironmentVariable("ConnectionStrings__Default")
    ?? "Host=localhost;Port=5432;Database=tienda_deportes;Username=postgres;Password=postgres";

Console.WriteLine("Conectando a PostgreSQL (tienda_deportes)...");

try
{
    await using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();
    Console.WriteLine("Conexión exitosa.\n");

    await using var command = new NpgsqlCommand(
        "SELECT nombre FROM producto ORDER BY id_producto;",
        connection);

    await using var reader = await command.ExecuteReaderAsync();

    Console.WriteLine("Productos:");
    var count = 0;
    while (await reader.ReadAsync())
    {
        count++;
        Console.WriteLine($"  {count}. {reader.GetString(0)}");
    }

    Console.WriteLine($"\nTotal: {count} producto(s).");
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Error al conectar o consultar: {ex.Message}");
    Environment.ExitCode = 1;
}

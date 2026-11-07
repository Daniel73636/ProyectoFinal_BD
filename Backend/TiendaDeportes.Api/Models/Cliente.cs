namespace TiendaDeportes.Api.Models;

public class Cliente
{
    public string Cedula { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string? Email { get; set; }
    public string? Telefono { get; set; }
    public DateTime FechaRegistro { get; set; }
}

public class ClienteCreateDto
{
    public string Cedula { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string? Email { get; set; }
    public string? Telefono { get; set; }
}

public class ClienteUpdateDto
{
    public string Nombre { get; set; } = "";
    public string? Email { get; set; }
    public string? Telefono { get; set; }
}

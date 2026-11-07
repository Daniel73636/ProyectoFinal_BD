namespace TiendaDeportes.Api.Models;

public class Producto
{
    public int IdProducto { get; set; }
    public string Nombre { get; set; } = "";
    public decimal Precio { get; set; }
    public int Stock { get; set; }
    public int IdCategoria { get; set; }
    public int IdMarca { get; set; }
    public string? Categoria { get; set; }
    public string? Marca { get; set; }
}

public class ProductoCreateDto
{
    public string Nombre { get; set; } = "";
    public decimal Precio { get; set; }
    public int Stock { get; set; }
    public int IdCategoria { get; set; }
    public int IdMarca { get; set; }
}

public class ProductoUpdateDto
{
    public string Nombre { get; set; } = "";
    public decimal Precio { get; set; }
    public int Stock { get; set; }
    public int IdCategoria { get; set; }
    public int IdMarca { get; set; }
}

public class CatalogoItem
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
}

public class ReponerStockDto
{
    public int Cantidad { get; set; }
}

public class ApiError
{
    public string SqlState { get; set; } = "";
    public string Mensaje { get; set; } = "";
    public string Tipo { get; set; } = "";
}

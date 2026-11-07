using Npgsql;
using TiendaDeportes.Api.Models;
using TiendaDeportes.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});
builder.Services.AddSingleton<ClienteService>();
builder.Services.AddSingleton<ProductoService>();

var app = builder.Build();

app.UseCors();
app.MapOpenApi();

async Task<IResult> Safe(Func<Task<IResult>> action)
{
    try
    {
        return await action();
    }
    catch (PostgresException ex)
    {
        var (status, error) = PostgresErrorMapper.Map(ex);
        return Results.Json(error, statusCode: status);
    }
    catch (Exception ex)
    {
        var (status, error) = PostgresErrorMapper.MapUnexpected(ex);
        return Results.Json(error, statusCode: status);
    }
}

var clientes = app.MapGroup("/api/clientes");
clientes.MapGet("/", async (ClienteService svc) =>
    await Safe(async () => Results.Ok(await svc.ListarAsync())));

clientes.MapPost("/", async (ClienteCreateDto dto, ClienteService svc) =>
    await Safe(async () =>
    {
        if (string.IsNullOrWhiteSpace(dto.Cedula) || string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return Results.Json(new ApiError
            {
                SqlState = "23502",
                Tipo = "NOT_NULL",
                Mensaje = "Cédula y nombre son obligatorios."
            }, statusCode: StatusCodes.Status400BadRequest);
        }

        await svc.CrearAsync(dto);
        return Results.Created($"/api/clientes/{dto.Cedula}", dto);
    }));

clientes.MapPut("/{cedula}", async (string cedula, ClienteUpdateDto dto, ClienteService svc) =>
    await Safe(async () =>
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return Results.Json(new ApiError
            {
                SqlState = "23502",
                Tipo = "NOT_NULL",
                Mensaje = "El nombre es obligatorio."
            }, statusCode: StatusCodes.Status400BadRequest);
        }

        var ok = await svc.ActualizarAsync(cedula, dto);
        return ok ? Results.NoContent() : Results.NotFound();
    }));

clientes.MapDelete("/{cedula}", async (string cedula, ClienteService svc) =>
    await Safe(async () =>
    {
        var ok = await svc.EliminarAsync(cedula);
        return ok ? Results.NoContent() : Results.NotFound();
    }));

var productos = app.MapGroup("/api/productos");
productos.MapGet("/", async (ProductoService svc) =>
    await Safe(async () => Results.Ok(await svc.ListarAsync())));

productos.MapPost("/", async (ProductoCreateDto dto, ProductoService svc) =>
    await Safe(async () =>
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return Results.Json(new ApiError
            {
                SqlState = "23502",
                Tipo = "NOT_NULL",
                Mensaje = "El nombre del producto es obligatorio."
            }, statusCode: StatusCodes.Status400BadRequest);
        }

        var id = await svc.CrearAsync(dto);
        return Results.Created($"/api/productos/{id}", new { idProducto = id });
    }));

productos.MapPut("/{id:int}", async (int id, ProductoUpdateDto dto, ProductoService svc) =>
    await Safe(async () =>
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return Results.Json(new ApiError
            {
                SqlState = "23502",
                Tipo = "NOT_NULL",
                Mensaje = "El nombre del producto es obligatorio."
            }, statusCode: StatusCodes.Status400BadRequest);
        }

        var ok = await svc.ActualizarAsync(id, dto);
        return ok ? Results.NoContent() : Results.NotFound();
    }));

productos.MapDelete("/{id:int}", async (int id, ProductoService svc) =>
    await Safe(async () =>
    {
        var ok = await svc.EliminarAsync(id);
        return ok ? Results.NoContent() : Results.NotFound();
    }));

productos.MapPost("/{id:int}/reponer", async (int id, ReponerStockDto dto, ProductoService svc) =>
    await Safe(async () =>
    {
        await svc.ReponerStockAsync(id, dto.Cantidad);
        return Results.Ok(new { mensaje = "Stock repuesto con sp_reponer_stock." });
    }));

app.MapGet("/api/categorias", async (ProductoService svc) =>
    await Safe(async () => Results.Ok(await svc.CategoriasAsync())));

app.MapGet("/api/marcas", async (ProductoService svc) =>
    await Safe(async () => Results.Ok(await svc.MarcasAsync())));

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.Run("http://0.0.0.0:8080");

const API = typeof window.API_BASE === "string" ? window.API_BASE : "http://localhost:8080";

const toastEl = document.getElementById("toast");
let categorias = [];
let marcas = [];
let productoEditId = null;
let clienteEditCedula = null;

function showToast(mensaje, tipo = "error") {
  toastEl.hidden = false;
  toastEl.className = `toast ${tipo}`;
  toastEl.textContent = mensaje;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.hidden = true; }, 6000);
}

async function api(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });

    if (res.status === 204) return { ok: true, data: null };

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const msg = data?.mensaje
        ? `[${data.sqlState || "ERR"} · ${data.tipo || "ERROR"}] ${data.mensaje}`
        : `Error HTTP ${res.status}`;
      showToast(msg, "error");
      return { ok: false, data };
    }

    return { ok: true, data };
  } catch (err) {
    showToast(`Error controlado (programa no cancela): ${err.message}`, "error");
    return { ok: false, data: null };
  }
}

function money(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

/* Tabs */
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("is-active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("is-active");
  });
});

/* Catalogos */
async function cargarCatalogos() {
  const [c, m] = await Promise.all([
    api("/api/categorias"),
    api("/api/marcas")
  ]);
  if (c.ok) categorias = c.data;
  if (m.ok) marcas = m.data;

  const catSel = document.getElementById("producto-categoria");
  const marSel = document.getElementById("producto-marca");
  catSel.innerHTML = categorias.map((x) => `<option value="${x.id}">${x.nombre}</option>`).join("");
  marSel.innerHTML = marcas.map((x) => `<option value="${x.id}">${x.nombre}</option>`).join("");
}

/* Productos */
async function cargarProductos() {
  const { ok, data } = await api("/api/productos");
  const box = document.getElementById("lista-productos");
  if (!ok) {
    box.innerHTML = "<p class='meta'>No se pudieron cargar productos.</p>";
    return;
  }

  box.innerHTML = data.map((p) => `
    <article class="card">
      <h3>${escapeHtml(p.nombre)}</h3>
      <div class="meta">
        <span>${money(p.precio)} · Stock ${p.stock}</span>
        <span>${escapeHtml(p.categoria || "")} · ${escapeHtml(p.marca || "")}</span>
        <span>ID ${p.idProducto}</span>
      </div>
      <div class="card-actions">
        <button class="btn edit small" data-edit-producto='${JSON.stringify(p)}'>Editar</button>
        <button class="btn update small" data-actualizar-producto="${p.idProducto}">Actualizar</button>
        <button class="btn delete small" data-delete-producto="${p.idProducto}">Eliminar</button>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-producto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = JSON.parse(btn.getAttribute("data-edit-producto"));
      productoEditId = p.idProducto;
      document.getElementById("producto-id").value = p.idProducto;
      document.getElementById("producto-nombre").value = p.nombre;
      document.getElementById("producto-precio").value = p.precio;
      document.getElementById("producto-stock").value = p.stock;
      document.getElementById("producto-categoria").value = p.idCategoria;
      document.getElementById("producto-marca").value = p.idMarca;
      document.getElementById("btn-producto-guardar").textContent = "Actualizar";
      document.getElementById("btn-producto-cancelar").hidden = false;
      showToast(`Editando producto #${p.idProducto}. Cambia datos y pulsa Actualizar.`, "ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  box.querySelectorAll("[data-actualizar-producto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-actualizar-producto"));
      const card = data.find((x) => x.idProducto === id);
      if (!card) return;
      productoEditId = card.idProducto;
      document.getElementById("producto-id").value = card.idProducto;
      document.getElementById("producto-nombre").value = card.nombre;
      document.getElementById("producto-precio").value = card.precio;
      document.getElementById("producto-stock").value = card.stock;
      document.getElementById("producto-categoria").value = card.idCategoria;
      document.getElementById("producto-marca").value = card.idMarca;
      document.getElementById("btn-producto-guardar").textContent = "Actualizar";
      document.getElementById("btn-producto-cancelar").hidden = false;
      document.getElementById("form-producto").requestSubmit();
    });
  });

  box.querySelectorAll("[data-delete-producto]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-producto");
      if (!confirm(`¿Eliminar producto #${id}?`)) return;
      const res = await api(`/api/productos/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Producto eliminado.", "ok");
        await cargarProductos();
      }
    });
  });
}

document.getElementById("form-producto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    nombre: document.getElementById("producto-nombre").value.trim(),
    precio: Number(document.getElementById("producto-precio").value),
    stock: Number(document.getElementById("producto-stock").value),
    idCategoria: Number(document.getElementById("producto-categoria").value),
    idMarca: Number(document.getElementById("producto-marca").value)
  };

  if (Number.isNaN(body.precio) || Number.isNaN(body.stock)) {
    showToast("[22P02 · TIPO_DATO] Precio o stock no son numéricos válidos.", "error");
    return;
  }

  let res;
  if (productoEditId) {
    res = await api(`/api/productos/${productoEditId}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    if (res.ok) showToast("Producto actualizado.", "ok");
  } else {
    res = await api("/api/productos", {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (res.ok) showToast("Producto creado.", "ok");
  }

  if (res.ok) {
    resetProductoForm();
    await cargarProductos();
  }
});

document.getElementById("btn-producto-cancelar").addEventListener("click", resetProductoForm);

function resetProductoForm() {
  productoEditId = null;
  document.getElementById("form-producto").reset();
  document.getElementById("producto-id").value = "";
  document.getElementById("btn-producto-guardar").textContent = "Crear";
  document.getElementById("btn-producto-cancelar").hidden = true;
  if (categorias[0]) document.getElementById("producto-categoria").value = categorias[0].id;
  if (marcas[0]) document.getElementById("producto-marca").value = marcas[0].id;
}

/* Clientes */
async function cargarClientes() {
  const { ok, data } = await api("/api/clientes");
  const box = document.getElementById("lista-clientes");
  if (!ok) {
    box.innerHTML = "<p class='meta'>No se pudieron cargar clientes.</p>";
    return;
  }

  box.innerHTML = data.map((c) => `
    <article class="card">
      <h3>${escapeHtml(c.nombre)}</h3>
      <div class="meta">
        <span>Cédula ${escapeHtml(c.cedula)}</span>
        <span>${escapeHtml(c.email || "Sin email")}</span>
        <span>${escapeHtml(c.telefono || "Sin teléfono")}</span>
      </div>
      <div class="card-actions">
        <button class="btn edit small" data-edit-cliente='${JSON.stringify(c)}'>Editar</button>
        <button class="btn update small" data-actualizar-cliente="${escapeHtml(c.cedula)}">Actualizar</button>
        <button class="btn delete small" data-delete-cliente="${escapeHtml(c.cedula)}">Eliminar</button>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-cliente]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = JSON.parse(btn.getAttribute("data-edit-cliente"));
      fillClienteForm(c, true);
      showToast(`Editando cliente ${c.cedula}. Cambia datos y pulsa Actualizar.`, "ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  box.querySelectorAll("[data-actualizar-cliente]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cedula = btn.getAttribute("data-actualizar-cliente");
      const c = data.find((x) => x.cedula === cedula);
      if (!c) return;
      fillClienteForm(c, true);
      document.getElementById("form-cliente").requestSubmit();
    });
  });

  box.querySelectorAll("[data-delete-cliente]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cedula = btn.getAttribute("data-delete-cliente");
      if (!confirm(`¿Eliminar cliente ${cedula}?`)) return;
      const res = await api(`/api/clientes/${encodeURIComponent(cedula)}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Cliente eliminado.", "ok");
        await cargarClientes();
      }
    });
  });
}

function fillClienteForm(c, editing) {
  clienteEditCedula = editing ? c.cedula : null;
  document.getElementById("cliente-mode").value = editing ? "edit" : "create";
  document.getElementById("cliente-cedula").value = c.cedula;
  document.getElementById("cliente-cedula").disabled = !!editing;
  document.getElementById("cliente-nombre").value = c.nombre;
  document.getElementById("cliente-email").value = c.email || "";
  document.getElementById("cliente-telefono").value = c.telefono || "";
  document.getElementById("btn-cliente-guardar").textContent = editing ? "Actualizar" : "Crear";
  document.getElementById("btn-cliente-cancelar").hidden = !editing;
}

document.getElementById("form-cliente").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cedula = document.getElementById("cliente-cedula").value.trim();
  const body = {
    nombre: document.getElementById("cliente-nombre").value.trim(),
    email: document.getElementById("cliente-email").value.trim() || null,
    telefono: document.getElementById("cliente-telefono").value.trim() || null
  };

  let res;
  if (clienteEditCedula) {
    res = await api(`/api/clientes/${encodeURIComponent(clienteEditCedula)}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    if (res.ok) showToast("Cliente actualizado.", "ok");
  } else {
    res = await api("/api/clientes", {
      method: "POST",
      body: JSON.stringify({ cedula, ...body })
    });
    if (res.ok) showToast("Cliente creado.", "ok");
  }

  if (res.ok) {
    resetClienteForm();
    await cargarClientes();
  }
});

document.getElementById("btn-cliente-cancelar").addEventListener("click", resetClienteForm);

function resetClienteForm() {
  clienteEditCedula = null;
  document.getElementById("form-cliente").reset();
  document.getElementById("cliente-cedula").disabled = false;
  document.getElementById("cliente-mode").value = "create";
  document.getElementById("btn-cliente-guardar").textContent = "Crear";
  document.getElementById("btn-cliente-cancelar").hidden = true;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

(async function init() {
  await cargarCatalogos();
  await Promise.all([cargarProductos(), cargarClientes()]);
})();

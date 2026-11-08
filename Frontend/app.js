const API = typeof window.API_BASE === "string" ? window.API_BASE : "http://localhost:8080";

let categorias = [];
let marcas = [];
let confirmAction = null;

const notifyStack = document.getElementById("notify-stack");

function notify(mensaje, tipo = "error", titulo) {
  const titles = {
    ok: "Listo",
    error: "Error de base de datos",
    info: "Aviso",
    warn: "Atención"
  };
  const icons = { ok: "✓", error: "!", info: "i", warn: "!" };

  const el = document.createElement("div");
  el.className = `notify ${tipo}`;
  el.innerHTML = `
    <div class="notify-icon">${icons[tipo] || "!"}</div>
    <div class="notify-body">
      <p class="notify-title">${titulo || titles[tipo] || "Aviso"}</p>
      <p class="notify-text">${escapeHtml(mensaje)}</p>
    </div>
    <button type="button" class="notify-close" aria-label="Cerrar">×</button>
  `;

  const close = () => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 200);
  };

  el.querySelector(".notify-close").addEventListener("click", close);
  notifyStack.appendChild(el);
  setTimeout(close, tipo === "error" ? 9000 : 4200);
}

/** Muestra código SqlState + tipo + motivo tal como viene del backend. */
function notifyDbError(data, fallbackStatus) {
  if (data?.sqlState || data?.mensaje) {
    const codigo = data.sqlState || "SIN_CODIGO";
    const tipo = data.tipo || "ERROR";
    const titulo = `Error ${codigo}`;
    const mensaje = `(${tipo}) ${data.mensaje || "Error de PostgreSQL."}`;
    notify(mensaje, "error", titulo);
    return;
  }
  notify(`Error HTTP ${fallbackStatus}`, "error");
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
      notifyDbError(data, res.status);
      return { ok: false, data };
    }

    return { ok: true, data };
  } catch (err) {
    notify(`Error controlado (el programa no cancela): ${err.message}`, "error");
    return { ok: false, data: null };
  }
}

function money(n) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(n);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function openModal(name) {
  document.getElementById(`modal-${name}`).hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal(name) {
  const el = document.getElementById(`modal-${name}`);
  if (el) el.hidden = true;
  if ([...document.querySelectorAll(".modal")].every((m) => m.hidden)) {
    document.body.classList.remove("modal-open");
  }
}

document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close-modal")));
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    ["producto", "cliente", "confirm"].forEach(closeModal);
  }
});

function askConfirm({ title, message, onConfirm }) {
  document.getElementById("confirm-title").textContent = title || "Confirmar";
  document.getElementById("confirm-message").textContent = message;
  confirmAction = onConfirm;
  openModal("confirm");
}

document.getElementById("confirm-ok").addEventListener("click", async () => {
  const action = confirmAction;
  confirmAction = null;
  closeModal("confirm");
  if (action) await action();
});

/* Tabs */
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("is-active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("is-active");
  });
});

function fillSelect(select, items) {
  select.innerHTML = items.map((x) => `<option value="${x.id}">${escapeHtml(x.nombre)}</option>`).join("");
}

async function cargarCatalogos() {
  const [c, m] = await Promise.all([api("/api/categorias"), api("/api/marcas")]);
  if (c.ok) categorias = c.data;
  if (m.ok) marcas = m.data;

  fillSelect(document.getElementById("producto-categoria"), categorias);
  fillSelect(document.getElementById("producto-marca"), marcas);
  fillSelect(document.getElementById("edit-producto-categoria"), categorias);
  fillSelect(document.getElementById("edit-producto-marca"), marcas);
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
        <button type="button" class="btn-uiverse edit small" data-edit-producto="${p.idProducto}">Editar</button>
        <button type="button" class="btn-uiverse soft-danger small" data-delete-producto="${p.idProducto}">Eliminar</button>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-producto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = data.find((x) => String(x.idProducto) === btn.getAttribute("data-edit-producto"));
      if (!p) return;
      document.getElementById("edit-producto-id").value = p.idProducto;
      document.getElementById("edit-producto-nombre").value = p.nombre;
      document.getElementById("edit-producto-precio").value = p.precio;
      document.getElementById("edit-producto-stock").value = p.stock;
      document.getElementById("edit-producto-categoria").value = p.idCategoria;
      document.getElementById("edit-producto-marca").value = p.idMarca;
      openModal("producto");
    });
  });

  box.querySelectorAll("[data-delete-producto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-producto");
      askConfirm({
        title: "Eliminar producto",
        message: `¿Seguro que quieres eliminar el producto #${id}? Si tiene ventas asociadas, la BD responderá con error RESTRICT (23001).`,
        onConfirm: async () => {
          const res = await api(`/api/productos/${id}`, { method: "DELETE" });
          if (res.ok) {
            notify("Producto eliminado correctamente.", "ok");
            await cargarProductos();
          }
        }
      });
    });
  });
}

document.getElementById("form-producto").addEventListener("submit", async (e) => {
  e.preventDefault();
  // Se envía tal cual a la BD: CHECK, NOT NULL, FK, etc. los valida PostgreSQL.
  const body = {
    nombre: document.getElementById("producto-nombre").value.trim(),
    precio: Number(document.getElementById("producto-precio").value),
    stock: Number(document.getElementById("producto-stock").value),
    idCategoria: Number(document.getElementById("producto-categoria").value),
    idMarca: Number(document.getElementById("producto-marca").value)
  };

  const res = await api("/api/productos", { method: "POST", body: JSON.stringify(body) });
  if (res.ok) {
    notify("Producto creado.", "ok");
    e.target.reset();
    document.getElementById("producto-stock").value = 0;
    if (categorias[0]) document.getElementById("producto-categoria").value = categorias[0].id;
    if (marcas[0]) document.getElementById("producto-marca").value = marcas[0].id;
    await cargarProductos();
  }
});

document.getElementById("form-producto-edit").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("edit-producto-id").value;
  const body = {
    nombre: document.getElementById("edit-producto-nombre").value.trim(),
    precio: Number(document.getElementById("edit-producto-precio").value),
    stock: Number(document.getElementById("edit-producto-stock").value),
    idCategoria: Number(document.getElementById("edit-producto-categoria").value),
    idMarca: Number(document.getElementById("edit-producto-marca").value)
  };

  const res = await api(`/api/productos/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (res.ok) {
    notify("Producto actualizado. Si cambió el precio, se registró en auditoría.", "ok", "Actualizado");
    closeModal("producto");
    await cargarProductos();
  }
});

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
        <button type="button" class="btn-uiverse edit small" data-edit-cliente="${escapeHtml(c.cedula)}">Editar</button>
        <button type="button" class="btn-uiverse soft-danger small" data-delete-cliente="${escapeHtml(c.cedula)}">Eliminar</button>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-cliente]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = data.find((x) => x.cedula === btn.getAttribute("data-edit-cliente"));
      if (!c) return;
      document.getElementById("edit-cliente-cedula").value = c.cedula;
      document.getElementById("edit-cliente-nombre").value = c.nombre;
      document.getElementById("edit-cliente-email").value = c.email || "";
      document.getElementById("edit-cliente-telefono").value = c.telefono || "";
      openModal("cliente");
    });
  });

  box.querySelectorAll("[data-delete-cliente]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cedula = btn.getAttribute("data-delete-cliente");
      askConfirm({
        title: "Eliminar cliente",
        message: `¿Eliminar al cliente con cédula ${cedula}? Si tiene ventas, verás violación de integridad referencial (23001).`,
        onConfirm: async () => {
          const res = await api(`/api/clientes/${encodeURIComponent(cedula)}`, { method: "DELETE" });
          if (res.ok) {
            notify("Cliente eliminado correctamente.", "ok");
            await cargarClientes();
          }
        }
      });
    });
  });
}

document.getElementById("form-cliente").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    cedula: document.getElementById("cliente-cedula").value.trim(),
    nombre: document.getElementById("cliente-nombre").value.trim(),
    email: document.getElementById("cliente-email").value.trim() || null,
    telefono: document.getElementById("cliente-telefono").value.trim() || null
  };

  const res = await api("/api/clientes", { method: "POST", body: JSON.stringify(body) });
  if (res.ok) {
    notify("Cliente creado.", "ok");
    e.target.reset();
    await cargarClientes();
  }
});

document.getElementById("form-cliente-edit").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cedula = document.getElementById("edit-cliente-cedula").value;
  const body = {
    nombre: document.getElementById("edit-cliente-nombre").value.trim(),
    email: document.getElementById("edit-cliente-email").value.trim() || null,
    telefono: document.getElementById("edit-cliente-telefono").value.trim() || null
  };

  const res = await api(`/api/clientes/${encodeURIComponent(cedula)}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });

  if (res.ok) {
    notify("Cliente actualizado.", "ok", "Actualizado");
    closeModal("cliente");
    await cargarClientes();
  }
});

(async function init() {
  await cargarCatalogos();
  await Promise.all([cargarProductos(), cargarClientes()]);
})();

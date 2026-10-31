// URL directa al backend PHP que ejecutaste en XAMPP
const API_BASE_URL = "http://127.0.0.1:8000/api.php";

let productos = [];
let carrito = [];

// Cargar catálogo desde la base de datos JSON al iniciar
document.addEventListener("DOMContentLoaded", () => {
  cargarProductosDesdeBackend();
});

// GET: Consulta el catálogo y existencias en tiempo real
async function cargarProductosDesdeBackend() {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) throw new Error("Error al obtener productos");
    productos = await response.json();
    renderizarProductos();
  } catch (error) {
    mostrarMensaje("Error al conectar con el servidor backend.", "error");
  }
}

function renderizarProductos() {
  const container = document.getElementById("product-list");
  container.innerHTML = "";

  productos.forEach(prod => {
    const card = document.createElement("div");
    card.className = "card";
    
    const stockClase = prod.stock <= 2 ? "stock-tag low" : "stock-tag";
    const disponible = prod.stock > 0;

    card.innerHTML = `
      <h3>${prod.nombre}</h3>
      <p>Precio: $${parseFloat(prod.precio).toFixed(2)}</p>
      <p class="${stockClase}">Stock disponible: ${prod.stock}</p>
      <button 
        onclick="agregarAlCarrito(${prod.id})" 
        ${!disponible ? "disabled" : ""}>
        ${disponible ? "Agregar al Carrito" : "Agotado"}
      </button>
    `;
    container.appendChild(card);
  });
}

function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  const enCarrito = carrito.find(item => item.id === id);
  const cantidadEnCarrito = enCarrito ? enCarrito.cantidad : 0;

  // Validación previa en el cliente
  if (cantidadEnCarrito + 1 > producto.stock) {
    mostrarMensaje(`No puedes agregar más unidades de ${producto.nombre}. Stock insuficiente.`, "error");
    return;
  }

  if (enCarrito) {
    enCarrito.cantidad++;
  } else {
    carrito.push({ id: producto.id, nombre: producto.nombre, precio: parseFloat(producto.precio), cantidad: 1 });
  }

  actualizarCarritoUI();
}

function actualizarCarritoUI() {
  const list = document.getElementById("cart-items");
  const count = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total");

  list.innerHTML = "";
  let total = 0;
  let totalItems = 0;

  carrito.forEach(item => {
    total += item.precio * item.cantidad;
    totalItems += item.cantidad;

    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.nombre} x${item.cantidad}</span>
      <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
    `;
    list.appendChild(li);
  });

  count.innerText = totalItems;
  totalEl.innerText = total.toFixed(2);
}

// POST: Envía la transacción atómica al Backend PHP
async function procesarCompra() {
  if (carrito.length === 0) {
    mostrarMensaje("El carrito está vacío.", "error");
    return;
  }

  const checkoutBtn = document.getElementById("checkout-btn");
  checkoutBtn.disabled = true;
  checkoutBtn.innerText = "Procesando...";

  const payload = {
    items: carrito.map(item => ({
      producto_id: item.id,
      cantidad: item.cantidad
    }))
  };

  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.status === 201) {
      // Éxito: HTTP 201 Created
      carrito = [];
      actualizarCarritoUI();
      await cargarProductosDesdeBackend(); // Sincronizar nuevo stock desde database.json
      mostrarMensaje(`¡Compra exitosa! Folio: ${data.folio}`, "success");
    } else if (response.status === 409) {
      // Error de Stock: HTTP 409 Conflict (Anti-Overselling)
      mostrarMensaje(`Error: ${data.error}`, "error");
      await cargarProductosDesdeBackend();
    } else {
      mostrarMensaje("No se pudo procesar la transacción.", "error");
    }

  } catch (error) {
    mostrarMensaje("Error de comunicación con el servidor backend.", "error");
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.innerText = "Finalizar Compra";
  }
}

function mostrarMensaje(texto, tipo) {
  const msgDiv = document.getElementById("status-message");
  msgDiv.className = `message ${tipo}`;
  msgDiv.innerText = texto;
  setTimeout(() => { msgDiv.className = "message"; }, 5000);
}
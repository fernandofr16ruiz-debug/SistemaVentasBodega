const API_URL = 'http://localhost:3000/api';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * POST JSON helper — envía un objeto y devuelve {response, data}
 * @param {string} pathOrUrl - Ruta relativa o URL completa
 * @param {object} body - Payload JSON
 */
async function postJSON(pathOrUrl, body) {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_URL}${pathOrUrl}`;
    const response = await fetch(url, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) });
    let data = null;
    try { data = await response.json(); } catch (e) { /* ignore json parse errors */ }
    return { response, data };
}
/**
 * Genérico para peticiones API (GET/POST/PUT/DELETE)
 * @param {string} method
 * @param {string} pathOrUrl
 * @param {object} [body]
 */
// Generic API request helper
async function apiRequest(method, pathOrUrl, body) {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_URL}${pathOrUrl}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const response = await fetch(url, opts);
    let data = null;
    try { data = await response.json(); } catch (e) { /* ignore */ }
    return { response, data };
}
let db = []; 
let itemSeleccionadoCaja = null;
let carrito = []; 
let metodoPagoSeleccionado = '';
let totalGlobalVenta = 0;

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('tabla-datos') || document.getElementById('kpi-productos') || document.getElementById('nombreInput') || document.getElementById('gridProductosTienda')) cargarProductos();
    if(document.getElementById('tabla-proveedores')) cargarProveedores();
    if(document.getElementById('tabla-facturas')) cargarFacturas();
    if(document.getElementById('tabla-usuarios')) cargarUsuarios();

    // Nombre en el POS (Cajero)
    const op = document.getElementById('nombre-operador');
    if(op) {
        let nombreCajero = localStorage.getItem('nombreUsuario') || 'CAJERO';
        nombreCajero = nombreCajero.replace(/MAÃ±ANA/ig, 'MAÑANA').replace(/Ã±/g, 'ñ');
        op.innerText = 'OPERADOR: ' + nombreCajero.toUpperCase();
    }

    // Validación y Nombre en la Tienda Virtual (Cliente)
    const nomCliente = document.getElementById('nombreClienteActivo');
    if(nomCliente) {
        nomCliente.innerText = localStorage.getItem('nombreUsuario') || 'Invitado';
        if(!localStorage.getItem('usuarioId')) {
            alert("Debes iniciar sesión para comprar.");
            window.location.href = 'index.html';
        }
    }
});

// ==========================================
// 1. INVENTARIO COMÚN
// ==========================================
/** Carga productos desde API y actualiza vistas */
async function cargarProductos() {
    try {
        const { response, data } = await apiRequest('GET', '/productos');
        if (!response.ok) throw new Error('Error de red');
        db = data || [];

        const filtro = document.getElementById('filtroCategoria');
        if (filtro) filtro.innerHTML = '<option value="Todas">Mostrar Todos</option>';
        if (document.getElementById('tabla-datos')) actualizarIU();
        if (document.getElementById('contenedor-alertas')) verificarAlertas();
        if (document.getElementById('kpi-productos')) renderGrafica();
        if (document.getElementById('gridProductosTienda')) renderizarTienda('Todas');
    } catch (error) { console.error('Error:', error); }
}

/** Actualiza la interfaz del inventario en el administrador */
function actualizarIU(categoriaBuscada = 'Todas') {
    const tbody = document.getElementById('tabla-datos');
    const filtro = document.getElementById('filtroCategoria');
    if (!tbody) return;
    
    if (filtro && filtro.options.length === 1) { 
        const cats = [...new Set(db.map(item => item.categoria || 'Abarrotes'))];
        cats.forEach(cat => filtro.innerHTML += `<option value="${cat}">${cat.toUpperCase()}</option>`);
        filtro.value = categoriaBuscada; 
    }

    let filtrados = categoriaBuscada !== 'Todas' ? db.filter(i => (i.categoria || 'Abarrotes') === categoriaBuscada) : db;
    tbody.innerHTML = '';
    
    filtrados.forEach(i => {
        tbody.innerHTML += `<tr class="align-middle">
            <td class="text-center p-2"><img src="${i.img || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;"></td>
            <td class="p-2">
                <input type="text" id="edit-nombre-${i.id}" class="form-control form-control-sm border-secondary mb-1" value="${i.nombre}">
                <div class="input-group input-group-sm">
                    <span class="input-group-text bg-light text-secondary" style="font-size: 0.7rem;">CAT:</span>
                    <input type="text" id="edit-categoria-${i.id}" class="form-control form-control-sm border-secondary text-uppercase" style="font-size: 0.75rem;" value="${i.categoria || 'Abarrotes'}">
                </div>
            </td>
            <td class="p-2 text-center"><input type="number" step="0.10" id="edit-precio-${i.id}" class="form-control text-center border-secondary fw-bold" value="${parseFloat(i.precio).toFixed(2)}"></td>
            <td class="p-2 text-center"><input type="number" id="edit-stock-${i.id}" class="form-control text-center border-secondary fw-bold" value="${i.stock}"></td>
            <td class="p-2 text-center">
                <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-sm btn-dark fw-bold w-50" onclick="guardarEdicionCompleta('${i.id}')">Guardar</button>
                    <button class="btn btn-sm btn-outline-danger fw-bold w-50" onclick="eliminarProducto('${i.id}')">Eliminar</button>
                </div>
            </td>
        </tr>`;
    });
}

function filtrarTabla() { actualizarIU(document.getElementById('filtroCategoria').value); }

/** Guarda edición de producto (PUT) */
async function guardarEdicionCompleta(id) {
    try {
        const data = { 
            nombre: document.getElementById(`edit-nombre-${id}`).value, 
            precio: parseFloat(document.getElementById(`edit-precio-${id}`).value), 
            stock: parseInt(document.getElementById(`edit-stock-${id}`).value), 
            categoria: document.getElementById(`edit-categoria-${id}`).value.toLowerCase().trim() 
        };
        const { response } = await apiRequest('PUT', `/productos/${id}`, data);
        if (!response.ok) return alert('No se pudo actualizar el producto.');
        alert("¡Producto actualizado con éxito!");
        await cargarProductos(); 
    } catch (error) { alert("No se pudo guardar el cambio."); }
}

async function guardarNuevoProducto() {
    const data = { nombre: document.getElementById('nuevoNombre').value, precio: parseFloat(document.getElementById('nuevoPrecio').value), stock: parseInt(document.getElementById('nuevoStock').value), categoria: document.getElementById('nuevaCategoria').value || 'abarrotes', img: document.getElementById('nuevaImg').value || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100' };
    await apiRequest('POST', '/productos', data);
    window.location.reload();
}

async function eliminarProducto(id) {
    if(confirm("¿Estás seguro de eliminar este artículo?")) { 
        const { response } = await apiRequest('DELETE', `/productos/${id}`);
        if(!response.ok) alert("No se puede eliminar un producto con historial de ventas.");
        cargarProductos(); 
    }
}

// ==========================================
// 2. LÓGICA DE TIENDA VIRTUAL (CLIENTE)
// ==========================================
function renderizarTienda(categoriaBuscada = 'Todas') {
    const grid = document.getElementById('gridProductosTienda');
    const listaCategorias = document.getElementById('listaCategoriasTienda');
    if(!grid) return;

    if(listaCategorias.children.length <= 1) {
        listaCategorias.innerHTML = `<li class="list-group-item"><button type="button" class="btn btn-link text-decoration-none text-dark w-100 text-start fw-bold" onclick="renderizarTienda('Todas')">Mostrar Todos</button></li>`;
        const cats = [...new Set(db.map(item => item.categoria || 'Abarrotes'))];
        cats.forEach(cat => {
            listaCategorias.innerHTML += `<li class="list-group-item"><button type="button" class="btn btn-link text-decoration-none text-dark w-100 text-start text-uppercase" onclick="renderizarTienda('${cat}')">${cat}</button></li>`;
        });
    }

    let filtrados = categoriaBuscada !== 'Todas' ? db.filter(i => (i.categoria || 'Abarrotes') === categoriaBuscada) : db;
    grid.innerHTML = '';

    filtrados.forEach(p => {
        grid.innerHTML += `
            <div class="col-md-4">
                <div class="card h-100 border-0 shadow-sm product-card">
                    <img src="${p.img || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}" class="card-img-top rounded-top" alt="${p.nombre}">
                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-secondary mb-2 align-self-start text-uppercase">${p.categoria || 'Abarrotes'}</span>
                        <h5 class="card-title fw-bold text-dark mb-1">${p.nombre}</h5>
                        <h4 class="text-success fw-bold mt-auto mb-3">S/ ${parseFloat(p.precio).toFixed(2)}</h4>
                        <button type="button" class="btn btn-dark w-100 fw-bold btn-moderno" onclick="agregarAlCarritoTienda(${p.id})">Agregar al Pedido</button>
                    </div>
                </div>
            </div>
        `;
    });
}

function agregarAlCarritoTienda(idProducto) {
    const producto = db.find(p => parseInt(p.id) === parseInt(idProducto));
    if (!producto) return;
    if (producto.stock <= 0) return alert("Producto agotado.");

    const existe = carrito.find(item => parseInt(item.producto_id) === parseInt(producto.id));
    if (existe) {
        if ((existe.cantidad + 1) > producto.stock) return alert("No hay más stock disponible de este producto.");
        existe.cantidad += 1;
        existe.subtotal = existe.cantidad * existe.precio_unitario;
    } else {
        carrito.push({
            producto_id: producto.id,
            nombre: producto.nombre,
            cantidad: 1,
            precio_unitario: parseFloat(producto.precio),
            descuento_aplicado: 0,
            subtotal: parseFloat(producto.precio)
        });
    }
    
    actualizarSidebarTienda();
    if(!document.getElementById('cartSidebar').classList.contains('open')) toggleCart(); 
}

function cambiarCantidadTienda(index, delta) {
    const item = carrito[index];
    const prodDB = db.find(p => parseInt(p.id) === parseInt(item.producto_id));
    let nuevaCant = item.cantidad + delta;
    if(nuevaCant <= 0) {
        carrito.splice(index, 1);
    } else {
        if(prodDB && nuevaCant > prodDB.stock) return alert("Stock máximo alcanzado.");
        item.cantidad = nuevaCant;
        item.subtotal = item.cantidad * item.precio_unitario;
    }
    actualizarSidebarTienda();
}

function actualizarSidebarTienda() {
    const cont = document.getElementById('carritoItemsTienda');
    const badge = document.getElementById('cartBadge');
    const totalDiv = document.getElementById('totalCarritoTienda');
    if(!cont) return;

    let totalItems = 0;
    totalGlobalVenta = 0;
    cont.innerHTML = '';

    if (carrito.length === 0) {
        cont.innerHTML = '<p class="text-center text-muted mt-5">Tu carrito está vacío.</p>';
    } else {
        carrito.forEach((item, idx) => {
            totalItems += item.cantidad;
            totalGlobalVenta += item.subtotal;
            cont.innerHTML += `
                <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                    <div>
                        <h6 class="fw-bold mb-1">${item.nombre}</h6>
                        <small class="text-success fw-bold">S/ ${item.precio_unitario.toFixed(2)}</small>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2 fw-bold" onclick="cambiarCantidadTienda(${idx}, -1)">-</button>
                        <span class="fw-bold px-1">${item.cantidad}</span>
                        <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2 fw-bold" onclick="cambiarCantidadTienda(${idx}, 1)">+</button>
                    </div>
                </div>
            `;
        });
    }
    badge.innerText = totalItems;
    totalDiv.innerText = `S/ ${totalGlobalVenta.toFixed(2)}`;
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

// ==========================================
// 3. CAJA POS (Cajero)
// ==========================================
function mostrarSugerencias() {
    const txt = document.getElementById('nombreInput').value.toLowerCase().trim();
    const caja = document.getElementById('cajaSugerencias');
    if (!caja) return;
    caja.innerHTML = ''; 
    if (txt === "") { caja.style.display = 'none'; limpiarPanelDerecho(); return; }

    const coincidencias = db.filter(i => i.nombre.toLowerCase().includes(txt));
    if (coincidencias.length > 0) {
        caja.style.display = 'block'; 
        coincidencias.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'list-group-item list-group-item-action fw-bold border-bottom text-start';
            btn.innerHTML = `${item.nombre} <span class="badge bg-dark float-end">Stock: ${item.stock}</span>`;
            
            btn.onmousedown = (e) => { 
                e.preventDefault(); 
                document.getElementById('nombreInput').value = item.nombre; 
                caja.style.display = 'none'; 
                actualizarPanelDerecho(item); 
            };
            caja.appendChild(btn);
        });
        actualizarPanelDerecho(coincidencias[0]);
    } else { caja.style.display = 'none'; limpiarPanelDerecho(); }
}

function actualizarPanelDerecho(item) {
    itemSeleccionadoCaja = item;
    if(document.getElementById('sV')) document.getElementById('sV').innerText = item.stock;
    if(document.getElementById('imgV')) document.getElementById('imgV').src = item.img || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300';
}

function limpiarPanelDerecho() {
    itemSeleccionadoCaja = null;
    if(document.getElementById('sV')) document.getElementById('sV').innerText = "0";
    if(document.getElementById('imgV')) document.getElementById('imgV').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3Ctext x='50%25' y='40%25' font-size='24' font-family='Arial' text-anchor='middle' fill='%23999' dominant-baseline='middle'%3ESeleccione un Producto%3C/text%3E%3C/svg%3E";
}

function agregarAlCarrito() {
    if (!itemSeleccionadoCaja) return alert("Seleccione un artículo válido.");
    const cant = parseInt(document.getElementById('cantInput').value || 1);
    const desc = parseFloat(document.getElementById('descInput') ? document.getElementById('descInput').value : 0);

    if (cant <= 0) return alert("La cantidad debe ser mayor a cero.");
    if (itemSeleccionadoCaja.stock < cant) return alert(`Stock insuficiente. Disponible: ${itemSeleccionadoCaja.stock}`);

    const precioConDescuento = itemSeleccionadoCaja.precio * (1 - (desc / 100));
    const existe = carrito.find(item => item.producto_id === itemSeleccionadoCaja.id);
    
    if (existe) {
        if ((existe.cantidad + cant) > itemSeleccionadoCaja.stock) return alert("Supera el stock físico.");
        existe.cantidad += cant;
        existe.subtotal = existe.cantidad * existe.precio_unitario;
    } else {
        carrito.push({
            producto_id: itemSeleccionadoCaja.id,
            nombre: itemSeleccionadoCaja.nombre,
            cantidad: cant,
            precio_unitario: parseFloat(precioConDescuento),
            descuento_aplicado: desc,
            subtotal: cant * parseFloat(precioConDescuento)
        });
    }

    document.getElementById('nombreInput').value = '';
    document.getElementById('cantInput').value = '1';
    document.getElementById('descInput').value = '0';
    limpiarPanelDerecho();
    actualizarTablaInterfazCaja();
}

function actualizarTablaInterfazCaja() {
    const tbody = document.getElementById('cuerpo-carrito');
    if (!tbody) return;

    if (carrito.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4 fw-normal">Ningún artículo agregado a la lista.</td></tr>`;
        if(document.getElementById('pV')) document.getElementById('pV').innerText = "S/ 0.00";
        return;
    }

    tbody.innerHTML = carrito.map((item, index) => `
        <tr class="text-end">
            <td class="text-start ps-3 text-dark">${item.nombre}</td>
            <td class="text-center">${item.cantidad}</td>
            <td>S/ ${item.precio_unitario.toFixed(2)}</td>
            <td class="text-danger">${item.descuento_aplicado}%</td>
            <td class="text-success fw-bold">S/ ${item.subtotal.toFixed(2)}</td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2" style="border-radius:0;" onclick="removerDelCarrito(${index})">Eliminar</button>
            </td>
        </tr>
    `).join('');

    totalGlobalVenta = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    if(document.getElementById('pV')) document.getElementById('pV').innerText = `S/ ${totalGlobalVenta.toFixed(2)}`;
}

function removerDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarTablaInterfazCaja();
}

// ==========================================
// 4. FLUJO DE PAGO Y GENERACIÓN DE VOUCHERS
// ==========================================
function abrirModalNativo(idModal) {
    const modalesAbiertos = document.querySelectorAll('.modal.show');
    modalesAbiertos.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) modalInstance.hide();
    });
    setTimeout(() => {
        const nuevoModal = new bootstrap.Modal(document.getElementById(idModal));
        nuevoModal.show();
    }, 400); 
}

function iniciarPagoTienda() {
    if(carrito.length === 0) return alert("Tu pedido está vacío.");
    toggleCart(); 
    document.getElementById('totalPagoModal').innerText = `S/ ${totalGlobalVenta.toFixed(2)}`;
    abrirModalNativo('modalPago');
}

function iniciarProcesoCobro() {
    if (carrito.length === 0) return alert("La lista de venta está vacía.");
    document.getElementById('totalPagoModal').innerText = `S/ ${totalGlobalVenta.toFixed(2)}`;
    abrirModalNativo('modalPago');
}

function seleccionarMetodo(metodo) {
    metodoPagoSeleccionado = metodo;
    abrirModalNativo('modalProcesando');
    
    const texto = document.getElementById('textoProcesando');
    texto.innerText = "Procesando pago...";

    setTimeout(() => { texto.innerText = "Conectando con entidad financiera..."; }, 1500);
    setTimeout(() => { texto.innerText = "Confirmando transacción..."; }, 3000);
    setTimeout(() => {
        texto.innerText = "Generando comprobante...";
        setTimeout(() => { abrirModalNativo('modalComprobante'); }, 1000);
    }, 4500); 
}

function toggleDatosCliente() {
    const tipo = document.getElementById('tipoComprobante').value;
    const box = document.getElementById('datosClienteBox');
    if (tipo === 'boleta_dni') {
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
        document.getElementById('clienteDNI').value = '';
        document.getElementById('clienteNombre').value = '';
    }
}

async function generarComprobanteFinal() {
    const tipoComprobante = document.getElementById('tipoComprobante').value;
    const dni = document.getElementById('clienteDNI').value;
    const nombre = document.getElementById('clienteNombre').value;

    if (tipoComprobante === 'boleta_dni' && (!dni || !nombre)) {
        return alert("Ingrese el DNI y Nombre del cliente para emitir la boleta.");
    }

    const usuarioId = localStorage.getItem('usuarioId') || 1;
    const nombreUsuarioLogueado = localStorage.getItem('nombreUsuario') || 'Cliente';
    const codigoGenerado = "TK-" + Math.floor(Math.random() * 1000000);
    const subtotal = totalGlobalVenta / 1.18;
    const igv = totalGlobalVenta - subtotal;
    const fecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

    let htmlTicket = `
        <div class="text-center mb-3">
            <h4 class="fw-bold m-0">BODEGA PRO S.A.C.</h4>
            <small>Av. Perú 1234, S.M.P - Lima</small><br>
            <small>RUC: 20123456789</small>
        </div>
        <div class="border-top border-bottom border-dark border-dashed py-2 mb-3 text-center">
            <h6 class="fw-bold m-0 text-uppercase">${tipoComprobante.replace('_', ' ')}</h6>
            <small>Nro: ${codigoGenerado}</small>
        </div>
        <div class="small mb-3">
            <div><strong>Fecha:</strong> ${fecha}</div>
            <div><strong>Usuario:</strong> ${nombreUsuarioLogueado}</div>
            ${tipoComprobante === 'boleta_dni' ? `<div><strong>Cliente:</strong> ${nombre}</div><div><strong>DNI:</strong> ${dni}</div>` : ''}
        </div>
        <table class="w-100 small mb-3">
            <thead>
                <tr class="border-bottom border-dark">
                    <th class="text-start pb-1">CANT</th>
                    <th class="text-start pb-1">DESCRIPCIÓN</th>
                    <th class="text-end pb-1">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${carrito.map(item => `
                    <tr>
                        <td class="text-start align-top pt-2">${item.cantidad}</td>
                        <td class="text-start pt-2">${item.nombre}</td>
                        <td class="text-end align-top pt-2">S/ ${item.subtotal.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="border-top border-dark border-dashed pt-2 mb-3">
            <div class="d-flex justify-content-between small"><span>OP. GRAVADA:</span><span>S/ ${subtotal.toFixed(2)}</span></div>
            <div class="d-flex justify-content-between small"><span>I.G.V. (18%):</span><span>S/ ${igv.toFixed(2)}</span></div>
            <div class="d-flex justify-content-between fw-bold mt-2 fs-5"><span>TOTAL:</span><span>S/ ${totalGlobalVenta.toFixed(2)}</span></div>
        </div>
        <div class="text-center small">
            <div><strong>MEDIO DE PAGO:</strong> ${metodoPagoSeleccionado.toUpperCase()}</div>
            <div class="mt-3">¡Gracias por su compra en Bodega PRO!</div>
            <div class="mt-2 barcode-placeholder">||| ||||| |||| || |||</div>
        </div>
    `;

    document.getElementById('ticketImprimible').innerHTML = htmlTicket;

    const payload = {
        total: totalGlobalVenta,
        usuario_id: parseInt(usuarioId),
        metodo_pago: metodoPagoSeleccionado.toLowerCase().replace(' ', '_'),
        tipo_comprobante: tipoComprobante,
        estado_pago: 'completado',
        productos: carrito.map(item => ({ producto_id: item.producto_id, cantidad: item.cantidad, precio: item.precio_unitario }))
    };

    try {
        await postJSON('/pagos/procesar', payload);
    } catch (e) { console.warn("Modo demo local activo."); }

    abrirModalNativo('modalTicketFinal');
}

function finalizarCompraOnline() {
    carrito = [];
    actualizarSidebarTienda();
    cargarProductos(); 
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalTicketFinal'));
    if (modalInstance) modalInstance.hide();
}

function finalizarVentaYLimpiar() {
    carrito = [];
    actualizarTablaInterfazCaja();
    cargarProductos(); 
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalTicketFinal'));
    if (modalInstance) modalInstance.hide();
}

// ==========================================
// 5. HISTORIAL DE COMPRAS
// ==========================================
async function abrirHistorial() {
    const tbody = document.getElementById('cuerpoHistorial');
    const usuarioId = localStorage.getItem('usuarioId');
    if(!usuarioId) return alert("Debes iniciar sesión.");

    abrirModalNativo('modalHistorial');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Cargando...</td></tr>';

    try {
        const { response, data: ventas } = await apiRequest('GET', '/ventas');

        const misVentas = (ventas || []).filter(v => parseInt(v.operador) === parseInt(usuarioId) || v.operador === localStorage.getItem('nombreUsuario'));
        
        if(misVentas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Aún no tienes compras registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = misVentas.map(v => `
            <tr>
                <td>${v.fecha_formato || 'Reciente'}</td>
                <td><span class="badge bg-dark">${v.codigo_tx || 'Ticket'}</span></td>
                <td class="text-capitalize">${v.metodo_pago || 'Electrónico'}</td>
                <td><span class="badge bg-success">Completado</span></td>
                <td class="text-end fw-bold text-success">S/ ${parseFloat(v.total).toFixed(2)}</td>
            </tr>
        `).join('');

    } catch(e) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error al cargar el historial.</td></tr>'; }
}

// ==========================================
// 6. AUTENTICACIÓN (LOGIN/REGISTRO MODERNO)
// ==========================================
function abrirModal(idModalDestino) {
    const modalesAbiertos = document.querySelectorAll('.modal.show');
    modalesAbiertos.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) modalInstance.hide();
    });
    setTimeout(() => {
        const nuevoModal = new bootstrap.Modal(document.getElementById(idModalDestino));
        nuevoModal.show();
    }, 400); 
}

function simularLoginFacebook() {
    const btnText = document.getElementById('btn-fb-text');
    btnText.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Conectando...';
    setTimeout(() => {
        btnText.innerHTML = 'Validando permisos...';
        setTimeout(() => {
            alert("Inicio de sesión exitoso con Facebook.");
            window.location.href = 'tienda.html'; 
        }, 2000);
    }, 1500);
}

function simularRecuperacion() {
    const dato = document.getElementById('recDato').value?.trim();
    const btn = document.getElementById('btn-recuperar');
    if(!dato) return alert("Por favor ingresa un correo o celular.");

    if (btn) { btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...'; btn.disabled = true; }

    (async () => {
        try {
            const { response, data } = await postJSON('/autenticacion/recuperar-contrasena', { correo_o_celular: dato });
            if (btn) { btn.innerHTML = 'Enviar Código'; btn.disabled = false; }
            if (response.ok) {
                alert(`Se generó un código de recuperación (simulado): ${data?.codigo_simulado || '----'}`);
                abrirModal('modalLogin');
            } else {
                alert(`Error: ${data?.error || 'No se pudo procesar la solicitud.'}`);
            }
        } catch (e) {
            if (btn) { btn.innerHTML = 'Enviar Código'; btn.disabled = false; }
            alert('Error de conexión con el servidor.');
        }
    })();
}

async function procesarLoginLocal() {
    const isCorreo = document.getElementById('tab-correo').classList.contains('active');
    const valor = isCorreo ? (document.getElementById('logCorreo').value || '').trim() : (document.getElementById('logCelular').value || '').trim();
    const password = document.getElementById('logPass').value || '';

    if (!valor || !password) return alert('Por favor, completa todos los campos.');

    const endpoint = isCorreo ? '/autenticacion/login/correo' : '/autenticacion/login/celular';
    const bodyData = isCorreo ? { correo: valor, contrasena: password } : { celular: valor, contrasena: password };

    try {
        const { response, data } = await postJSON(endpoint, bodyData);

        if (response.ok) {
            // Backend returns 'cliente' object for autenticacion routes
            if (data.cliente) {
                localStorage.setItem('usuarioId', data.cliente.id);
                localStorage.setItem('nombreUsuario', data.cliente.nombre_completo || data.cliente.nombre || 'Cliente');
                localStorage.setItem('rol', 'cliente');
                window.location.href = 'tienda.html';
                return;
            }

            // Fallback: if backend returned usuario (legacy)
            if (data.usuario) {
                localStorage.setItem('usuarioId', data.usuario.id);
                localStorage.setItem('nombreUsuario', data.usuario.nombre || data.usuario.nombre_completo || 'Usuario');
                localStorage.setItem('rol', data.usuario.rol || 'empleado');
                window.location.href = data.usuario.rol === 'cliente' ? 'tienda.html' : 'sistema.html';
                return;
            }

            alert('Inicio de sesión exitoso. Redirigiendo...');
        } else {
            alert(data.error || 'Credenciales inválidas');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
}

async function procesarRegistro() {
    const isCorreo = document.getElementById('tab-reg-correo').classList.contains('active');
    let endpoint = '';
    let bodyData = {};

    if (isCorreo) {
        const nombre = (document.getElementById('regNombreCorreo').value || '').trim();
        const correo = (document.getElementById('regCorreo').value || '').trim();
        const password = document.getElementById('regPassCorreo').value || '';
        if (!nombre || !correo || !password) return alert('Por favor completa tu nombre, correo y contraseña.');
        if (!validarCorreo(correo)) return alert('Por favor ingresa un correo válido.');
        if (!validarPassword(password)) return alert('La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.');
        endpoint = '/autenticacion/registro/correo';
        bodyData = { nombre_completo: nombre, correo, contrasena: password };
    } else {
        const nombre = (document.getElementById('regNombreCelular').value || '').trim();
        const celular = (document.getElementById('regCelular').value || '').trim();
        const password = document.getElementById('regPassCelular').value || '';
        if (!nombre || !celular || !password) return alert('Por favor completa tu nombre, celular y contraseña.');
        if (!validarCelular(celular)) return alert('Por favor ingresa un número de celular válido (9 dígitos).');
        if (!validarPassword(password)) return alert('La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.');
        endpoint = '/autenticacion/registro/celular';
        bodyData = { nombre_completo: nombre, celular, contrasena: password };
    }

    try {
        const { response, data } = await postJSON(endpoint, bodyData);
        if (response.ok) {
            alert("Cuenta creada exitosamente. Ahora puedes iniciar sesión.");
            document.querySelectorAll('#modalRegistro input').forEach(input => input.value = '');
            abrirModal('modalLogin');
        } else {
            alert(`Error al registrar: ${data?.error || 'El usuario ya existe'}`);
        }
    } catch (error) { alert("Error de conexión al intentar registrar."); }
}

// ==========================================
// Helpers: validación de correo/celular/contraseña
// ==========================================
function validarCorreo(valor) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function validarCelular(valor) {
    // Aceptar 9 dígitos (Perú ejemplo)
    return /^\d{9}$/.test(valor);
}

function validarPassword(valor) {
    // Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(valor);
}

// ==========================================
// LOGIN para ERP Empleados (login.html)
// ==========================================
async function login() {
    const username = (document.getElementById('user')?.value || '').trim();
    const password = document.getElementById('pass')?.value || '';
    if (!username || !password) return alert('Por favor ingresa usuario y contraseña.');

    try {
        const { response, data } = await postJSON('/usuarios/login', { username, password });
        if (response.ok && data.usuario) {
            localStorage.setItem('usuarioId', data.usuario.id);
            localStorage.setItem('nombreUsuario', data.usuario.nombre || data.usuario.nombre_completo || data.usuario.username);
            localStorage.setItem('rol', data.usuario.rol || 'empleado');
            window.location.href = 'sistema.html';
        } else {
            alert(data?.error || 'Credenciales inválidas');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión con el servidor.');
    }
}

function cerrarSesion() { localStorage.clear(); window.location.href = 'index.html'; }

// Reportes (Para el panel de admin si se usa)
function verificarAlertas() {
    const cont = document.getElementById('contenedor-alertas');
    if (!cont) return;
    cont.innerHTML = ''; 
    db.filter(i => i.stock <= 10).forEach(p => { cont.innerHTML += `<div class="alert alert-danger border-danger border-2 shadow-sm mb-2"><strong>[ALERTA SISTEMA]</strong> Artículo ${p.nombre} con stock crítico: ${p.stock} unid.</div>`; });
}
const API_URL = 'http://localhost:3000/api';
let db = []; 
let itemSeleccionadoCaja = null;
let carrito = []; // 🛒 NUEVO: Memoria volátil para acumular artículos en caja

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('tabla-datos') || document.getElementById('kpi-productos') || document.getElementById('nombreInput')) cargarProductos();
    if(document.getElementById('tabla-proveedores')) cargarProveedores();
    if(document.getElementById('tabla-facturas')) cargarFacturas();
    if(document.getElementById('tabla-usuarios')) cargarUsuarios();

    const op = document.getElementById('nombre-operador');
    if(op) op.innerText = 'OPERADOR: ' + (localStorage.getItem('nombreUsuario') || 'CAJERO').toUpperCase();
});

// ==========================================
// 1. INVENTARIO
// ==========================================
async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        if (!response.ok) throw new Error('Error de red');
        db = await response.json();
        
        const filtro = document.getElementById('filtroCategoria');
        if (filtro) filtro.innerHTML = '<option value="Todas">Mostrar Todos</option>';
        if (document.getElementById('tabla-datos')) actualizarIU();
        if (document.getElementById('contenedor-alertas')) verificarAlertas();
        if (document.getElementById('kpi-productos')) renderGrafica();
    } catch (error) { console.error('Error:', error); }
}

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

async function guardarEdicionCompleta(id) {
    try {
        const nombreInput = document.getElementById(`edit-nombre-${id}`).value;
        const precioInput = parseFloat(document.getElementById(`edit-precio-${id}`).value);
        const stockInput = parseInt(document.getElementById(`edit-stock-${id}`).value);
        const categoriaInput = document.getElementById(`edit-categoria-${id}`).value.toLowerCase().trim();

        const data = { nombre: nombreInput, precio: precioInput, stock: stockInput, categoria: categoriaInput };
        const response = await fetch(`${API_URL}/productos/${id}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data) 
        });

        if (!response.ok) throw new Error(`Error en el servidor: ${response.status}`);
        alert("¡Producto actualizado con éxito!");
        await cargarProductos(); 
    } catch (error) {
        console.error('Error al guardar la edición:', error);
        alert("No se pudo guardar el cambio.");
    }
}

async function guardarNuevoProducto() {
    const data = { nombre: document.getElementById('nuevoNombre').value, precio: parseFloat(document.getElementById('nuevoPrecio').value), stock: parseInt(document.getElementById('nuevoStock').value), categoria: document.getElementById('nuevaCategoria').value || 'abarrotes', img: document.getElementById('nuevaImg').value || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100' };
    await fetch(`${API_URL}/productos`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    window.location.reload();
}

async function eliminarProducto(id) {
    if(confirm("¿Estás seguro de eliminar este artículo?")) { 
        const res = await fetch(`${API_URL}/productos/${id}`, { method: 'DELETE' }); 
        if(!res.ok) alert("No se puede eliminar un producto con historial de ventas (Llave foránea activa).");
        cargarProductos(); 
    }
}

// ==========================================
// 2. CAJA POS (REFACTORIZADO CON CARRITO)
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
    calcularVistaPrevia();
}

function limpiarPanelDerecho() {
    itemSeleccionadoCaja = null;
    if(document.getElementById('sV')) document.getElementById('sV').innerText = "0";
    if(document.getElementById('imgV')) document.getElementById('imgV').src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300';
}

function calcularVistaPrevia() {
    // La vista previa se calcula de forma informativa al buscar o cambiar cantidades
}

// Agrega productos al array en memoria y refresca la tabla del frontend
function agregarAlCarrito() {
    if (!itemSeleccionadoCaja) return alert("Por favor seleccione un artículo válido usando el buscador.");
    
    const cant = parseInt(document.getElementById('cantInput').value || 1);
    const desc = parseFloat(document.getElementById('descInput') ? document.getElementById('descInput').value : 0);

    if (cant <= 0) return alert("La cantidad debe ser mayor a cero.");
    if (itemSeleccionadoCaja.stock < cant) return alert(`Stock insuficiente en tienda. Disponible: ${itemSeleccionadoCaja.stock}`);

    // Calcular el precio unitario aplicando el descuento directo
    const precioConDescuento = itemSeleccionadoCaja.precio * (1 - (desc / 100));

    // Validar si el artículo ya está cargado en el carrito para actualizarlo
    const existe = carrito.find(item => item.producto_id === itemSeleccionadoCaja.id);
    if (existe) {
        if ((existe.cantidad + cant) > itemSeleccionadoCaja.stock) return alert("La cantidad total acumulada en el carrito supera el stock físico.");
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

    // Limpiar input de búsqueda y visor de item para agilizar la entrada
    document.getElementById('nombreInput').value = '';
    document.getElementById('cantInput').value = '1';
    document.getElementById('descInput').value = '0';
    limpiarPanelDerecho();
    
    actualizarTablaInterfazCaja();
}

// Renderiza los tr en el elemento tbody id="cuerpo-carrito" y acumula totales
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
                <button class="btn btn-sm btn-outline-danger py-0 px-2" style="border-radius:0;" onclick="removerDelCarrito(${index})">✕</button>
            </td>
        </tr>
    `).join('');

    const totalAcumulado = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    if(document.getElementById('pV')) document.getElementById('pV').innerText = `S/ ${totalAcumulado.toFixed(2)}`;
}

function removerDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarTablaInterfazCaja();
}

async function procesarCobroFinal() {
    if (carrito.length === 0) return alert("La lista de venta está vacía. Añada productos primero.");

    const usuarioId = localStorage.getItem('usuarioId') || 1;
    const totalFinal = carrito.reduce((sum, item) => sum + item.subtotal, 0);

    // Formateamos el payload respetando estrictamente las llaves que lee el controlador
    const payload = {
        total: totalFinal,
        usuario_id: parseInt(usuarioId),
        productos: carrito.map(item => ({
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio: item.precio_unitario
        }))
    };

    console.log("Despachando payload sincronizado:", payload);

    try {
        const respuesta = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (respuesta.ok) {
            const data = await respuesta.json();
            alert(`¡Transacción procesada con éxito!\nCódigo de Ticket: ${data.codigo_tx}`);
            carrito = [];
            actualizarTablaInterfazCaja();
            await cargarProductos(); // Recarga stock local dinámicamente
        } else {
            const err = await respuesta.json();
            // Muestra el mensaje de error real devuelto por la transacción (ej. Stock insuficiente)
            alert(`Error en el POS: ${err.error || 'Campos inválidos'}`);
        }
    } catch (e) {
        alert("Error de conexión al procesar la venta.");
    }
}

// ==========================================
// 3. PROVEEDORES Y FACTURACIÓN
// ==========================================
async function cargarProveedores() {
    const tbodyProv = document.getElementById('tabla-proveedores');
    if (!tbodyProv) return;
    const response = await fetch(`${API_URL}/proveedores`);
    const provs = await response.json();
    tbodyProv.innerHTML = '';
    provs.forEach(p => {
        tbodyProv.innerHTML += `<tr class="text-center align-middle">
            <td class="fw-bold">${p.ruc}</td><td class="text-start fw-bold text-dark">${p.empresa}</td>
            <td>${p.representante}</td><td>${p.telefono}</td>
            <td><button class="btn btn-sm btn-outline-danger" onclick="eliminarProveedor(${p.id})">Eliminar</button></td>
        </tr>`;
    });
}
async function guardarNuevoProveedor() {
    const data = { ruc: document.getElementById('provRuc').value, empresa: document.getElementById('provEmpresa').value, representante: document.getElementById('provRep').value, telefono: document.getElementById('provTel').value };
    if (!data.ruc || !data.empresa) return alert("RUC y Razón Social requeridos.");
    await fetch(`${API_URL}/proveedores`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    window.location.reload();
}
async function eliminarProveedor(id) { if(confirm("¿Seguro que deseas eliminar este proveedor?")) { await fetch(`${API_URL}/proveedores/${id}`, { method: 'DELETE' }); cargarProveedores(); } }

async function cargarFacturas() {
    const tbody = document.getElementById('tabla-facturas');
    if (!tbody) return;
    const response = await fetch(`${API_URL}/ventas`);
    const ventas = await response.json();
    tbody.innerHTML = '';
    ventas.forEach(v => {
        tbody.innerHTML += `<tr class="text-center align-middle">
            <td class="fw-bold text-primary">${v.codigo_tx}</td><td>${v.fecha_formato}</td><td class="text-uppercase">${v.operador}</td>
            <td class="fw-bold text-success">S/ ${parseFloat(v.total).toFixed(2)}</td>
            <td><button class="btn btn-sm btn-outline-dark me-2" onclick="verDetalle(${v.id}, '${v.codigo_tx}')">Ver Detalle</button><button class="btn btn-sm btn-danger" onclick="eliminarFactura(${v.id})">Anular</button></td>
        </tr>`;
    });
}
async function verDetalle(id, codigo) {
    const response = await fetch(`${API_URL}/ventas/${id}/detalle`);
    const detalles = await response.json();
    let html = `<h5 class="fw-bold mb-3 border-bottom pb-2">Ticket: ${codigo}</h5><ul class="list-group">`;
    detalles.forEach(d => { html += `<li class="list-group-item d-flex justify-content-between align-items-center">${d.cantidad}x ${d.producto} <span class="fw-bold text-success">S/ ${parseFloat(d.subtotal).toFixed(2)}</span></li>`; });
    document.getElementById('modalDetalleCuerpo').innerHTML = html + `</ul>`;
    new bootstrap.Modal(document.getElementById('modalTicket')).show();
}
async function eliminarFactura(id) { if(confirm("¿Estás seguro de anular esta transacción?")) { await fetch(`${API_URL}/ventas/${id}`, { method: 'DELETE' }); cargarFacturas(); } }

// ==========================================
// 4. GRÁFICAS DE REPORTES
// ==========================================
function verificarAlertas() {
    const cont = document.getElementById('contenedor-alertas');
    if (!cont) return;
    cont.innerHTML = ''; 
    db.filter(i => i.stock <= 10).forEach(p => { cont.innerHTML += `<div class="alert alert-danger border-danger border-2 shadow-sm mb-2"><strong>[ALERTA SISTEMA]</strong> Artículo ${p.nombre} con stock crítico: ${p.stock} unid.</div>`; });
}

function mostrarErrorGrafica(ctx, mensaje) {
    if (Chart.getChart("graficaBarras")) Chart.getChart("graficaBarras").destroy();
    new Chart(ctx, { type: 'bar', data: { labels: [mensaje], datasets: [{ label: 'Estado del Servidor', data: [1], backgroundColor: '#dc3545' }] }, options: { plugins: { tooltip: { enabled: false } }, scales: { y: { display: false } } } });
}

async function renderGrafica() {
    const kpiProd = document.getElementById('kpi-productos');
    const kpiCritico = document.getElementById('kpi-critico');
    if (kpiProd) kpiProd.innerText = db.length;
    if (kpiCritico) kpiCritico.innerText = db.filter(i => i.stock <= 10).length;

    const ctxTorta = document.getElementById('graficaTorta');
    if (ctxTorta) {
        if (Chart.getChart("graficaTorta")) Chart.getChart("graficaTorta").destroy();
        const conteoCategorias = {};
        db.forEach(i => { const cat = (i.categoria || 'Abarrotes').toUpperCase(); conteoCategorias[cat] = (conteoCategorias[cat] || 0) + 1; });
        new Chart(ctxTorta, { type: 'doughnut', data: { labels: Object.keys(conteoCategorias), datasets: [{ data: Object.values(conteoCategorias), backgroundColor: ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#6c757d'], borderWidth: 0 }] }, options: { cutout: '70%' } });
    }

    const kpiVentasS = document.getElementById('kpi-ventas-dinero');
    const kpiVentasTx = document.getElementById('kpi-ventas-tx');
    const ctxBarras = document.getElementById('graficaBarras');
    
    if (kpiVentasS) {
        try {
            const resVentas = await fetch(`${API_URL}/ventas`);
            const ventas = await resVentas.json();
            if (kpiVentasTx) kpiVentasTx.innerText = ventas.length;
            if (kpiVentasS) kpiVentasS.innerText = `S/ ${ventas.reduce((suma, v) => suma + (parseFloat(v.total) || 0), 0).toFixed(2)}`;
        } catch(e) {}
    }

    if (ctxBarras) {
        try {
            const resTop = await fetch(`${API_URL}/ventas/reportes/top`);
            if (resTop.ok) {
                const topProductos = await resTop.json();
                if (Chart.getChart("graficaBarras")) Chart.getChart("graficaBarras").destroy();
                new Chart(ctxBarras, {
                    type: 'bar',
                    data: { labels: topProductos.length > 0 ? topProductos.map(p => p.producto) : ['Esperando ventas...'], datasets: [{ label: 'Ingresos generados (S/)', data: topProductos.length > 0 ? topProductos.map(p => parseFloat(p.total_recaudado) || 0) : [0], backgroundColor: '#212529', borderRadius: 4 }] },
                    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
                });
            } else { mostrarErrorGrafica(ctxBarras, '⚠️ RUTA NO ENCONTRADA'); }
        } catch (error) { mostrarErrorGrafica(ctxBarras, '⚠️ ERROR DE CONEXIÓN'); }
    }
}

// ==========================================
// 5. MÓDULO DE USUARIOS Y AUTENTICACIÓN DINÁMICA
// ==========================================
async function login() {
    const userField = document.getElementById('user');
    const passField = document.getElementById('pass');
    if(!userField || !passField) return;

    const username = userField.value.trim().toLowerCase();
    const password = passField.value.trim();

    if(!username || !password) return alert("Ingrese usuario y clave.");

    try {
        const response = await fetch(`${API_URL}/usuarios/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();

        if (response.ok && result.success) {
            localStorage.setItem('rol', result.usuario.rol);
            localStorage.setItem('nombreUsuario', result.usuario.nombre);
            localStorage.setItem('usuarioId', result.usuario.id);

            if(result.usuario.rol === 'administrador') {
                window.location.href = 'inventario.html';
            } else {
                window.location.href = 'sistema.html';
            }
        } else {
            alert(`❌ Error: ${result.error || 'Credenciales incorrectas'}`);
        }
    } catch (error) {
        alert("❌ Error crítico: No se pudo conectar con el servidor API REST.");
    }
}

async function cargarUsuarios() {
    const tbodyUsr = document.getElementById('tabla-usuarios');
    if (!tbodyUsr) return;
    const response = await fetch(`${API_URL}/usuarios`);
    const usuarios = await response.json();
    tbodyUsr.innerHTML = '';
    usuarios.forEach(u => {
        let badgeColor = u.rol === 'administrador' ? 'bg-danger' : 'bg-primary';
        tbodyUsr.innerHTML += `<tr class="text-center align-middle">
            <td class="fw-bold">${u.id}</td>
            <td class="text-start fw-bold text-dark">${u.nombre_completo}</td>
            <td>${u.username}</td>
            <td><span class="badge ${badgeColor} text-uppercase rounded-0">${u.rol}</span></td>
            <td><button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${u.id})">Revocar Acceso</button></td>
        </tr>`;
    });
}

async function guardarNuevoUsuario() {
    const data = {
        nombre_completo: document.getElementById('usrNombre').value,
        username: document.getElementById('usrUser').value.toLowerCase().trim(),
        password: document.getElementById('usrPass').value,
        rol: document.getElementById('usrRol').value
    };
    if (!data.nombre_completo || !data.username || !data.password) return alert("Todos los campos son obligatorios.");
    
    const response = await fetch(`${API_URL}/usuarios`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    if(response.ok) {
        window.location.reload();
    } else {
        alert("Error al registrar. Es posible que el 'Username' ya exista.");
    }
}

async function eliminarUsuario(id) {
    if(confirm("¿Estás seguro de eliminar el acceso a este empleado?")) { 
        await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' }); 
        cargarUsuarios(); 
    }
}

function cerrarSesion() {
    localStorage.removeItem('rol');
    localStorage.removeItem('nombreUsuario');
    localStorage.removeItem('usuarioId');
    window.location.href = 'index.html'; 
}
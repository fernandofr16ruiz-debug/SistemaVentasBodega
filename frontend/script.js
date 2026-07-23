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

    const op = document.getElementById('nombre-operador');
    if(op) {
        let nombreCajero = localStorage.getItem('nombreUsuario') || 'CAJERO';
        nombreCajero = nombreCajero.replace(/MAÃ±ANA/ig, 'MAÑANA').replace(/Ã±/g, 'ñ');
        op.innerText = 'OPERADOR: ' + nombreCajero.toUpperCase();
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
        const ventaPayload = {
            total: totalGlobalVenta,
            usuario_id: parseInt(usuarioId),
            productos: carrito.map(item => ({ producto_id: item.producto_id, cantidad: item.cantidad, precio: item.precio_unitario }))
        };
        const { response: ventaResponse, data: ventaData } = await postJSON('/ventas', ventaPayload);
        if (!ventaResponse.ok) {
            throw new Error(ventaData?.error || 'No se pudo registrar la venta en el sistema.');
        }
        if (document.getElementById('tabla-facturas')) cargarFacturas();
        await postJSON('/pagos/procesar', {
            venta_id: ventaData.venta_id,
            cliente_id: null,
            metodo_pago_id: null,
            monto: totalGlobalVenta,
            detalles_adicionales: {
                tipo_comprobante: tipoComprobante,
                cliente_nombre: nombre,
                cliente_dni: dni,
                metodo: metodoPagoSeleccionado
            }
        });
    } catch (e) {
        console.warn('No se pudo completar el registro de pago o venta en backend:', e.message || e);
    }

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
// 4.1 MÓDULO DE PROVEEDORES / FACTURACIÓN / USUARIOS
// ==========================================
async function cargarProveedores() {
    const tbody = document.getElementById('tabla-proveedores');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Cargando proveedores...</td></tr>';

    try {
        const { response, data } = await apiRequest('GET', '/proveedores');
        if (!response.ok) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">No se pudo cargar los proveedores.</td></tr>';
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay proveedores registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(proveedor => `
            <tr>
                <td class="text-center">${proveedor.ruc || '-'}</td>
                <td>${proveedor.empresa || '-'}</td>
                <td>${proveedor.representante || '-'}</td>
                <td>${proveedor.telefono || '-'}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarProveedor(${proveedor.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargarProveedores:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar los proveedores.</td></tr>';
    }
}

async function guardarNuevoProveedor() {
    const ruc = document.getElementById('provRuc')?.value.trim();
    const empresa = document.getElementById('provEmpresa')?.value.trim();
    const representante = document.getElementById('provRep')?.value.trim();
    const telefono = document.getElementById('provTel')?.value.trim();

    if (!ruc || !empresa) {
        return alert('RUC y Empresa son obligatorios.');
    }

    try {
        const { response, data } = await postJSON('/proveedores', { ruc, empresa, representante, telefono, estado: 'Activo' });
        if (!response.ok) {
            return alert(data?.error || 'No se pudo registrar el proveedor.');
        }

        alert('Proveedor registrado correctamente.');
        document.getElementById('provRuc').value = '';
        document.getElementById('provEmpresa').value = '';
        document.getElementById('provRep').value = '';
        document.getElementById('provTel').value = '';
        cargarProveedores();
    } catch (error) {
        console.error('Error guardarNuevoProveedor:', error);
        alert('Error de conexión al registrar proveedor.');
    }
}

async function eliminarProveedor(id) {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
        const { response, data } = await apiRequest('DELETE', `/proveedores/${id}`);
        if (!response.ok) {
            return alert(data?.error || 'No se pudo eliminar el proveedor.');
        }
        alert('Proveedor eliminado correctamente.');
        cargarProveedores();
    } catch (error) {
        console.error('Error eliminarProveedor:', error);
        alert('Error de conexión al eliminar proveedor.');
    }
}

async function cargarFacturas() {
    const tbody = document.getElementById('tabla-facturas');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Cargando facturas...</td></tr>';

    try {
        const { response, data } = await apiRequest('GET', '/ventas');
        if (!response.ok) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">No se pudo cargar las facturas.</td></tr>';
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay facturas registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(venta => `
            <tr>
                <td>${venta.codigo_tx || '-'}</td>
                <td>${venta.fecha_formato || '-'}</td>
                <td>${venta.operador || '-'}</td>
                <td class="text-end">S/ ${parseFloat(venta.total || 0).toFixed(2)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="verDetalleVenta(${venta.id})">Ver detalle</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargarFacturas:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar las facturas.</td></tr>';
    }
}

async function verDetalleVenta(id) {
    const modalBody = document.getElementById('modalDetalleCuerpo');
    if (!modalBody) return;

    modalBody.innerHTML = '<div class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Cargando detalle...</div>';
    abrirModalNativo('modalTicket');

    try {
        const { response, data } = await apiRequest('GET', `/ventas/${id}/detalle`);
        if (!response.ok) {
            modalBody.innerHTML = '<div class="text-danger text-center py-4">No se pudo cargar el detalle de la venta.</div>';
            return;
        }

        if (!data || data.length === 0) {
            modalBody.innerHTML = '<div class="text-muted text-center py-4">Esta venta no tiene detalles registrados.</div>';
            return;
        }

        modalBody.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-bordered mb-0">
                    <thead class="table-dark text-center">
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(fila => `
                            <tr>
                                <td>${fila.producto}</td>
                                <td class="text-center">${fila.cantidad}</td>
                                <td class="text-end">S/ ${parseFloat(fila.precio_unitario || 0).toFixed(2)}</td>
                                <td class="text-end">S/ ${parseFloat(fila.subtotal || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error verDetalleVenta:', error);
        modalBody.innerHTML = '<div class="text-danger text-center py-4">Error al cargar el detalle de la venta.</div>';
    }
}

async function cargarUsuarios() {
    const tbody = document.getElementById('tabla-usuarios');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Cargando usuarios...</td></tr>';

    try {
        const { response, data } = await apiRequest('GET', '/usuarios');
        if (!response.ok) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">No se pudo cargar los usuarios.</td></tr>';
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay usuarios registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(usuario => `
            <tr>
                <td class="text-center">${usuario.id}</td>
                <td>${usuario.nombre_completo || usuario.nombre || '-'}</td>
                <td>${usuario.username || '-'}</td>
                <td class="text-capitalize">${usuario.rol || '-'}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargarUsuarios:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar los usuarios.</td></tr>';
    }
}

async function guardarNuevoUsuario() {
    const nombre = document.getElementById('usrNombre')?.value.trim();
    const username = document.getElementById('usrUser')?.value.trim();
    const password = document.getElementById('usrPass')?.value.trim();
    const rol = document.getElementById('usrRol')?.value || 'cajero';

    if (!nombre || !username || !password) {
        return alert('Completa todos los campos para crear un usuario.');
    }

    try {
        const { response, data } = await postJSON('/usuarios', { nombre_completo: nombre, username, password, rol });
        if (!response.ok) {
            return alert(data?.error || 'No se pudo crear el usuario.');
        }

        alert('Usuario creado correctamente.');
        document.getElementById('usrNombre').value = '';
        document.getElementById('usrUser').value = '';
        document.getElementById('usrPass').value = '';
        document.getElementById('usrRol').value = 'cajero';
        cargarUsuarios();
    } catch (error) {
        console.error('Error guardarNuevoUsuario:', error);
        alert('Error de conexión al crear el usuario.');
    }
}

async function eliminarUsuario(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
        const { response, data } = await apiRequest('DELETE', `/usuarios/${id}`);
        if (!response.ok) {
            return alert(data?.error || 'No se pudo eliminar el usuario.');
        }
        alert('Usuario eliminado correctamente.');
        cargarUsuarios();
    } catch (error) {
        console.error('Error eliminarUsuario:', error);
        alert('Error de conexión al eliminar usuario.');
    }
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

// Removed client-side social login helper (ERP-only)

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

// Client login handlers removed — employees should use /login.html which calls `login()`.

// Client registration removed for ERP-only deployment.

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
            const rolUsuario = (data.usuario.rol || 'empleado').toLowerCase();
            localStorage.setItem('usuarioId', data.usuario.id);
            localStorage.setItem('nombreUsuario', data.usuario.nombre || data.usuario.nombre_completo || data.usuario.username);
            localStorage.setItem('rol', rolUsuario);

            if (rolUsuario === 'administrador') {
                window.location.href = 'inventario.html';
            } else {
                window.location.href = 'sistema.html';
            }
            return;
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

// Renderiza KPIs y gráficas del módulo Reportes (Dashboard)
async function renderGrafica() {
    try {
        // KPIs básicos desde productos cargados
        const kpiProductos = document.getElementById('kpi-productos');
        const kpiCritico = document.getElementById('kpi-critico');
        const kpiTx = document.getElementById('kpi-ventas-tx');
        const kpiDinero = document.getElementById('kpi-ventas-dinero');

        if (kpiProductos) kpiProductos.innerText = (db || []).length;
        if (kpiCritico) kpiCritico.innerText = (db || []).filter(p => p.stock <= 10).length;

        // Ventas: contar tickets y sumar totales
        try {
            const { response, data } = await apiRequest('GET', '/ventas');
            if (response.ok && Array.isArray(data)) {
                const totalTickets = data.length;
                const totalIngresos = data.reduce((s, v) => s + (parseFloat(v.total) || 0), 0);
                if (kpiTx) kpiTx.innerText = totalTickets;
                if (kpiDinero) kpiDinero.innerText = `S/ ${totalIngresos.toFixed(2)}`;
            }
        } catch (e) { console.error('Error cargando ventas para KPIs:', e); }

        // Gráfica de barras: Top productos (desde endpoint de ventas)
        try {
            const { response, data } = await apiRequest('GET', '/ventas/reportes/top');
            if (response.ok && Array.isArray(data)) {
                const labels = data.map(r => r.producto);
                const valores = data.map(r => parseFloat(r.total_recaudado) || 0);

                // destruir gráfico previo si existe
                if (window._chartBar) { window._chartBar.destroy(); window._chartBar = null; }
                const ctx = document.getElementById('graficaBarras');
                if (ctx) {
                    window._chartBar = new Chart(ctx, {
                        type: 'bar',
                        data: { labels, datasets: [{ label: 'Ingresos S/', data: valores, backgroundColor: '#0d6efd' }] },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
            }
        } catch (e) { console.error('Error cargando top productos:', e); }

        // Gráfica de torta: distribución por categoría/familia (desde db cargada)
        try {
            const cats = {};
            (db || []).forEach(p => { const c = (p.categoria || 'Sin categoría').toString(); cats[c] = (cats[c] || 0) + 1; });
            const labels = Object.keys(cats);
            const valores = labels.map(l => cats[l]);

            if (window._chartPie) { window._chartPie.destroy(); window._chartPie = null; }
            const ctxPie = document.getElementById('graficaTorta');
            if (ctxPie) {
                const colors = labels.map((_, i) => `hsl(${(i * 45) % 360} 70% 50%)`);
                window._chartPie = new Chart(ctxPie, {
                    type: 'pie',
                    data: { labels, datasets: [{ data: valores, backgroundColor: colors }] },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        } catch (e) { console.error('Error calculando distribución de familias:', e); }

    } catch (error) {
        console.error('Error en renderGrafica:', error);
    }
}
// Obtener elementos del DOM
const busquedaInput = document.getElementById('busqueda');
const filtroUbicacion = document.getElementById('filtroUbicacion');
const filtroModalidad = document.getElementById('filtroModalidad');
const filtroContrato = document.getElementById('filtroContrato');
const filtroSalarioMin = document.getElementById('filtroSalarioMin');
const listaOfertas = document.getElementById('listaOfertas');
const noResults = document.getElementById('noResults');
const resultadosCount = document.getElementById('resultadosCount');

// Variables globales
let todasLasOfertas = [];
let ofertasFiltradas = [];

// Cargar ofertas al iniciar la pÃ¡gina
window.addEventListener('DOMContentLoaded', async function() {
    await cargarOfertas();
});

// FunciÃ³n para cargar y mostrar todas las ofertas
async function cargarOfertas() {
    try {
        mostrarCargando(true);

        // Obtener ofertas desde el backend
        const resp = await fetch('/api/ofertas');
        if (resp.ok) {
            const json = await resp.json();
            todasLasOfertas = json.ofertas || [];
        } else {
            console.warn('Error HTTP al cargar ofertas:', resp.status);
            todasLasOfertas = [];
        }

        aplicarFiltros();
        // DEBUG: mostrar en consola cuÃ¡ntas ofertas llegaron
        try { console.log('[buscar-empleo] ofertas cargadas:', todasLasOfertas.length, todasLasOfertas.slice(0,5)); } catch(e) {}

    } catch (error) {
        console.error('Error al cargar ofertas:', error);
        mostrarError('No se pudieron cargar las ofertas. Por favor, recarga la pÃ¡gina.');
    } finally {
        mostrarCargando(false);
    }
}

// FunciÃ³n para mostrar estado de carga
function mostrarCargando(mostrar) {
    if (mostrar) {
        listaOfertas.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--color-text-light);">Cargando ofertas...</p>';
        listaOfertas.style.display = 'block';
    }
}

// FunciÃ³n para mostrar errores
function mostrarError(mensaje) {
    listaOfertas.innerHTML = `
        <div class="no-results">
            <p>${mensaje}</p>
            <button onclick="location.reload()" class="btn btn-primary">Recargar</button>
        </div>
    `;
    listaOfertas.style.display = 'block';
}

// FunciÃ³n para aplicar filtros
function aplicarFiltros() {
    const textoBusqueda = busquedaInput.value.toLowerCase().trim();
    const ubicacion = filtroUbicacion.value.toLowerCase().trim();
    const modalidad = filtroModalidad.value;
    const contrato = filtroContrato.value;
    const salarioMin = parseFloat(filtroSalarioMin.value) || 0;

    ofertasFiltradas = todasLasOfertas.filter(oferta => {
        // Filtro de bÃºsqueda por texto
        const cumpleBusqueda = !textoBusqueda ||
            oferta.titulo.toLowerCase().includes(textoBusqueda) ||
            oferta.empresa.toLowerCase().includes(textoBusqueda) ||
            oferta.descripcion.toLowerCase().includes(textoBusqueda);

        // Filtro de ubicaciÃ³n
        const cumpleUbicacion = !ubicacion ||
            oferta.ubicacion.toLowerCase().includes(ubicacion);

        // Filtro de modalidad
        const cumpleModalidad = !modalidad || oferta.modalidad === modalidad;

        // Filtro de tipo de contrato
        const cumpleContrato = !contrato || oferta.tipoContrato === contrato;

        // Filtro de salario mÃ­nimo
        const cumpleSalario = oferta.salarioMax >= salarioMin;

        return cumpleBusqueda && cumpleUbicacion && cumpleModalidad &&
            cumpleContrato && cumpleSalario;
    });

    mostrarOfertas();
}

// FunciÃ³n para mostrar las ofertas filtradas
function mostrarOfertas() {
    listaOfertas.innerHTML = '';

    if (ofertasFiltradas.length === 0) {
        noResults.style.display = 'block';
        listaOfertas.style.display = 'none';
        resultadosCount.textContent = '0 ofertas encontradas';
        return;
    }

    noResults.style.display = 'none';
    listaOfertas.style.display = 'grid';
    resultadosCount.textContent = `${ofertasFiltradas.length} oferta${ofertasFiltradas.length !== 1 ? 's' : ''} encontrada${ofertasFiltradas.length !== 1 ? 's' : ''}`;

    ofertasFiltradas.forEach(oferta => {
        const card = crearCardOferta(oferta);
        listaOfertas.appendChild(card);
    });
}

// FunciÃ³n para crear una card de oferta
function crearCardOferta(oferta) {
    const card = document.createElement('div');
    card.className = 'oferta-card';

    card.innerHTML = `
        <h3>${oferta.titulo}</h3>
        <div class="oferta-empresa">${oferta.empresa}</div>
        <div class="oferta-info">
            <span class="oferta-tag">${oferta.ubicacion}</span>
            <span class="oferta-tag">${oferta.modalidad}</span>
            <span class="oferta-tag">${oferta.tipoContrato}</span>
        </div>
        <div class="oferta-salario">
            $${formatearNumero(oferta.salarioMin || 0)} - $${formatearNumero(oferta.salarioMax || 0)}
        </div>
        <button class="btn btn-primary view-details" data-offer-id="${oferta.id}">Ver Detalle</button>
    `;

    // Attach click handler to the generated View Detail button
    setTimeout(() => {
        const btn = card.querySelector('.view-details');
        if (btn) {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-offer-id');
                if (id) window.location.href = '/ofertas/' + id;
            });
        }
    }, 0);

    return card;
}

// FunciÃ³n para formatear nÃºmeros con comas
function formatearNumero(numero) {
    return numero.toLocaleString('es-ES');
}

// Event listeners para filtros en tiempo real
busquedaInput.addEventListener('input', aplicarFiltros);
filtroUbicacion.addEventListener('input', aplicarFiltros);
filtroModalidad.addEventListener('change', aplicarFiltros);
filtroContrato.addEventListener('change', aplicarFiltros);
filtroSalarioMin.addEventListener('input', aplicarFiltros);

// Agregar ofertas de ejemplo si no hay ninguna (solo para demostraciÃ³n)
window.addEventListener('DOMContentLoaded', function() {
    if (todasLasOfertas.length === 0) {
        console.log('No hay ofertas. Puedes crear algunas desde la pÃ¡gina "Crear Oferta"');
    }
});

// FunciÃ³n para postularse a un empleo
async function applyToJob(jobId) {
    const userId = sessionStorage.getItem('userId');
    if (!userId) {
        alert('Debes iniciar sesiÃ³n para postularte a una oferta de empleo');
        window.location.href = '/login-app.html';
        return;
    }

    try {
        const response = await fetch(`/api/ofertas/${jobId}/postular`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario_id: parseInt(userId) })
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message || 'Â¡PostulaciÃ³n exitosa!');
            // Opcional: actualizar la UI para mostrar que ya se postulÃ³
        } else {
            const error = await response.json();
            alert(error.detail || 'Error al postularse a la oferta');
        }
    } catch (error) {
        console.error('Error applying to job:', error);
        alert('Error al procesar la postulaciÃ³n. Intenta de nuevo.');
    }
}

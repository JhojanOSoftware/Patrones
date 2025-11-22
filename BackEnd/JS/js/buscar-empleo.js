// Obtener elementos del DOM (con compatibilidad y fallbacks)
const busquedaInput = document.getElementById('busqueda');
const filtroUbicacion = document.getElementById('filtroUbicacion');
const filtroModalidad = document.getElementById('filtroModalidad');
const filtroContrato = document.getElementById('filtroContrato');
const filtroSalarioMin = document.getElementById('filtroSalarioMin');

// Soportar varias convenciones de IDs: legacy `listaOfertas` y nuevo `job-offers-container`
let listaOfertas = document.getElementById('listaOfertas') || document.getElementById('job-offers-container');
if (!listaOfertas) {
    // Crear contenedor si no existe para evitar fallos en renderizado
    listaOfertas = document.createElement('div');
    listaOfertas.id = 'listaOfertas';
    listaOfertas.className = 'ofertas-grid';
    const pageContainer = document.querySelector('.container') || document.body;
    pageContainer.appendChild(listaOfertas);
}

// Elemento para estado "no results" (fallbacks)
const noResults = document.getElementById('noResults') || document.getElementById('no-results') || null;

// Contador de resultados: soportar `resultadosCount` y `results-count`
const resultadosCount = document.getElementById('resultadosCount') || document.getElementById('results-count') || null;

// Variables globales
let todasLasOfertas = [];
let ofertasFiltradas = [];

// Cargar ofertas al iniciar la página
window.addEventListener('DOMContentLoaded', async function() {
    await cargarOfertas();
});

// Función para cargar y mostrar todas las ofertas
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

        // DEBUG: mostrar en consola cuántas ofertas llegaron
        try { console.log('[buscar-empleo] ofertas cargadas:', todasLasOfertas.length, todasLasOfertas.slice(0,5)); } catch(e) {}

        // Renderizar tabla para inspección directa y depuración
        renderOffersTable(todasLasOfertas);

        aplicarFiltros();

    } catch (error) {
        console.error('Error al cargar ofertas:', error);
        mostrarError('No se pudieron cargar las ofertas. Por favor, recarga la página.');
    } finally {
        mostrarCargando(false);
    }
}

// Función para mostrar estado de carga
function mostrarCargando(mostrar) {
    if (mostrar) {
        listaOfertas.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--color-text-light);">Cargando ofertas...</p>';
        listaOfertas.style.display = 'block';
    }
}

// Función para mostrar errores
function mostrarError(mensaje) {
    listaOfertas.innerHTML = `
        <div class="no-results">
            <p>${mensaje}</p>
            <button onclick="location.reload()" class="btn btn-primary">Recargar</button>
        </div>
    `;
    listaOfertas.style.display = 'block';
}

// Función para aplicar filtros
function aplicarFiltros() {
    const textoBusqueda = busquedaInput.value.toLowerCase().trim();
    const ubicacion = filtroUbicacion.value.toLowerCase().trim();
    const modalidad = filtroModalidad.value;
    const contrato = filtroContrato.value;
    const salarioMin = parseFloat(filtroSalarioMin.value) || 0;

    ofertasFiltradas = todasLasOfertas.filter(oferta => {
        // Filtro de búsqueda por texto
        const cumpleBusqueda = !textoBusqueda ||
            oferta.titulo.toLowerCase().includes(textoBusqueda) ||
            oferta.empresa.toLowerCase().includes(textoBusqueda) ||
            oferta.descripcion.toLowerCase().includes(textoBusqueda);

        // Filtro de ubicación
        const cumpleUbicacion = !ubicacion ||
            oferta.ubicacion.toLowerCase().includes(ubicacion);

        // Filtro de modalidad
        const cumpleModalidad = !modalidad || oferta.modalidad === modalidad;

        // Filtro de tipo de contrato
        const cumpleContrato = !contrato || oferta.tipoContrato === contrato;

        // Filtro de salario mínimo
        const cumpleSalario = oferta.salarioMax >= salarioMin;

        return cumpleBusqueda && cumpleUbicacion && cumpleModalidad &&
            cumpleContrato && cumpleSalario;
    });

    mostrarOfertas();
}

// Función para mostrar las ofertas filtradas
function mostrarOfertas() {
    listaOfertas.innerHTML = '';

    const table = document.getElementById('offers-table');
    const tbody = document.getElementById('offers-table-body');

    if (ofertasFiltradas.length === 0) {
        if (noResults) noResults.style.display = 'block';
        listaOfertas.style.display = 'none';
        if (table) table.style.display = 'none';
        if (resultadosCount) resultadosCount.textContent = '0 ofertas encontradas';
        return;
    }

    if (noResults) noResults.style.display = 'none';
    listaOfertas.style.display = 'grid';
    if (resultadosCount) resultadosCount.textContent = `${ofertasFiltradas.length} oferta${ofertasFiltradas.length !== 1 ? 's' : ''} encontrada${ofertasFiltradas.length !== 1 ? 's' : ''}`;

    ofertasFiltradas.forEach(oferta => {
        const card = crearCardOferta(oferta);
        listaOfertas.appendChild(card);
    });

    // Also render the filtered list into the table (for debugging / direct visibility)
    if (table && tbody) {
        tbody.innerHTML = '';
        ofertasFiltradas.forEach(oferta => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:8px; border:1px solid #ddd">${escapeHtml(oferta.titulo || oferta.nombre || '')}</td>
                <td style="padding:8px; border:1px solid #ddd">${escapeHtml((oferta.empresa && oferta.empresa.nombre) || oferta.empresa || '')}</td>
                <td style="padding:8px; border:1px solid #ddd">${escapeHtml(oferta.ubicacion || oferta.ciudad || '')}</td>
                <td style="padding:8px; border:1px solid #ddd">${escapeHtml(oferta.modalidad || '')}</td>
                <td style="padding:8px; border:1px solid #ddd">${escapeHtml(oferta.salarioMax || oferta.salario || '')}</td>
                <td style="padding:8px; border:1px solid #ddd"><button class="btn-apply" data-id="${oferta.id}">Postular</button></td>
            `;
            tbody.appendChild(tr);
        });
        table.style.display = 'table';

        // attach handlers for apply buttons in the table
        tbody.querySelectorAll('.btn-apply').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                try {
                    await applyToJob(id);
                    alert('Postulación enviada para oferta ' + id);
                } catch (err) {
                    console.error('Error postular', err);
                    alert('Error al postular');
                }
            });
        });
    }
}

// Helper: escape HTML to avoid injection in table cells
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Función para crear una card de oferta
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

    return card;
}

// Función para formatear números con comas
function formatearNumero(numero) {
    return numero.toLocaleString('es-ES');
}

// Event listeners para filtros en tiempo real
busquedaInput.addEventListener('input', aplicarFiltros);
filtroUbicacion.addEventListener('input', aplicarFiltros);
filtroModalidad.addEventListener('change', aplicarFiltros);
filtroContrato.addEventListener('change', aplicarFiltros);
filtroSalarioMin.addEventListener('input', aplicarFiltros);

// Agregar ofertas de ejemplo si no hay ninguna (solo para demostración)
window.addEventListener('DOMContentLoaded', function() {
    if (todasLasOfertas.length === 0) {
        console.log('No hay ofertas. Puedes crear algunas desde la página "Crear Oferta"');
    }
});

// Función para postularse a un empleo
async function applyToJob(jobId) {
    const userId = sessionStorage.getItem('userId');
    if (!userId) {
        alert('Debes iniciar sesión para postularte a una oferta de empleo');
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
            alert(result.message || '¡Postulación exitosa!');
            // Opcional: actualizar la UI para mostrar que ya se postuló
        } else {
            const error = await response.json();
            alert(error.detail || 'Error al postularse a la oferta');
        }
    } catch (error) {
        console.error('Error applying to job:', error);
        alert('Error al procesar la postulación. Intenta de nuevo.');
    }
}

// ----------------------
// Minimal emergency loader
// ----------------------
console.log('🚀 INICIANDO CARGA DE OFERTAS (loader alternativo)...');
// If you want to force using the provided sample JSON instead of fetching from the API,
// set FORCE_SAMPLE = true. This helps when the frontend can't reach the backend.
const FORCE_SAMPLE = true;

// Sample data provided by the user (9 ofertas) - used when FORCE_SAMPLE=true
const SAMPLE_DATA = {
    "ofertas": [
        {
            "id": 6,
            "titulo": "Desarrollador Frontend React",
            "empresa": "Tech Solutions SAS",
            "sector": "Tecnología",
            "descripcion": "Buscamos desarrollador frontend con experiencia en React para unirse a nuestro equipo de innovación.",
            "funciones": "Desarrollar interfaces de usuario, colaborar con equipo backend, optimizar performance",
            "requisitos": "Experiencia mínima 1 año en React, conocimientos en JavaScript ES6+",
            "habilidadesRequeridas": [
                "React",
                "JavaScript",
                "CSS",
                "HTML",
                "Git"
            ],
            "ubicacion": "Bogotá",
            "modalidad": "Hibrido",
            "tipoContrato": "Término Indefinido",
            "jornada": "Tiempo Completo",
            "salarioMin": 2800000.0,
            "salarioMax": 3500000.0,
            "fechaPublicacion": "2025-11-20 18:48:40",
            "fechaCierre": null
        },
        {
            "id": 7,
            "titulo": "Programador de software",
            "empresa": "Tech Solutions SAS",
            "sector": "Tecnología",
            "descripcion": "Desarrollo de aplicaciones web y móviles para clientes internacionales",
            "funciones": "Desarrollar features, escribir tests, participar en code reviews",
            "requisitos": "Conocimientos en patrones de diseño, bases de datos, APIs REST",
            "habilidadesRequeridas": [
                "Java",
                "Spring Boot",
                "SQL",
                "AWS"
            ],
            "ubicacion": "Bogotá",
            "modalidad": "Remoto",
            "tipoContrato": "Término Indefinido",
            "jornada": "Tiempo Completo",
            "salarioMin": 2500000.0,
            "salarioMax": 3000000.0,
            "fechaPublicacion": "2025-11-20 18:48:40",
            "fechaCierre": null
        },
        {
            "id": 8,
            "titulo": "Desarrollador FullStack Python",
            "empresa": "Innovación Digital Ltda",
            "sector": "Desarrollo Software",
            "descripcion": "Desarrollo de aplicaciones web completas con Django y React",
            "funciones": "Desarrollo backend con Django, frontend con React, deployment en cloud",
            "requisitos": "Experiencia con Django REST Framework, React, bases de datos relacionales",
            "habilidadesRequeridas": [
                "Python",
                "Django",
                "React",
                "PostgreSQL",
                "Docker"
            ],
            "ubicacion": "Medellín",
            "modalidad": "Presencial",
            "tipoContrato": "Término Fijo",
            "jornada": "Tiempo Completo",
            "salarioMin": 3000000.0,
            "salarioMax": 4000000.0,
            "fechaPublicacion": "2025-11-20 18:48:40",
            "fechaCierre": null
        },
        {
            "id": 9,
            "titulo": "Analista de Datos Junior",
            "empresa": "Desarrollo Web Colombia",
            "sector": "Tecnología",
            "descripcion": "Análisis de datos empresariales y creación de reportes",
            "funciones": "Extraer y analizar datos, crear dashboards, reportes ejecutivos",
            "requisitos": "Conocimientos en SQL, Excel, Python para análisis de datos",
            "habilidadesRequeridas": [
                "SQL",
                "Python",
                "Excel",
                "Power BI",
                "Estadística"
            ],
            "ubicacion": "Cali",
            "modalidad": "Hibrido",
            "tipoContrato": "Término Indefinido",
            "jornada": "Medio Tiempo",
            "salarioMin": 1800000.0,
            "salarioMax": 2200000.0,
            "fechaPublicacion": "2025-11-20 18:48:40",
            "fechaCierre": null
        },
        {
            "id": 5,
            "titulo": "barredor",
            "empresa": "Tech Solutions SAS",
            "sector": "Tecnología",
            "descripcion": "barrer",
            "funciones": "barrer",
            "requisitos": "escoba",
            "habilidadesRequeridas": [],
            "ubicacion": "Bogota, Colombia",
            "modalidad": "Presencial",
            "tipoContrato": "Termino indefinido",
            "jornada": "Tiempo Completo",
            "salarioMin": 1000000.0,
            "salarioMax": 50000000.0,
            "fechaPublicacion": "2025-10-29 01:17:54",
            "fechaCierre": null
        },
        {
            "id": 1,
            "titulo": "Desarrollador Frontend React",
            "empresa": "Tech Solutions SAS",
            "sector": "Tecnología",
            "descripcion": "Buscamos desarrollador frontend con experiencia en React para unirse a nuestro equipo de innovación.",
            "funciones": "Desarrollar interfaces de usuario, colaborar con equipo backend, optimizar performance",
            "requisitos": "Experiencia mínima 1 año en React, conocimientos en JavaScript ES6+",
            "habilidadesRequeridas": [
                "React",
                "JavaScript",
                "CSS",
                "HTML",
                "Git"
            ],
            "ubicacion": "Bogotá",
            "modalidad": "Hibrido",
            "tipoContrato": "Término Indefinido",
            "jornada": "Tiempo Completo",
            "salarioMin": 2800000.0,
            "salarioMax": 3500000.0,
            "fechaPublicacion": "2025-10-27 01:51:21",
            "fechaCierre": null
        },
        {
            "id": 2,
            "titulo": "Programador de software",
            "empresa": "Tech Solutions SAS",
            "sector": "Tecnología",
            "descripcion": "Desarrollo de aplicaciones web y móviles para clientes internacionales",
            "funciones": "Desarrollar features, escribir tests, participar en code reviews",
            "requisitos": "Conocimientos en patrones de diseño, bases de datos, APIs REST",
            "habilidadesRequeridas": [
                "Java",
                "Spring Boot",
                "SQL",
                "AWS"
            ],
            "ubicacion": "Bogotá",
            "modalidad": "Remoto",
            "tipoContrato": "Término Indefinido",
            "jornada": "Tiempo Completo",
            "salarioMin": 2500000.0,
            "salarioMax": 3000000.0,
            "fechaPublicacion": "2025-10-27 01:51:21",
            "fechaCierre": null
        },
        {
            "id": 3,
            "titulo": "Desarrollador FullStack Python",
            "empresa": "Innovación Digital Ltda",
            "sector": "Desarrollo Software",
            "descripcion": "Desarrollo de aplicaciones web completas con Django y React",
            "funciones": "Desarrollo backend con Django, frontend con React, deployment en cloud",
            "requisitos": "Experiencia con Django REST Framework, React, bases de datos relacionales",
            "habilidadesRequeridas": [
                "Python",
                "Django",
                "React",
                "PostgreSQL",
                "Docker"
            ],
            "ubicacion": "Medellín",
            "modalidad": "Presencial",
            "tipoContrato": "Término Fijo",
            "jornada": "Tiempo Completo",
            "salarioMin": 3000000.0,
            "salarioMax": 4000000.0,
            "fechaPublicacion": "2025-10-27 01:51:21",
            "fechaCierre": null
        },
        {
            "id": 4,
            "titulo": "Analista de Datos Junior",
            "empresa": "Desarrollo Web Colombia",
            "sector": "Tecnología",
            "descripcion": "Análisis de datos empresariales y creación de reportes",
            "funciones": "Extraer y analizar datos, crear dashboards, reportes ejecutivos",
            "requisitos": "Conocimientos en SQL, Excel, Python para análisis de datos",
            "habilidadesRequeridas": [
                "SQL",
                "Python",
                "Excel",
                "Power BI",
                "Estadística"
            ],
            "ubicacion": "Cali",
            "modalidad": "Hibrido",
            "tipoContrato": "Término Indefinido",
            "jornada": "Medio Tiempo",
            "salarioMin": 1800000.0,
            "salarioMax": 2200000.0,
            "fechaPublicacion": "2025-10-27 01:51:21",
            "fechaCierre": null
        }
    ],
    "total": 9
};

async function loadAllJobOffers() {
    console.log('1. 📡 Cargando ofertas (FORCE_SAMPLE=' + (FORCE_SAMPLE ? 'true' : 'false') + ')...');
    try {
        let ofertas = [];
        if (FORCE_SAMPLE) {
            ofertas = SAMPLE_DATA.ofertas || [];
            console.log('2. ✅ Usando SAMPLE_DATA con', ofertas.length, 'ofertas');
            if (ofertas.length > 0) console.log('3. 📋 Primera oferta (SAMPLE):', ofertas[0]);
            displayJobOffers(ofertas);
            return;
        }

        // Default: fetch from API
        const response = await fetch('/api/ofertas');
        console.log('2. ✅ Respuesta recibida:', response.status);
        if (!response.ok) {
            throw new Error('Error HTTP: ' + response.status);
        }
        const data = await response.json();
        ofertas = data.ofertas || [];
        console.log('3. 📊 Datos recibidos:', ofertas.length, 'ofertas');
        if (ofertas.length > 0) console.log('4. 📋 Primera oferta:', ofertas[0]);

        // Mostrar en el HTML (contenedor crítico)
        displayJobOffers(ofertas);
    } catch (error) {
        console.error('❌ ERROR CRÍTICO al cargar ofertas:', error);
        showErrorMessage('Error al cargar ofertas: ' + (error.message || error));
    }
}

function displayJobOffers(ofertas) {
    console.log('5. 🎨 Renderizando ofertas en HTML...');
    const container = document.getElementById('job-offers-container');
    const noResultsEl = document.getElementById('no-results-message');
    if (!container) {
        console.error('❌ NO SE ENCUENTRA EL CONTENEDOR job-offers-container');
        return;
    }

    if (!ofertas || ofertas.length === 0) {
        console.log('6. ℹ️ No hay ofertas para mostrar');
        container.innerHTML = '';
        if (noResultsEl) noResultsEl.style.display = 'block';
        return;
    }

    if (noResultsEl) noResultsEl.style.display = 'none';

    container.innerHTML = ofertas.map(oferta => `
        <div class="job-card" data-offer-id="${oferta.id}">
          <div class="job-header">
            <h3 class="job-title">${escapeHtml(oferta.titulo || '')}</h3>
            <p class="company-name">${escapeHtml(oferta.empresa || oferta.empresa_nombre || '')}</p>
          </div>
          <p class="job-description">${escapeHtml(oferta.descripcion || '')}</p>
          <div class="job-details">
            <div class="detail-item"><strong>📍 Ubicación:</strong> ${escapeHtml(oferta.ubicacion || '')}</div>
            <div class="detail-item"><strong>🏢 Modalidad:</strong> ${escapeHtml(oferta.modalidad || oferta.modalidad)}</div>
            <div class="detail-item"><strong>📄 Contrato:</strong> ${escapeHtml(oferta.tipoContrato || oferta.tipo_contrato || '')}</div>
            <div class="detail-item"><strong>💰 Salario:</strong> $${Number(oferta.salarioMin || oferta.salario_min || 0).toLocaleString()} - $${Number(oferta.salarioMax || oferta.salario_max || 0).toLocaleString()}</div>
          </div>
          <div class="job-skills"><strong>🛠️ Habilidades:</strong><div class="skills-tags">${Array.isArray(oferta.habilidadesRequeridas) ? oferta.habilidadesRequeridas.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('') : (oferta.habilidadesRequeridas ? escapeHtml(oferta.habilidadesRequeridas) : '<span>No especificadas</span>')}</div></div>
                    <div class="job-footer">
                        <span class="publish-date">Publicado: ${formatDate(oferta.fechaPublicacion || oferta.fecha_publicacion || oferta.fecha_publicacion)}</span>
                        <button class="view-details-btn" data-offer-id="${oferta.id}">Ver Detalle de la Oferta</button>
                    </div>
        </div>
    `).join('');

    // Attach click handlers to detail buttons to navigate to the detail page
    try {
        const detailButtons = document.querySelectorAll('.view-details, .view-details-btn');
        detailButtons.forEach(btn => {
            // avoid double-binding
            if (btn.__detailAttached) return;
            btn.__detailAttached = true;
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-offer-id') || btn.dataset.offerId || btn.getAttribute('data-id');
                if (id) {
                    window.location.href = '/ofertas/' + id;
                } else {
                    console.warn('Detalle: id no encontrado en el botón', btn);
                }
            });
        });
    } catch (err) {
        console.warn('No se pudieron attach handlers de detalle:', err);
    }

    console.log('8. ✅ OFERTAS MOSTRADAS CORRECTAMENTE EN EL HTML');
}

function formatDate(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('es-ES');
}

function showErrorMessage(message) {
    const container = document.getElementById('job-offers-container');
    if (container) container.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
}

function viewOfferDetails(id) {
    window.location.href = `/ofertas/${id}`;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 PÁGINA CARGADA - Ejecutando loadAllJobOffers()');
    loadAllJobOffers();
});
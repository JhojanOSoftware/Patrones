// URL base de la API
const API_URL = "http://localhost:8000";

// Obtener elementos del DOM
const cursosGrid = document.getElementById('cursosGrid');
const noCursos = document.getElementById('noCursos');
const cursosCount = document.getElementById('cursosCount');

// Cargar cursos al iniciar la página
window.addEventListener('DOMContentLoaded', async function() {
    await cargarCursos();
});

// Función para cargar todos los cursos públicos
async function cargarCursos() {
    try {
        mostrarCargando(true);

        const response = await fetch(`${API_URL}/api/cursos`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        const cursos = data.cursos || [];

        mostrarCargando(false);

        if (cursos.length === 0) {
            mostrarSinCursos();
            return;
        }

        cursosCount.textContent = `${cursos.length} curso${cursos.length !== 1 ? 's' : ''} disponible${cursos.length !== 1 ? 's' : ''}`;
        mostrarCursos(cursos);

    } catch (error) {
        console.error('Error al cargar cursos:', error);
        mostrarError('No se pudieron cargar los cursos. Por favor, intenta de nuevo.');
        mostrarCargando(false);
    }
}

// Función para mostrar estado de carga
function mostrarCargando(mostrar) {
    if (mostrar) {
        cursosGrid.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--color-text-light); grid-column: 1 / -1;">Cargando cursos...</p>';
        cursosGrid.style.display = 'grid';
        noCursos.style.display = 'none';
    }
}

// Función para mostrar error
function mostrarError(mensaje) {
    cursosGrid.innerHTML = `
        <div class="no-cursos" style="grid-column: 1 / -1;">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>${mensaje}</p>
            <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">Reintentar</button>
        </div>
    `;
    cursosGrid.style.display = 'grid';
    noCursos.style.display = 'none';
}

// Función para mostrar sin cursos
function mostrarSinCursos() {
    cursosGrid.style.display = 'none';
    noCursos.style.display = 'block';
    cursosCount.textContent = '0 cursos disponibles';
}

// Función para mostrar los cursos
function mostrarCursos(cursos) {
    cursosGrid.innerHTML = '';
    cursosGrid.style.display = 'grid';
    noCursos.style.display = 'none';

    cursos.forEach(curso => {
        const card = crearCardCurso(curso);
        cursosGrid.appendChild(card);
    });
}

// Función para crear una card de curso
function crearCardCurso(curso) {
    const card = document.createElement('div');
    card.className = 'curso-card';

    // Obtener clase CSS para el nivel de dificultad
    const nivelClass = `nivel-${curso.nivel_dificultad || 'basico'}`;
    const nivelTexto = curso.nivel_dificultad 
        ? curso.nivel_dificultad.charAt(0).toUpperCase() + curso.nivel_dificultad.slice(1)
        : 'Básico';

    // Formatear formatos de contenido
    let formatosHTML = '';
    if (curso.formato_contenido && Array.isArray(curso.formato_contenido) && curso.formato_contenido.length > 0) {
        formatosHTML = `
            <div class="curso-formatos">
                ${curso.formato_contenido.map(formato => 
                    `<span class="formato-tag">${formato}</span>`
                ).join('')}
            </div>
        `;
    }

    card.innerHTML = `
        <div class="curso-header-card">
            <h3>${curso.titulo}</h3>
            <div class="curso-empresa">
                <i class="fas fa-building"></i>
                ${curso.empresa || 'Empresa'}
            </div>
        </div>
        
        <p class="curso-descripcion">${curso.descripcion || 'Sin descripción disponible'}</p>
        
        <div class="curso-info">
            <span class="curso-badge ${nivelClass}">
                <i class="fas fa-signal"></i>
                ${nivelTexto}
            </span>
            <span class="curso-badge">
                <i class="fas fa-clock"></i>
                ${curso.duracion_estimada || 'N/A'} horas
            </span>
            ${curso.sector ? `
                <span class="curso-badge">
                    <i class="fas fa-industry"></i>
                    ${curso.sector}
                </span>
            ` : ''}
        </div>
        
        ${formatosHTML}
        
        <button class="btn btn-primary" onclick="verDetalleCurso(${curso.id})">
            <i class="fas fa-eye"></i>
            Ver Detalle del Curso
        </button>
    `;

    return card;
}

// Función para ver detalle del curso
function verDetalleCurso(cursoId) {
    window.location.href = `/Sprint1/FrontEnd/templates/html/detalle-curso.html?id=${cursoId}`;
}

// Función para formatear números
function formatearNumero(numero) {
    return numero.toLocaleString('es-ES');
}


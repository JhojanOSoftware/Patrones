// URL base de la API
const API_URL = "http://localhost:8000";

// Obtener elementos del DOM
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const cursoContent = document.getElementById('cursoContent');

// Obtener el ID del curso desde la URL
const urlParams = new URLSearchParams(window.location.search);
const cursoId = urlParams.get('id');

// Cargar detalles del curso al iniciar la página
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que el usuario esté logueado
    const session = JSON.parse(localStorage.getItem("session"));
    
    if (!session) {
        mostrarError('No estás logueado. Por favor, inicia sesión primero.');
        return;
    }
    
    if (session.rol !== 'buscador') {
        mostrarError('Esta página es solo para usuarios (buscadores de empleo).');
        return;
    }
    
    if (!cursoId) {
        mostrarError('No se proporcionó un ID de curso válido.');
        return;
    }
    
    await cargarDetalleCurso(cursoId, session.user_id);
});

// Función para cargar los detalles del curso y la inscripción
async function cargarDetalleCurso(cursoId, usuarioId) {
    try {
        mostrarCargando(true);
        
        // Cargar detalles del curso
        const response = await fetch(`${API_URL}/api/cursos/${cursoId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('El curso solicitado no existe o no está disponible.');
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const curso = await response.json();
        
        // Cargar información de la inscripción del usuario
        const perfilResponse = await fetch(`${API_URL}/api/perfiles/${usuarioId}`);
        let inscripcionData = null;
        
        if (perfilResponse.ok) {
            const perfil = await perfilResponse.json();
            inscripcionData = perfil.inscripciones?.find(ins => ins.curso_id === parseInt(cursoId));
        }
        
        mostrarCargando(false);
        mostrarCurso(curso, inscripcionData);
        
    } catch (error) {
        console.error('Error al cargar el curso:', error);
        mostrarError(error.message || 'No se pudo cargar la información del curso. Por favor, intenta de nuevo.');
    }
}

// Función para mostrar estado de carga
function mostrarCargando(mostrar) {
    loading.style.display = mostrar ? 'block' : 'none';
    error.style.display = 'none';
    cursoContent.style.display = 'none';
}

// Función para mostrar error
function mostrarError(mensaje) {
    loading.style.display = 'none';
    error.style.display = 'block';
    cursoContent.style.display = 'none';
    errorMessage.textContent = mensaje;
}

// Función para mostrar el curso
function mostrarCurso(curso, inscripcionData) {
    loading.style.display = 'none';
    error.style.display = 'none';
    cursoContent.style.display = 'block';
    
    // Llenar información del header
    document.getElementById('cursoTitulo').textContent = curso.titulo || 'Sin título';
    document.getElementById('cursoEmpresa').textContent = curso.empresa?.nombre || 'Empresa no especificada';
    document.getElementById('cursoDuracion').textContent = `${curso.duracion_estimada || 0} horas`;
    
    // Nivel de dificultad
    const nivelTexto = curso.nivel_dificultad 
        ? curso.nivel_dificultad.charAt(0).toUpperCase() + curso.nivel_dificultad.slice(1)
        : 'No especificado';
    const nivelClass = `nivel-${curso.nivel_dificultad || 'basico'}`;
    document.getElementById('cursoNivel').innerHTML = `<span class="curso-badge ${nivelClass}">${nivelTexto}</span>`;
    
    // Fecha de publicación
    const fecha = curso.fecha_publicacion 
        ? formatearFecha(curso.fecha_publicacion)
        : 'No especificada';
    document.getElementById('cursoFecha').textContent = fecha;
    
    // Descripción
    document.getElementById('cursoDescripcion').textContent = curso.descripcion || 'No hay descripción disponible para este curso.';
    
    // Objetivos
    if (curso.objetivos && curso.objetivos.trim()) {
        document.getElementById('cursoObjetivosSection').style.display = 'block';
        // Si los objetivos vienen como lista o texto plano
        if (curso.objetivos.includes('\n') || curso.objetivos.includes('-')) {
            const objetivosHTML = curso.objetivos.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const texto = line.trim().replace(/^[-•]\s*/, '');
                    return `<li>${texto}</li>`;
                })
                .join('');
            document.getElementById('cursoObjetivos').innerHTML = `<ul>${objetivosHTML}</ul>`;
        } else {
            document.getElementById('cursoObjetivos').innerHTML = `<p>${curso.objetivos}</p>`;
        }
    } else {
        document.getElementById('cursoObjetivosSection').style.display = 'none';
    }
    
    // Temario
    if (curso.temario && curso.temario.trim()) {
        document.getElementById('cursoTemarioSection').style.display = 'block';
        // Si el temario viene como lista o texto plano
        if (curso.temario.includes('\n') || curso.temario.includes('-')) {
            const temarioHTML = curso.temario.split('\n')
                .filter(line => line.trim())
                .map((line, index) => {
                    const texto = line.trim().replace(/^[-•]\s*/, '');
                    return `<li>${texto}</li>`;
                })
                .join('');
            document.getElementById('cursoTemario').innerHTML = `<ol>${temarioHTML}</ol>`;
        } else {
            document.getElementById('cursoTemario').innerHTML = `<p>${curso.temario}</p>`;
        }
    } else {
        document.getElementById('cursoTemarioSection').style.display = 'none';
    }
    
    // Formatos de contenido
    if (curso.formato_contenido && Array.isArray(curso.formato_contenido) && curso.formato_contenido.length > 0) {
        document.getElementById('cursoFormatosSection').style.display = 'block';
        const formatosHTML = curso.formato_contenido
            .map(formato => `<span class="formato-tag">${formato}</span>`)
            .join('');
        document.getElementById('cursoFormatos').innerHTML = formatosHTML;
    } else {
        document.getElementById('cursoFormatosSection').style.display = 'none';
    }
    
    // Información de la sidebar
    document.getElementById('infoNivel').innerHTML = `<span class="curso-badge ${nivelClass}">${nivelTexto}</span>`;
    document.getElementById('infoDuracion').textContent = `${curso.duracion_estimada || 0} horas`;
    document.getElementById('infoFecha').textContent = fecha;
    
    // Oferta asociada
    if (curso.oferta_asociada) {
        document.getElementById('infoOfertaSection').style.display = 'block';
        document.getElementById('infoOferta').innerHTML = `
            <a href="/Sprint1/FrontEnd/templates/html/detalle-oferta.html?id=${curso.oferta_asociada.id}" 
               style="color: var(--color-primary); text-decoration: none;">
                ${curso.oferta_asociada.titulo || 'Ver oferta'}
            </a>
        `;
    } else {
        document.getElementById('infoOfertaSection').style.display = 'none';
    }
    
    // Información de la empresa
    if (curso.empresa) {
        document.getElementById('empresaNombre').textContent = curso.empresa.nombre || 'Empresa no especificada';
        document.getElementById('empresaSector').innerHTML = curso.empresa.sector 
            ? `<i class="fas fa-industry"></i> ${curso.empresa.sector}`
            : '';
        document.getElementById('empresaDireccion').innerHTML = curso.empresa.direccion
            ? `<i class="fas fa-map-marker-alt"></i> ${curso.empresa.direccion}`
            : '';
        document.getElementById('empresaTelefono').innerHTML = curso.empresa.telefono
            ? `<i class="fas fa-phone"></i> ${curso.empresa.telefono}`
            : '';
    }
    
    // Mostrar información de la inscripción
    if (inscripcionData) {
        const estadoTexto = inscripcionData.estado 
            ? inscripcionData.estado.charAt(0).toUpperCase() + inscripcionData.estado.slice(1).replace('_', ' ')
            : 'No iniciado';
        const progreso = inscripcionData.progreso ?? 0;
        const fechaInscripcion = inscripcionData.fecha_inscripcion 
            ? formatearFecha(inscripcionData.fecha_inscripcion)
            : 'Fecha no disponible';
        
        document.getElementById('inscripcionEstado').innerHTML = `<strong>Estado:</strong> ${estadoTexto}`;
        document.getElementById('inscripcionProgreso').innerHTML = `<strong>Progreso:</strong> ${progreso}%`;
        document.getElementById('inscripcionFecha').innerHTML = `<strong>Fecha de inscripción:</strong> ${fechaInscripcion}`;
    } else {
        // Si no hay datos de inscripción, ocultar la sección
        document.querySelector('.inscripcion-info').style.display = 'none';
    }
}

// Función para formatear fecha
function formatearFecha(fechaString) {
    try {
        const fecha = new Date(fechaString);
        const opciones = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'UTC'
        };
        return fecha.toLocaleDateString('es-ES', opciones);
    } catch (error) {
        return fechaString;
    }
}


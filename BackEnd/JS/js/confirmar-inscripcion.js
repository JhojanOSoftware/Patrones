// URL base de la API
const API_URL = "http://localhost:8000";

// Obtener elementos del DOM
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const success = document.getElementById('success');
const successMessage = document.getElementById('successMessage');
const confirmacionCard = document.getElementById('confirmacionCard');
const btnConfirmar = document.getElementById('btnConfirmar');
const btnCancelar = document.getElementById('btnCancelar');

// Obtener el ID del curso desde la URL
const urlParams = new URLSearchParams(window.location.search);
const cursoId = urlParams.get('cursoId');

// Variables globales
let cursoData = null;

// Cargar información del curso al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que el usuario esté logueado
    const session = JSON.parse(localStorage.getItem("session"));
    
    if (!session) {
        mostrarError('No estás logueado. Por favor, inicia sesión primero.');
        return;
    }
    
    if (session.rol !== 'buscador') {
        mostrarError('Solo los usuarios (buscadores de empleo) pueden inscribirse a cursos.');
        return;
    }
    
    if (!cursoId) {
        mostrarError('No se proporcionó un ID de curso válido.');
        return;
    }
    
    await cargarInformacionCurso(cursoId);
});

// Función para cargar información del curso
async function cargarInformacionCurso(cursoId) {
    try {
        mostrarCargando(true);
        
        const response = await fetch(`${API_URL}/api/cursos/${cursoId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('El curso solicitado no existe o no está disponible.');
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        cursoData = await response.json();
        
        mostrarCargando(false);
        mostrarConfirmacion(cursoData);
        
    } catch (error) {
        console.error('Error al cargar el curso:', error);
        mostrarError(error.message || 'No se pudo cargar la información del curso. Por favor, intenta de nuevo.');
    }
}

// Función para mostrar estado de carga
function mostrarCargando(mostrar) {
    loading.style.display = mostrar ? 'block' : 'none';
    error.style.display = 'none';
    success.style.display = 'none';
    confirmacionCard.style.display = 'none';
}

// Función para mostrar error
function mostrarError(mensaje) {
    loading.style.display = 'none';
    error.style.display = 'block';
    success.style.display = 'none';
    confirmacionCard.style.display = 'none';
    errorMessage.textContent = mensaje;
}

// Función para mostrar confirmación
function mostrarConfirmacion(curso) {
    loading.style.display = 'none';
    error.style.display = 'none';
    success.style.display = 'none';
    confirmacionCard.style.display = 'block';
    
    // Llenar información del curso
    document.getElementById('cursoTitulo').textContent = curso.titulo || 'Sin título';
    document.getElementById('cursoDescripcion').textContent = curso.descripcion || 'Sin descripción';
    document.getElementById('cursoDuracion').textContent = `${curso.duracion_estimada || 0} horas`;
    
    const nivelTexto = curso.nivel_dificultad 
        ? curso.nivel_dificultad.charAt(0).toUpperCase() + curso.nivel_dificultad.slice(1)
        : 'No especificado';
    document.getElementById('cursoNivel').textContent = nivelTexto;
    
    // Event listeners para los botones
    btnConfirmar.onclick = () => confirmarInscripcion(cursoId);
    btnCancelar.onclick = () => cancelarInscripcion();
}

// Función para confirmar la inscripción
async function confirmarInscripcion(cursoId) {
    try {
        // Obtener sesión del usuario
        const session = JSON.parse(localStorage.getItem("session"));
        
        if (!session || session.rol !== 'buscador') {
            mostrarError('No tienes permisos para inscribirte a este curso.');
            return;
        }
        
        // Deshabilitar botones durante la inscripción
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscribiendo...';
        btnCancelar.disabled = true;
        
        // Realizar la inscripción
        const response = await fetch(`${API_URL}/api/cursos/${cursoId}/inscribir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: session.user_id
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Error al inscribirse al curso');
        }
        
        // Mostrar mensaje de éxito
        mostrarExito(data);
        
    } catch (error) {
        console.error('Error al inscribirse:', error);
        mostrarError(error.message || 'No se pudo completar la inscripción. Por favor, intenta de nuevo.');
        
        // Rehabilitar botones
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i class="fas fa-check"></i> Sí, Inscribirme';
        btnCancelar.disabled = false;
    }
}

// Función para mostrar éxito
function mostrarExito(data) {
    loading.style.display = 'none';
    error.style.display = 'none';
    confirmacionCard.style.display = 'none';
    success.style.display = 'block';
    
    if (data.ya_inscrito) {
        successMessage.innerHTML = `
            <strong>Ya estabas inscrito en el curso "${data.curso_titulo || 'este curso'}".</strong><br>
            Serás redirigido a tu perfil en unos momentos...
        `;
    } else {
        successMessage.innerHTML = `
            <strong>¡Registro exitoso al curso "${data.curso_titulo || 'este curso'}"!</strong><br>
            Serás redirigido a tu perfil en unos momentos...
        `;
    }
    
    // Redirigir a mi-perfil.html después de 3 segundos
    setTimeout(() => {
        window.location.href = '/Sprint1/FrontEnd/templates/html/mi-perfil.html';
    }, 3000);
}

// Función para cancelar inscripción
function cancelarInscripcion() {
    if (cursoId) {
        window.location.href = `/Sprint1/FrontEnd/templates/html/detalle-curso.html?id=${cursoId}`;
    } else {
        window.location.href = '/Sprint1/FrontEnd/templates/html/cursos.html';
    }
}


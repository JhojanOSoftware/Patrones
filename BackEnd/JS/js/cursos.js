// URL base de la API
const API_URL = "http://localhost:8000";

// Obtener elementos del DOM
const formCrearCurso = document.getElementById('formCrearCurso');
const mensaje = document.getElementById('mensaje');

// Verificar que el usuario esté logueado y sea empresa
document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem("session"));
    
    if (!session) {
        alert("No estás logueado. Inicia sesión para publicar un curso.");
        window.location.href = "/Sprint1/FrontEnd/templates/html/login-app.html";
        return;
    }

    if (session.rol !== 'empresa') {
        alert("Esta página es solo para empresas.");
        window.location.href = "/Sprint1/FrontEnd/templates/html/mi-perfil.html";
        return;
    }
});

// Manejar el envío del formulario
formCrearCurso.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Obtener botón de envío
    const btnSubmit = this.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.textContent;

    try {
        // Deshabilitar botón y mostrar estado de carga
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Publicando...';

        // Obtener sesión para empresa_id
        const session = JSON.parse(localStorage.getItem("session"));
        if (!session || session.rol !== 'empresa') {
            throw new Error('Debes estar logueado como empresa para publicar cursos');
        }

        // Obtener empresa_id desde el perfil de empresa
        // Primero necesitamos obtener el perfil de empresa para obtener empresa_id
        const perfilResp = await fetch(`${API_URL}/api/perfiles/empresa/${session.user_id}`);
        if (!perfilResp.ok) {
            throw new Error('No se pudo obtener el perfil de la empresa');
        }
        const perfil = await perfilResp.json();
        const empresa_id = perfil.empresa_id;

        // Obtener formatos de contenido seleccionados
        const formatosCheckboxes = document.querySelectorAll('input[name="formato"]:checked');
        const formatosContenido = Array.from(formatosCheckboxes).map(cb => cb.value);

        // Obtener oferta asociada (si existe)
        const ofertaAsociada = document.getElementById('ofertaAsociada').value.trim();
        const ofertaAsociadaId = ofertaAsociada ? parseInt(ofertaAsociada) : null;

        // Crear objeto de curso
        const cursoData = {
            empresa_id: empresa_id,
            titulo: document.getElementById('titulo').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            objetivos: document.getElementById('objetivos').value.trim() || null,
            temario: document.getElementById('temario').value.trim() || null,
            duracion_estimada: parseInt(document.getElementById('duracion').value),
            nivel_dificultad: document.getElementById('nivelDificultad').value,
            formato_contenido: formatosContenido.length > 0 ? formatosContenido : null,
            visibilidad: document.getElementById('visibilidad').value,
            oferta_asociada: ofertaAsociadaId
        };

        // Validaciones de campos requeridos
        if (!cursoData.titulo || cursoData.titulo.length === 0) {
            mostrarMensaje('El título del curso es obligatorio', 'error');
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginal;
            return;
        }
        
        if (!cursoData.descripcion || cursoData.descripcion.length === 0) {
            mostrarMensaje('La descripción del curso es obligatoria', 'error');
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginal;
            return;
        }
        
        if (!cursoData.duracion_estimada || isNaN(cursoData.duracion_estimada) || cursoData.duracion_estimada < 1) {
            mostrarMensaje('La duración estimada debe ser al menos 1 hora', 'error');
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginal;
            return;
        }
        
        if (!cursoData.nivel_dificultad || cursoData.nivel_dificultad.length === 0) {
            mostrarMensaje('Debes seleccionar un nivel de dificultad', 'error');
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginal;
            return;
        }

        if (!cursoData.visibilidad || cursoData.visibilidad.length === 0) {
            cursoData.visibilidad = 'publico'; // Valor por defecto
        }

        console.log('Enviando datos del curso:', cursoData);

        // Enviar al backend
        const response = await fetch(`${API_URL}/api/cursos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cursoData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('Curso creado exitosamente:', data);

        // Mostrar mensaje de éxito
        mostrarMensaje(`¡Curso publicado exitosamente! ID: ${data.curso_id}`, 'success');

        // Limpiar formulario
        formCrearCurso.reset();

        // Opcional: Redirigir al perfil después de 2 segundos
        setTimeout(() => {
            const irAPerfil = confirm('¿Deseas ver tu perfil de empresa?');
            if (irAPerfil) {
                window.location.href = '/Sprint1/FrontEnd/templates/html/perfil-empresa.html';
            }
        }, 1500);

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(`Error: ${error.message}`, 'error');
    } finally {
        // Rehabilitar botón
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginal;
    }
});

// Función para mostrar mensajes
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
    mensaje.style.display = 'block';

    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 5000);
}

// Validación en tiempo real
document.querySelectorAll('input[required], select[required], textarea[required]').forEach(campo => {
    campo.addEventListener('blur', function() {
        if (!this.value.trim()) {
            this.style.borderColor = 'var(--color-danger)';
        } else {
            this.style.borderColor = 'var(--color-success)';
        }
    });

    campo.addEventListener('input', function() {
        if (this.value.trim()) {
            this.style.borderColor = 'var(--color-border)';
        }
    });
});


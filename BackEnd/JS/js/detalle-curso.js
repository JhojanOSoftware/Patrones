document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id') || urlParams.get('curso_id');
    if (courseId) {
        loadCourseDetail(courseId);
    } else {
        showError('ID de curso no especificado en la URL');
    }
});

async function loadCourseDetail(courseId) {
    try {
        const response = await fetch(`/api/cursos/${courseId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const course = await response.json();
        renderCourseDetail(course);
    } catch (error) {
        console.error('Error loading course detail:', error);
        showError('Error al cargar los detalles del curso. Por favor, intenta de nuevo.');
    }
}

function renderCourseDetail(course) {
    // Update page title
    document.title = `${course.titulo} - CEO Platform`;

    // Fill course information
    const titleEl = document.getElementById('course-title');
    if (titleEl) titleEl.textContent = course.titulo;

    const descEl = document.getElementById('course-description');
    if (descEl) descEl.textContent = course.descripcion || 'Sin descripción disponible';

    const objEl = document.getElementById('course-objectives');
    if (objEl) objEl.textContent = course.objetivos || 'No especificados';

    const temarioEl = document.getElementById('course-temario');
    if (temarioEl) temarioEl.textContent = course.temario || 'No disponible';

    const durationEl = document.getElementById('course-duration');
    if (durationEl) durationEl.textContent = course.duracion_estimada ? `${course.duracion_estimada} horas` : 'No especificada';

    const levelEl = document.getElementById('course-level');
    if (levelEl) levelEl.textContent = course.nivel_dificultad ? course.nivel_dificultad.charAt(0).toUpperCase() + course.nivel_dificultad.slice(1) : 'No especificado';

    const companyEl = document.getElementById('course-company');
    if (companyEl) companyEl.textContent = course.empresa ? course.empresa.nombre : 'Empresa no especificada';

    const sectorEl = document.getElementById('course-sector');
    if (sectorEl) sectorEl.textContent = course.empresa ? course.empresa.sector : 'Sector no especificado';

    // Format content types
    const contentEl = document.getElementById('course-content-types');
    if (contentEl && course.formato_contenido) {
        contentEl.innerHTML = course.formato_contenido.map(type => `<span class="content-type-tag">${type}</span>`).join('');
    }

    // Check enrollment status
    checkEnrollmentStatus(course.id);
}

async function checkEnrollmentStatus(courseId) {
    const userId = sessionStorage.getItem('userId');
    if (!userId) {
        // User not logged in, show enroll button
        showEnrollButton(courseId);
        return;
    }

    try {
        const response = await fetch(`/api/cursos/usuario/${userId}`);
        if (response.ok) {
            const data = await response.json();
            const enrolled = data.cursos.some(c => c.id == courseId);
            if (enrolled) {
                showEnrolledStatus();
            } else {
                showEnrollButton(courseId);
            }
        } else {
            showEnrollButton(courseId);
        }
    } catch (error) {
        console.error('Error checking enrollment:', error);
        showEnrollButton(courseId);
    }
}

function showEnrollButton(courseId) {
    const container = document.getElementById('enrollment-container');
    if (container) {
        container.innerHTML = `
            <button id="enroll-btn" class="btn btn-primary" onclick="enrollInCourse(${courseId})">
                Inscribirme en este curso
            </button>
        `;
    }
}

function showEnrolledStatus() {
    const container = document.getElementById('enrollment-container');
    if (container) {
        container.innerHTML = `
            <div class="enrolled-status">
                <i class="fas fa-check-circle"></i>
                <span>Ya estás inscrito en este curso</span>
            </div>
        `;
    }
}

async function enrollInCourse(courseId) {
    const userId = sessionStorage.getItem('userId');
    if (!userId) {
        alert('Debes iniciar sesión para inscribirte en cursos');
        return;
    }

    try {
        const response = await fetch(`/api/cursos/${courseId}/inscribir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario_id: parseInt(userId) })
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message || 'Inscripción exitosa');
            showEnrolledStatus();
        } else {
            const error = await response.json();
            alert(error.detail || 'Error al inscribirse en el curso');
        }
    } catch (error) {
        console.error('Error enrolling in course:', error);
        alert('Error al procesar la inscripción. Intenta de nuevo.');
    }
}

function showError(message) {
    const container = document.getElementById('course-detail-container');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>${message}</p>
                <button onclick="history.back()" class="btn btn-secondary">Volver</button>
            </div>
        `;
    }
}
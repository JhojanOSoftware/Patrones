document.addEventListener('DOMContentLoaded', function () {
    // Try to get userId from sessionStorage, then cookie, then /api/session
    function getCookie(name) {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : null;
    }

    async function loadSession() {
        let uid = sessionStorage.getItem('userId');
        if (uid) return uid;
        uid = getCookie('user_id');
        if (uid) return uid;

        try {
            const r = await fetch('/api/session');
            if (!r.ok) return null;
            const j = await r.json();
            if (j.logged && j.session && j.session.id) {
                sessionStorage.setItem('userId', String(j.session.id));
                sessionStorage.setItem('userType', j.session.tipo_usuario || j.session.rol || 'buscador');
                return String(j.session.id);
            }
        } catch (e) {
            console.warn('No session available', e);
        }
        return null;
    }

    async function loadUserProfile() {
        const userId = await loadSession();
        if (!userId) {
            console.warn('No user ID available');
            return;
        }

        try {
            const response = await fetch(`/api/perfiles/${userId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const profileData = await response.json();
            populateProfileData(profileData);
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    function populateProfileData(data) {
        // Datos personales
        const userNameEl = document.getElementById('user-name');
        if (userNameEl && data.nombre) {
            userNameEl.textContent = data.nombre;
        }

        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl && data.email) {
            userEmailEl.textContent = data.email;
        }

        const userPhoneEl = document.getElementById('user-phone');
        if (userPhoneEl) {
            userPhoneEl.textContent = data.telefono || 'No especificado';
        }

        const userLocationEl = document.getElementById('user-location');
        if (userLocationEl) {
            userLocationEl.textContent = data.ubicacion || 'No especificada';
        }

        const userGenderEl = document.getElementById('user-gender');
        if (userGenderEl) {
            userGenderEl.textContent = data.identidad_genero || 'No especificado';
        }

        const userSkillsEl = document.getElementById('user-skills');
        if (userSkillsEl && data.habilidades) {
            userSkillsEl.textContent = Array.isArray(data.habilidades) ? data.habilidades.join(', ') : data.habilidades;
        }

        // Postulaciones recientes
        if (data.postulaciones && data.postulaciones.length > 0) {
            renderRecentApplications(data.postulaciones.slice(0, 3)); // Últimas 3
        }

        // Cursos inscritos
        if (data.inscripciones && data.inscripciones.length > 0) {
            renderEnrolledCourses(data.inscripciones);
        }
    }

    function renderRecentApplications(applications) {
        const container = document.getElementById('recent-applications');
        if (!container) return;

        container.innerHTML = applications.map(app => `
            <div class="application-item">
                <h4>${app.oferta_titulo || app.puesto || 'Oferta'}</h4>
                <p><strong>Empresa:</strong> ${app.empresa || 'No especificada'}</p>
                <p><strong>Estado:</strong> ${app.estado_actual || 'No especificado'}</p>
                <p><strong>Fecha:</strong> ${new Date(app.fecha_creacion).toLocaleDateString('es-ES')}</p>
            </div>
        `).join('');
    }

    function renderEnrolledCourses(courses) {
        const container = document.getElementById('enrolled-courses');
        if (!container) return;

        container.innerHTML = courses.map(course => `
            <div class="course-item">
                <h4>${course.curso_titulo || 'Curso'}</h4>
                <p>${course.curso_descripcion || ''}</p>
                <p><strong>Progreso:</strong> ${course.progreso || 0}%</p>
                <p><strong>Estado:</strong> ${course.estado || 'No iniciado'}</p>
            </div>
        `).join('');
    }

    loadUserProfile();
});

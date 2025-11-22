// header.js: renderiza el header dinámico según el estado de autenticación
document.addEventListener('DOMContentLoaded', function () {
    const headerEl = document.getElementById('ceo-header');
    if (!headerEl) return;

    function renderLoggedOut() {
        headerEl.innerHTML = `
            <header class="ceo-header">
                <div class="brand">
                    <a href="/">CEO</a>
                    <div class="slogan">Tu futuro comienza aquí</div>
                </div>
                <nav class="ceo-nav">
                    <a class="btn" href="/registro-app">Registrarse</a>
                    <a class="btn" href="/login-app">Iniciar sesión</a>
                </nav>
            </header>
        `;
    }

    function renderLoggedIn(profile) {
        const displayName = profile.tipo_usuario === 'empresa' ? profile.nombre : profile.nombre;
        headerEl.innerHTML = `
            <header class="ceo-header logged">
                <div class="brand">
                    <a href="/">CEO</a>
                    <div class="slogan">Tu futuro comienza aquí</div>
                </div>
                <nav class="ceo-nav">
                    <span class="greeting">Bienvenido, ${displayName}</span>
                    <a class="btn" href="/mi-perfil">Mi Perfil</a>
                    <a class="btn" href="/ver-postulaciones">Mis Postulaciones</a>
                    <button id="ceo-logout" class="btn">Cerrar Sesión</button>
                </nav>
            </header>
        `;

        const logoutBtn = document.getElementById('ceo-logout');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    }

    function handleLogout() {
        // limpiar client-side
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('userId');
        // borrar cookie user_id intentando expulsarla
        document.cookie = 'user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        // redirigir al login
        window.location.href = '/';
    }

    function fetchProfileAndRender() {
        // Priorizar sessionStorage
        const userId = sessionStorage.getItem('userId');
        if (userId) {
            fetch('/api/user/profile', { credentials: 'same-origin' })
                .then(r => {
                    if (!r.ok) throw new Error('no auth');
                    return r.json();
                })
                .then(profile => renderLoggedIn(profile))
                .catch(() => renderLoggedOut());
            return;
        }

        // Si no hay userId, consultar /api/session para saber si hay sesión
        fetch('/api/session', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(j => {
                if (j.logged && j.session) {
                    // guardar en sessionStorage para uso en la página
                    sessionStorage.setItem('userType', j.session.tipo_usuario || 'buscador');
                    sessionStorage.setItem('userId', String(j.session.id));
                    renderLoggedIn(j.session);
                } else {
                    renderLoggedOut();
                }
            })
            .catch(() => renderLoggedOut());
    }

    fetchProfileAndRender();
});

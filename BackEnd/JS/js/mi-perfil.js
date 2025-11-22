document.addEventListener('DOMContentLoaded', () => {
    // Try to load session user_id from cookie
    function getCookie(name) {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : null;
    }

    const uid = getCookie('user_id');
    if (!uid) return;

    // Fetch profile and render basic info
    fetch(`/api/perfiles/${uid}`)
        .then(r => r.json())
        .then(data => {
            const elName = document.getElementById('perfil-nombre');
            const elEmail = document.getElementById('perfil-email');
            if (elName && data.nombre) elName.textContent = data.nombre;
            if (elEmail && data.email) elEmail.textContent = data.email;
        })
        .catch(err => console.warn('No se pudo cargar perfil:', err));
});

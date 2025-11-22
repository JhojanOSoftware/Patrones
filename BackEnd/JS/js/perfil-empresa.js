document.addEventListener('DOMContentLoaded', () => {
    // Simple loader for empresa profile page — mirrors mi-perfil behavior
    function getCookie(name) {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : null;
    }

    const uid = getCookie('user_id');
    if (!uid) return;

    fetch(`/api/perfiles/empresa/${uid}`)
        .then(r => {
            if (!r.ok) throw new Error('No autorizado o perfil no encontrado');
            return r.json();
        })
        .then(data => {
            const elName = document.getElementById('empresa-nombre');
            const elRazon = document.getElementById('empresa-razon');
            if (elName && data.nombre) elName.textContent = data.nombre;
            if (elRazon && data.razon_social) elRazon.textContent = data.razon_social;
        })
        .catch(err => console.warn('No se pudo cargar perfil empresa:', err));
});

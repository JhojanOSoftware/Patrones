document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnCerrarSesion');
    if (!btn) return;
    btn.addEventListener('click', () => {
        // Clear simple cookies set by login.js
        document.cookie = 'user_id=; Max-Age=0; path=/';
        document.cookie = 'rol=; Max-Age=0; path=/';
        // redirect to home/login
        window.location.href = '/';
    });
});

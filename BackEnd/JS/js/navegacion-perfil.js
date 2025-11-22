document.addEventListener('DOMContentLoaded', () => {
    // Simple navigation helper for profile pages
    const navToggles = document.querySelectorAll('[data-nav-target]');
    navToggles.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.navTarget;
            document.querySelectorAll('.perfil-section').forEach(s => s.style.display = 'none');
            const el = document.getElementById(target);
            if (el) el.style.display = 'block';
        });
    });
});

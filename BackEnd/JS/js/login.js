document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formLogin');
    const msg = document.getElementById('msgLogin');
    const demoBtns = document.querySelectorAll('.demo-btn');

    function showMessage(text, color = 'crimson') {
        if (!msg) return;
        msg.textContent = text;
        msg.style.color = color;
    }

    async function submitLogin(email, password) {
        try {
            showMessage('Enviando...', 'black');
            const res = await fetch('/api/validar-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                showMessage(data.message || 'Credenciales inválidas', 'crimson');
                return null;
            }

            // Guardar información de sesión en sessionStorage y cookie ligera
            try {
                const session = data.session || {};
                if (session.user_id) {
                    // cookie ligera para compatibilidad con shims existentes
                    document.cookie = `user_id=${session.user_id}; path=/`;
                }
                // almacenar tipo de usuario en sessionStorage (o localStorage si prefieres persistencia)
                if (session.rol) sessionStorage.setItem('userType', session.rol);
                if (session.user_id) sessionStorage.setItem('userId', session.user_id);
            } catch (e) {
                console.warn('No se pudo guardar sesión en storage:', e);
            }

            showMessage('Login correcto. Redirigiendo...', 'green');
            return data.session;
        } catch (err) {
            console.error(err);
            showMessage('Error de conexión con el servidor', 'crimson');
            return null;
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const email = (formData.get('email') || '').toString().trim().toLowerCase();
            const password = (formData.get('password') || '').toString();

            if (!email || password.length < 8) {
                showMessage('Email y contraseña (>=8) requeridos.', 'crimson');
                return;
            }

            const session = await submitLogin(email, password);
            if (session) {
                // Guardar userType y redirigir a index.html
                const rol = (session.rol || session.tipo_usuario || '').toString();
                if (rol) sessionStorage.setItem('userType', rol);
                if (session.user_id) sessionStorage.setItem('userId', session.user_id);
                window.location.href = '/index';
            }
        });
    }

    // Botones demo: rellenan el formulario y lo envían automáticamente
    if (demoBtns && demoBtns.length) {
        demoBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const email = btn.dataset.email || '';
                const password = btn.dataset.password || '';
                // rellenar inputs si existen
                const emailInput = document.getElementById('email');
                const passInput = document.getElementById('password');
                if (emailInput) emailInput.value = email;
                if (passInput) passInput.value = password;

                // enviar
                const session = await submitLogin(email, password);
                if (session) {
                    const rol = (session.rol || session.tipo_usuario || '').toString();
                    if (rol) sessionStorage.setItem('userType', rol);
                    if (session.user_id) sessionStorage.setItem('userId', session.user_id);
                    window.location.href = '/index';
                }
            });
        });
    }
});

// Fin de login.js

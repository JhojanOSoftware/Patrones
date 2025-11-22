document.addEventListener('DOMContentLoaded', function () {
    // Intent: detectar tipo de usuario guardado en sessionStorage o pedirlo al backend.
    const userType = sessionStorage.getItem('userType');
    const userId = sessionStorage.getItem('userId');

    function showEmployerView(data) {
        const container = document.getElementById('role-content');
        if (!container) return;
        container.innerHTML = `
            <section class="welcome-section">
                <h2 class="main-title">Panel de Empresa</h2>
                <p class="subtitle">Encuentra el talento perfecto para tu empresa</p>
                <div class="menu-buttons">
                    <button id="employer-cta" class="btn btn-primary">Revisar Aspirantes</button>
                    <div class="form-group">
                        <label for="employer-actions">Acciones rápidas</label>
                        <select id="employer-actions">
                            <option value="">Selecciona una acción</option>
                            <option value="/crear-oferta">Publicar Nueva Oferta</option>
                            <option value="/ofertas-empresa">Gestionar Ofertas Activas</option>
                            <option value="/ver-postulaciones">Ver Postulaciones</option>
                            <option value="/publicacion-curso-empresa">Registrar Curso/Formación</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top:1rem;" class="detalle-section">
                    <h3>Estadísticas</h3>
                    <pre>${JSON.stringify(data.metrics || {}, null, 2)}</pre>
                </div>
            </section>
        `;

        // Handlers
        const cta = document.getElementById('employer-cta');
        if (cta) cta.addEventListener('click', () => { window.location.href = '/ver-postulaciones'; });
        const sel = document.getElementById('employer-actions');
        if (sel) sel.addEventListener('change', (e) => {
            const v = e.target.value;
            if (v) window.location.href = v;
        });
    }

    function showSeekerView(data) {
        const container = document.getElementById('role-content');
        if (!container) return;
        container.innerHTML = `
            <section class="welcome-section">
                <h2 class="main-title">Panel Buscador</h2>
                <p class="subtitle">Encuentra tu oportunidad laboral ideal</p>
                <div class="menu-buttons">
                    <button id="seeker-cta" class="btn btn-primary">Buscar Empleo</button>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                        <button class="btn btn-secondary" data-href="/ver-postulaciones">Mis Postulaciones</button>
                        <button class="btn btn-secondary" data-href="/mis-cursos">Mis Cursos</button>
                        <button class="btn btn-secondary" data-href="/mi-perfil">Mi CV/Perfil</button>
                        <button class="btn btn-secondary" data-href="/cursos">Cursos Inscritos</button>
                    </div>
                </div>

                <div style="margin-top:1.25rem;" class="detalle-section">
                    <h3>Recomendaciones</h3>
                    <div class="ofertas-grid">
                        ${(data.recommendations || []).map(r => `
                            <div class="oferta-card">
                                <h3>${r.titulo}</h3>
                                <div class="detalle-actions">
                                    <a class="btn btn-primary" href="/ofertas/${r.id}">Ver Oferta</a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `;

        const cta = document.getElementById('seeker-cta');
        if (cta) cta.addEventListener('click', () => { window.location.href = '/buscar-empleo'; });
        // secondary buttons
        document.querySelectorAll('.btn.btn-secondary[data-href]').forEach(b => {
            b.addEventListener('click', () => { window.location.href = b.getAttribute('data-href'); });
        });
    }

    function fetchDashboard(type) {
        const endpoint = (type === 'empresa' || type === 'empleador') ? '/api/employer/dashboard' : '/api/jobseeker/dashboard';
        fetch(endpoint)
            .then(r => r.json())
            .then(data => {
                if (type === 'empresa' || type === 'empleador') showEmployerView(data);
                else showSeekerView(data);
            }).catch(err => {
                console.error('Error cargando dashboard', err);
            });
    }

    if (userType) {
        fetchDashboard(userType);
    } else if (userId) {
        // pedir al backend el tipo
        fetch('/api/user/type')
            .then(r => r.json())
            .then(j => {
                const t = j.userType || 'buscador';
                sessionStorage.setItem('userType', t);
                fetchDashboard(t);
            }).catch(err => console.error(err));
    } else {
        // No autenticado: mostrar llamada a login
        const container = document.getElementById('role-content');
        if (container) container.innerHTML = '<p>No autenticado. <a href="/">Iniciar sesión</a></p>';
    }

    // Inicializar panel izquierdo y recomendaciones siempre (si existe la estructura)
    try {
        initializeLeftPanel(userType);
        loadJobRecommendations(2);
    } catch (e) {
        // fallbacks silenciosos si elementos no existen
        console.debug('Inicialización de panel o recomendaciones falló:', e);
    }

    // Manejar búsqueda principal: redirigir con parámetros
    const mainSearch = document.getElementById('main-search');
    if (mainSearch) {
        mainSearch.addEventListener('submit', function (ev) {
            ev.preventDefault();
            const cargo = mainSearch.querySelector('input[name="cargo"]').value || '';
            const lugar = mainSearch.querySelector('input[name="lugar"]').value || '';
            const params = new URLSearchParams();
            if (cargo) params.set('cargo', cargo);
            if (lugar) params.set('lugar', lugar);
            window.location.href = '/ofertas?' + params.toString();
        });
    }

    // Función para cargar recomendaciones desde el backend
    function loadJobRecommendations(limit) {
        const list = document.getElementById('recommendations-list');
        if (!list) return;
        fetch(`/api/ofertas/recomendadas?limit=${encodeURIComponent(limit)}`)
            .then(r => r.json())
            .then(j => {
                if (!j || !j.success) return;
                const items = j.data || [];
                if (!items.length) {
                    list.innerHTML = '<p>No hay recomendaciones por el momento.</p>';
                    return;
                }
                list.innerHTML = items.map(it => `
                    <div class="oferta-card">
                        <div class="oferta-empresa">${it.empresa || ''}</div>
                        <h3>${it.titulo}</h3>
                        <div class="oferta-info">${it.ubicacion || ''} · ${it.modalidad || ''}</div>
                        <div class="detalle-actions"><a class="btn btn-primary" href="/ofertas/${it.id}">Ver Oferta</a></div>
                    </div>
                `).join('');
            }).catch(err => {
                console.error('Error cargando recomendaciones', err);
            });
    }

    // Inicializar panel izquierdo con perfil, quick actions y alertas
    function initializeLeftPanel(userTypeParam) {
        const left = document.getElementById('left-panel');
        if (!left) return;
        const userTypeNow = userTypeParam || sessionStorage.getItem('userType') || 'buscador';
        // Perfil resumen (puede obtenerse del sessionStorage o endpoint)
        const userName = sessionStorage.getItem('userName') || sessionStorage.getItem('userId') || 'Usuario';
        left.innerHTML = `
            <div class="user-summary">
                <div class="avatar"></div>
                <div>
                    <div class="user-name">${userName}</div>
                    <div class="user-role">${userTypeNow === 'empresa' ? 'Empresa' : 'Buscador'}</div>
                </div>
            </div>
            <div class="quick-actions">
                <!-- Quick actions populated below -->
            </div>
            <div class="job-alerts" style="margin-top:12px;">
                <h4>Alertas</h4>
                <div id="alerts-list"></div>
            </div>
        `;

        const quick = left.querySelector('.quick-actions');
        if (userTypeNow === 'empresa') {
            // Left panel actions for employers (simplified, per spec)
            const actions = [
                {t:'👥 Revisar Aspirantes', href:'/mis-aspirantes'},
                {t:'📢 Publicar Oferta', href:'/crear-oferta'},
                {t:'📋 Gestionar Ofertas', href:'/gestionar-ofertas'},
                {t:'🎓 Publicar Curso', href:'/publicar-curso'}
            ];
            quick.innerHTML = actions.map(a=>`<button class="btn btn-secondary" data-href="${a.href}">${a.t}</button>`).join('');
        } else {
            const actions = [
                {t:'Buscar Empleo', href:'/buscar-empleo'},
                {t:'Mis Postulaciones', href:'/ver-postulaciones'},
                {t:'Mi CV/Perfil', href:'/mi-perfil'},
                {t:'Cursos Inscritos', href:'/cursos'}
            ];
            quick.innerHTML = actions.map(a=>`<button class="btn btn-secondary" data-href="${a.href}">${a.t}</button>`).join('');
        }

        // bind
        quick.querySelectorAll('button[data-href]').forEach(b=>b.addEventListener('click',()=>{ window.location.href = b.getAttribute('data-href'); }));

        // cargar alertas (simples: últimas 3 ofertas)
        fetch('/api/ofertas')
            .then(r=>r.json())
            .then(j=>{
                const alerts = (j.ofertas || []).slice(0,3);
                const alertsList = document.getElementById('alerts-list');
                if (!alertsList) return;
                alertsList.innerHTML = alerts.map(a=>`
                    <div class="alert-item">
                        <div><strong>${a.titulo}</strong></div>
                        <div class="oferta-empresa">${a.empresa}</div>
                        <div class="oferta-info">${a.ubicacion} · ${a.modalidad}</div>
                    </div>
                `).join('');
            }).catch(()=>{});
    }
});

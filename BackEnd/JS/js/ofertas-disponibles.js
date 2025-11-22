// Script to load and render ofertas en `ofertas.html`
document.addEventListener('DOMContentLoaded', function () {
    const grid = document.getElementById('ofertasGrid');
    const countEl = document.getElementById('ofertasCount');
    const noEl = document.getElementById('noOfertas');

    async function loadOfertas() {
        try {
            const resp = await fetch('/api/ofertas');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            const ofertas = data.ofertas || [];

            if (!ofertas.length) {
                if (countEl) countEl.textContent = '0 ofertas disponibles';
                if (noEl) noEl.style.display = 'block';
                if (grid) grid.innerHTML = '';
                return;
            }

            if (countEl) countEl.textContent = `${ofertas.length} ofertas disponibles`;
            if (noEl) noEl.style.display = 'none';

            grid.innerHTML = ofertas.map(o => `
                <div class="oferta-card">
                    <div class="oferta-header-card">
                        <h3>${escapeHtml(o.titulo)}</h3>
                        <div class="oferta-empresa"><i class="fas fa-building"></i> ${escapeHtml(o.empresa || '')}</div>
                    </div>
                    <div class="oferta-descripcion">${escapeHtml(o.descripcion || '')}</div>
                    <div class="oferta-info">
                        <span class="oferta-badge">${escapeHtml(o.ubicacion || 'Remoto/No especificado')}</span>
                        <span class="oferta-badge">${escapeHtml(o.modalidad || '')}</span>
                        <span class="oferta-badge">${escapeHtml(o.tipoContrato || '')}</span>
                    </div>
                    <div class="oferta-habilidades">
                        ${(o.habilidadesRequeridas || []).slice(0,6).map(h => `<span class="habilidad-tag">${escapeHtml(h)}</span>`).join('')}
                    </div>
                    <div class="detalle-actions">
                        <a class="btn btn-primary" href="/ofertas/${o.id}">Ver Oferta</a>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error('Error cargando ofertas:', err);
            if (countEl) countEl.textContent = 'Error cargando ofertas';
            if (noEl) noEl.style.display = 'block';
            if (grid) grid.innerHTML = '';
        }
    }

    function escapeHtml(s) {
        if (!s && s !== 0) return '';
        return String(s).replace(/[&<>"']/g, function (c) {
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c];
        });
    }

    loadOfertas();
});

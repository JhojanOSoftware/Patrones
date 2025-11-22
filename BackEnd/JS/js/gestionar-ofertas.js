// gestionar-ofertas.js
const empresaId = 3;

async function loadCompanyOffers() {
    try {
        const resp = await fetch(`/api/empresa/${empresaId}/ofertas`);
        if (!resp.ok) throw new Error('Error fetching ofertas: ' + resp.status);
        const json = await resp.json();
        renderCompanyOffers(json.ofertas || []);
    } catch (err) {
        console.error('Error cargando ofertas de la empresa:', err);
        document.getElementById('ofertas-empresa-body').innerHTML = '<tr><td colspan="6">Error cargando ofertas</td></tr>';
    }
}

function renderCompanyOffers(list) {
    const tbody = document.getElementById('ofertas-empresa-body');
    tbody.innerHTML = '';
    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No hay ofertas publicadas</td></tr>';
        return;
    }
    list.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="border:1px solid #ddd;padding:8px">${o.id}</td>
            <td style="border:1px solid #ddd;padding:8px">${escapeHtml(o.titulo)}</td>
            <td style="border:1px solid #ddd;padding:8px">${o.postulantes || 0}</td>
            <td style="border:1px solid #ddd;padding:8px">${o.fecha_publicacion || ''}</td>
            <td style="border:1px solid #ddd;padding:8px">${o.activa ? 'Sí' : 'No'}</td>
            <td style="border:1px solid #ddd;padding:8px">
                <button onclick="goToEdit(${o.id})">Editar</button>
                <button onclick="toggleActive(${o.id}, ${o.activa ? 0 : 1})">${o.activa ? 'Desactivar' : 'Activar'}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function goToEdit(ofertaId) {
    // Reusar la página de detalle/edición si existe, o redirigir a crear-oferta
    window.location.href = `/ofertas/${ofertaId}`;
}

async function toggleActive(ofertaId, newActive) {
    try {
        const resp = await fetch(`/api/ofertas/${ofertaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activa: !!newActive })
        });
        if (!resp.ok) {
            const err = await resp.json();
            alert('Error actualizando oferta: ' + (err.detail || JSON.stringify(err)));
            return;
        }
        const data = await resp.json();
        alert(data.message || 'Oferta actualizada');
        loadCompanyOffers();
    } catch (err) {
        console.error('Error toggling active:', err);
        alert('Error actualizando oferta');
    }
}

function escapeHtml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

window.addEventListener('DOMContentLoaded', loadCompanyOffers);

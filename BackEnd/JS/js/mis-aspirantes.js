// mis-aspirantes.js
const empresaId = 3; // TechSolutions SAS (hardcoded per requirement)

async function loadAspirantes() {
    try {
        const resp = await fetch(`/api/empresa/${empresaId}/aspirantes`);
        if (!resp.ok) throw new Error('Error fetching aspirantes: ' + resp.status);
        const json = await resp.json();
        const list = json.aspirantes || [];
        renderAspirantes(list);
    } catch (err) {
        console.error('Error cargando aspirantes:', err);
        createSampleApplicants();
    }
}

function renderAspirantes(list) {
    const tbody = document.getElementById('aspirantes-body');
    const empty = document.getElementById('aspirantes-empty');
    tbody.innerHTML = '';
    if (!list || list.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    list.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="border:1px solid #ddd;padding:8px">${escapeHtml(a.nombres || '')} ${escapeHtml(a.apellidos || '')}</td>
            <td style="border:1px solid #ddd;padding:8px">${escapeHtml(a.email || '')}</td>
            <td style="border:1px solid #ddd;padding:8px">${escapeHtml(a.puesto_aplicado || '')}</td>
            <td style="border:1px solid #ddd;padding:8px">${escapeHtml(a.fecha_postulacion || '')}</td>
            <td style="border:1px solid #ddd;padding:8px">${escapeHtml(a.estado || '')}</td>
            <td style="border:1px solid #ddd;padding:8px">
                <button onclick="viewProfile(${a.usuario_id})">Ver perfil</button>
                <button onclick="cambiarEstado(${a.postulacion_id}, 'En progreso')">Marcar En progreso</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewProfile(userId) {
    // Redirigir al perfil público del usuario
    window.location.href = `/mi-perfil.html?user=${userId}`;
}

async function cambiarEstado(postulacionId, nuevoEstado) {
    try {
        const resp = await fetch(`/api/postulaciones/${postulacionId}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevo_estado: nuevoEstado, usuario: 'empresa', observaciones: 'Cambio desde panel empresa' })
        });
        if (!resp.ok) {
            const err = await resp.json();
            alert('Error cambiando estado: ' + (err.detail || JSON.stringify(err)));
            return;
        }
        const data = await resp.json();
        alert('Estado actualizado: ' + data.nuevo_estado);
        loadAspirantes();
    } catch (err) {
        console.error('Error al cambiar estado:', err);
        alert('Error al cambiar estado');
    }
}

function createSampleApplicants() {
    const sample = [
        { nombres: 'Ana', apellidos: 'López', email: 'ana.lopez@email.com', puesto_aplicado: 'Desarrollador Frontend React', fecha_postulacion: '2024-01-15', estado:'pendiente', usuario_id: 101, postulacion_id: 1001 },
        { nombres: 'Carlos', apellidos: 'Martínez', email: 'carlos.martinez@email.com', puesto_aplicado: 'Programador de software', fecha_postulacion: '2024-01-12', estado:'entrevista', usuario_id: 102, postulacion_id: 1002 }
    ];
    renderAspirantes(sample);
}

function escapeHtml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

window.addEventListener('DOMContentLoaded', loadAspirantes);

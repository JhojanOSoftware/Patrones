// publicar-curso.js
// Formulario simple para crear un curso y enviarlo a POST /api/cursos

const empresaIdForCourse = parseInt(sessionStorage.getItem('empresaId')) || 3; // fallback 3
const form = document.getElementById('formPublicarCurso');
const mensajeDiv = document.getElementById('mensajeCurso');

function showMessage(msg, isError) {
    mensajeDiv.textContent = msg;
    mensajeDiv.style.color = isError ? '#c0392b' : '#2c8f2c';
}

if (form) {
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const data = {
            empresa_id: empresaIdForCourse,
            titulo: document.getElementById('titulo').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            duracion_estimada: parseInt(document.getElementById('duracion').value, 10) || 1,
            nivel_dificultad: document.getElementById('nivel').value || 'basico',
            objetivos: '',
            temario: '',
            formato_contenido: JSON.stringify(['video','documento']),
            visibilidad: 'publico'
        };

        try {
            const resp = await fetch('/api/cursos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!resp.ok) {
                const err = await resp.json();
                showMessage('Error: ' + (err.detail || JSON.stringify(err)), true);
                return;
            }
            const json = await resp.json();
            showMessage('Curso publicado correctamente (id: ' + json.curso_id + ')', false);
            form.reset();
        } catch (err) {
            console.error('Error publicando curso:', err);
            showMessage('Error publicando curso: ' + err.message, true);
        }
    });
}

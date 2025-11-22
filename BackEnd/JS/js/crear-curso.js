// crear-curso.js
const empresaIdCurso = 3;

document.getElementById('crear-curso-form').addEventListener('submit', async function(e){
    e.preventDefault();
    const titulo = document.getElementById('titulo').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const duracion = parseInt(document.getElementById('duracion').value, 10) || 1;
    const nivel = document.getElementById('nivel').value || 'basico';

    const payload = {
        empresa_id: empresaIdCurso,
        titulo: titulo,
        descripcion: descripcion,
        duracion_estimada: duracion,
        nivel_dificultad: nivel
    };

    try {
        const resp = await fetch('/api/cursos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            const err = await resp.json();
            document.getElementById('crear-curso-result').textContent = 'Error: ' + (err.detail || JSON.stringify(err));
            return;
        }
        const data = await resp.json();
        document.getElementById('crear-curso-result').textContent = 'Curso creado. ID: ' + (data.curso_id || data.cursoId || 'n/a');
        // opcional: limpiar form
        document.getElementById('crear-curso-form').reset();
    } catch (err) {
        console.error('Error creando curso:', err);
        document.getElementById('crear-curso-result').textContent = 'Error al crear curso';
    }
});

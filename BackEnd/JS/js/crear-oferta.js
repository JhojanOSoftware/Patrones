// Obtener elementos del DOM
const formCrearOferta = document.getElementById('formCrearOferta');
const modalidadSelect = document.getElementById('modalidad');
const ubicacionInput = document.getElementById('ubicacion');
const mensaje = document.getElementById('mensaje');

// Autocompletar ubicación si la modalidad es "Remoto"
modalidadSelect.addEventListener('change', function() {
    if (this.value === 'Remoto') {
        ubicacionInput.value = 'Remoto';
        ubicacionInput.setAttribute('readonly', true);
    } else {
        if (ubicacionInput.value === 'Remoto') {
            ubicacionInput.value = '';
        }
        ubicacionInput.removeAttribute('readonly');
    }
});

// Manejar el envío del formulario
formCrearOferta.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Obtener botón de envío
    const btnSubmit = this.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.textContent;

    try {
        // Deshabilitar botón y mostrar estado de carga
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Guardando...';

        // Validar salarios
        const salarioMin = parseFloat(document.getElementById('salarioMin').value);
        const salarioMax = parseFloat(document.getElementById('salarioMax').value);

        if (salarioMin > salarioMax) {
            throw new Error('El salario mínimo no puede ser mayor que el salario máximo');
        }

        // Crear objeto de oferta
        const ofertaData = {
            titulo: document.getElementById('titulo').value.trim(),
            empresa: document.getElementById('empresa').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            responsabilidades: document.getElementById('responsabilidades').value.trim(),
            requisitos: document.getElementById('requisitos').value.trim(),
            modalidad: document.getElementById('modalidad').value,
            ubicacion: document.getElementById('ubicacion').value.trim(),
            tipoContrato: document.getElementById('tipoContrato').value,
            salarioMin: salarioMin,
            salarioMax: salarioMax
        };

        // Guardar usando el servicio (funciona con localStorage o API)
        const ofertaCreada = await ofertasService.crearOferta(ofertaData);

        // Mostrar mensaje de éxito
        mostrarMensaje('¡Oferta creada exitosamente!', 'success');

        // Limpiar formulario
        formCrearOferta.reset();

        // Opcional: Redirigir a buscar empleo después de 2 segundos
        setTimeout(() => {
            const irABuscar = confirm('¿Deseas ver todas las ofertas?');
            if (irABuscar) {
                window.location.href = 'buscar-empleo.html';
            }
        }, 1500);

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(`Error: ${error.message}`, 'error');
    } finally {
        // Rehabilitar botón
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginal;
    }
});

// Función para mostrar mensajes
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
    mensaje.style.display = 'block';

    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 5000);
}

// Validación en tiempo real
document.querySelectorAll('input[required], select[required], textarea[required]').forEach(campo => {
    campo.addEventListener('blur', function() {
        if (!this.value.trim()) {
            this.style.borderColor = 'var(--color-danger)';
        } else {
            this.style.borderColor = 'var(--color-success)';
        }
    });

    campo.addEventListener('input', function() {
        if (this.value.trim()) {
            this.style.borderColor = 'var(--color-border)';
        }
    });
});
// Obtener elementos del DOM
const contenidoOferta = document.getElementById('contenidoOferta');
const noEncontrada = document.getElementById('noEncontrada');

// Obtener el ID de la oferta desde la URL (se soporta ?id= y también rutas tipo /ofertas/6)
const urlParams = new URLSearchParams(window.location.search);
let idOferta = parseInt(urlParams.get('id'));
if (!idOferta) {
    // Intentar extraer el id desde la ruta: /ofertas/6
    try {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1];
        const maybeId = parseInt(lastPart);
        if (!isNaN(maybeId)) idOferta = maybeId;
    } catch (e) {
        // noop
    }
}

// Cargar la oferta al iniciar
window.addEventListener('DOMContentLoaded', async function() {
    await cargarDetalleOferta();
});

// Función para cargar y mostrar el detalle de la oferta
async function cargarDetalleOferta() {
    if (!idOferta) {
        mostrarOfertaNoEncontrada();
        return;
    }

    try {
        mostrarCargando(true);

        // Obtener oferta usando el servicio (funciona con localStorage o API)
        const oferta = await ofertasService.obtenerOfertaPorId(idOferta);

        if (!oferta) {
            mostrarOfertaNoEncontrada();
            return;
        }

        mostrarDetalleOferta(oferta);

    } catch (error) {
        console.error('Error al cargar oferta:', error);
        mostrarError('No se pudo cargar el detalle de la oferta. Por favor, intenta de nuevo.');
    } finally {
        mostrarCargando(false);
    }
}

// Función para mostrar estado de carga
function mostrarCargando(mostrar) {
    if (mostrar) {
        contenidoOferta.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--color-text-light);">Cargando detalle...</p>';
        contenidoOferta.style.display = 'block';
        noEncontrada.style.display = 'none';
    }
}

// Función para mostrar errores
function mostrarError(mensaje) {
    contenidoOferta.innerHTML = `
        <div class="no-results">
            <p>${mensaje}</p>
            <button onclick="location.reload()" class="btn btn-primary">Reintentar</button>
            <a href="buscar-empleo.html" class="btn btn-secondary">Volver a búsqueda</a>
        </div>
    `;
    contenidoOferta.style.display = 'block';
    noEncontrada.style.display = 'none';
} // Función para mostrar mensaje de oferta no encontrada
function mostrarOfertaNoEncontrada() {
    contenidoOferta.style.display = 'none';
    noEncontrada.style.display = 'block';
}

// Función para mostrar el detalle completo de la oferta
function mostrarDetalleOferta(oferta) {
    contenidoOferta.style.display = 'block';
    noEncontrada.style.display = 'none';

    contenidoOferta.innerHTML = `
        <div class="detalle-header">
            <h2 class="detalle-title">${oferta.titulo}</h2>
            <div class="detalle-empresa">${oferta.empresa}</div>
            
            <div class="detalle-tags">
                <span class="tag">${oferta.ubicacion}</span>
                <span class="tag">${oferta.modalidad}</span>
                <span class="tag">${oferta.tipoContrato}</span>
            </div>
            
            <div class="detalle-salario">
                $${formatearNumero(oferta.salarioMin)} - $${formatearNumero(oferta.salarioMax)}
            </div>
        </div>
        
        <div class="detalle-section">
            <h3>Descripción</h3>
            <p>${oferta.descripcion}</p>
        </div>
        
        <div class="detalle-section">
            <h3>Responsabilidades</h3>
            <p>${oferta.responsabilidades}</p>
        </div>
        
        <div class="detalle-section">
            <h3>Requisitos</h3>
            <p>${oferta.requisitos}</p>
        </div>
        
        <div class="detalle-section">
            <h3>Información Adicional</h3>
            <div class="detalle-tags">
                <span class="tag">Modalidad: ${oferta.modalidad}</span>
                <span class="tag">Contrato: ${oferta.tipoContrato}</span>
                <span class="tag">Ubicación: ${oferta.ubicacion}</span>
            </div>
        </div>
        
        <div class="detalle-actions">
            <button onclick="postularse()" class="btn btn-primary">
                Postularme
            </button>
            <a href="buscar-empleo.html" class="btn btn-secondary">
                ← Volver a búsqueda
            </a>
        </div>
    `;
}

// Función para formatear números con comas
function formatearNumero(numero) {
    return numero.toLocaleString('es-ES');
}

// Función para simular postulación
async function postularse() {
    const btnPostularse = document.querySelector('.detalle-actions .btn-primary');
    const textoOriginal = btnPostularse ? btnPostularse.textContent : 'Postularme';

    try {
        // Obtener la oferta actual
        const oferta = await ofertasService.obtenerOfertaPorId(idOferta);

        if (!oferta) {
            alert('No se pudo encontrar la oferta');
            return;
        }

        const confirmar = confirm(`¿Estás seguro de que deseas postularte a la oferta "${oferta.titulo}"?`);

        if (!confirmar) return;

        // Deshabilitar botón
        if (btnPostularse) {
            btnPostularse.disabled = true;
            btnPostularse.textContent = 'Procesando...';
        }

        // Registrar postulación usando el servicio
        await ofertasService.registrarPostulacion(oferta.id, {});

        alert(`¡Postulación exitosa!\n\nTe has postulado a: ${oferta.titulo}\nEmpresa: ${oferta.empresa}\n\n¡Te contactaremos pronto!`);

        // Actualizar botón
        if (btnPostularse) {
            btnPostularse.textContent = 'Ya te postulaste';
            btnPostularse.disabled = true;
        }

    } catch (error) {
        console.error('Error al postularse:', error);
        alert(`Error: ${error.message}`);

        // Rehabilitar botón en caso de error
        if (btnPostularse) {
            btnPostularse.disabled = false;
            btnPostularse.textContent = textoOriginal;
        }
    }
}
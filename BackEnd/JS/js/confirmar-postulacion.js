// URL base de la API
const API_URL = "http://localhost:8000";

// Obtener elementos del DOM
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const success = document.getElementById('success');
const successMessage = document.getElementById('successMessage');
const confirmacionCard = document.getElementById('confirmacionCard');
const btnConfirmar = document.getElementById('btnConfirmar');
const btnCancelar = document.getElementById('btnCancelar');

// Obtener el ID de la oferta desde la URL
const urlParams = new URLSearchParams(window.location.search);
const ofertaId = urlParams.get('ofertaId');

// Variables globales
let ofertaData = null;

// Cargar información de la oferta al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que el usuario esté logueado
    const session = JSON.parse(localStorage.getItem("session"));
    
    if (!session) {
        mostrarError('No estás logueado. Por favor, inicia sesión primero.');
        return;
    }
    
    if (session.rol !== 'buscador') {
        mostrarError('Solo los usuarios (buscadores de empleo) pueden postularse a ofertas.');
        return;
    }
    
    if (!ofertaId) {
        mostrarError('No se proporcionó un ID de oferta válido.');
        return;
    }
    
    await cargarInformacionOferta(ofertaId);
});

// Función para cargar información de la oferta
async function cargarInformacionOferta(ofertaId) {
    try {
        mostrarCargando(true);
        
        const response = await fetch(`${API_URL}/api/ofertas/${ofertaId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('La oferta solicitada no existe o no está disponible.');
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        ofertaData = await response.json();
        
        mostrarCargando(false);
        mostrarConfirmacion(ofertaData);
        
    } catch (error) {
        console.error('Error al cargar la oferta:', error);
        mostrarError(error.message || 'No se pudo cargar la información de la oferta. Por favor, intenta de nuevo.');
    }
}

// Función para mostrar estado de carga
function mostrarCargando(mostrar) {
    loading.style.display = mostrar ? 'block' : 'none';
    error.style.display = 'none';
    success.style.display = 'none';
    confirmacionCard.style.display = 'none';
}

// Función para mostrar error
function mostrarError(mensaje) {
    loading.style.display = 'none';
    error.style.display = 'block';
    success.style.display = 'none';
    confirmacionCard.style.display = 'none';
    errorMessage.textContent = mensaje;
}

// Función para mostrar confirmación
function mostrarConfirmacion(oferta) {
    loading.style.display = 'none';
    error.style.display = 'none';
    success.style.display = 'none';
    confirmacionCard.style.display = 'block';
    
    // Llenar información de la oferta
    document.getElementById('ofertaTitulo').textContent = oferta.titulo || 'Sin título';
    document.getElementById('ofertaDescripcion').textContent = oferta.descripcion || 'Sin descripción';
    document.getElementById('ofertaEmpresa').textContent = oferta.empresa || 'No especificado';
    document.getElementById('ofertaUbicacion').textContent = oferta.ubicacion || 'No especificado';
    
    // Formatear salario
    let salarioTexto = 'No especificado';
    if (oferta.salario_min && oferta.salario_max) {
        salarioTexto = `$${formatearNumero(oferta.salario_min)} - $${formatearNumero(oferta.salario_max)}`;
    } else if (oferta.salario_min) {
        salarioTexto = `Desde $${formatearNumero(oferta.salario_min)}`;
    }
    document.getElementById('ofertaSalario').textContent = salarioTexto;
    
    // Event listeners para los botones
    btnConfirmar.onclick = () => confirmarPostulacion(ofertaId);
    btnCancelar.onclick = () => cancelarPostulacion();
}

// Función para formatear números con comas
function formatearNumero(numero) {
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Función para confirmar la postulación
async function confirmarPostulacion(ofertaId) {
    try {
        // Obtener sesión del usuario
        const session = JSON.parse(localStorage.getItem("session"));
        
        if (!session || session.rol !== 'buscador') {
            mostrarError('No tienes permisos para postularte a esta oferta.');
            return;
        }
        
        // Deshabilitar botones durante la postulación
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Postulando...';
        btnCancelar.disabled = true;
        
        // Realizar la postulación
        const response = await fetch(`${API_URL}/api/postulaciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: session.user_id,
                oferta_id: parseInt(ofertaId)
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Error al postularse a la oferta');
        }
        
        // Mostrar mensaje de éxito
        mostrarExito(data);
        
    } catch (error) {
        console.error('Error al postularse:', error);
        mostrarError(error.message || 'No se pudo completar la postulación. Por favor, intenta de nuevo.');
        
        // Rehabilitar botones
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i class="fas fa-check"></i> Sí, Postularme';
        btnCancelar.disabled = false;
    }
}

// Función para mostrar éxito
function mostrarExito(data) {
    loading.style.display = 'none';
    error.style.display = 'none';
    confirmacionCard.style.display = 'none';
    success.style.display = 'block';
    
    if (data.ya_postulado) {
        successMessage.innerHTML = `
            <strong>Ya estabas postulado a la oferta "${data.oferta_titulo || 'esta oferta'}".</strong><br>
            Serás redirigido a tu perfil en unos momentos...
        `;
    } else {
        successMessage.innerHTML = `
            <strong>¡Postulación exitosa a la oferta "${data.oferta_titulo || 'esta oferta'}"!</strong><br>
            Empresa: ${data.empresa || 'N/A'}<br>
            Serás redirigido a tu perfil en unos momentos...
        `;
    }
    
    // Redirigir a mi-perfil.html después de 3 segundos
    setTimeout(() => {
        window.location.href = '/Sprint1/FrontEnd/templates/html/mi-perfil.html';
    }, 3000);
}

// Función para cancelar postulación
function cancelarPostulacion() {
    if (ofertaId) {
        window.location.href = `/Sprint1/FrontEnd/templates/html/detalle-oferta.html?id=${ofertaId}`;
    } else {
        window.location.href = '/Sprint1/FrontEnd/templates/html/ofertas.html';
    }
}


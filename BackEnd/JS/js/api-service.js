// ============================================
// CONFIGURACIÓN DE LA API
// ============================================

const API_CONFIG = {
    // Cambiar a true cuando tengas backend
    USE_API: true, // ✅ Cambiado a true para usar el backend

    // URL base de tu API (FastAPI corre en puerto 8000 por defecto)
    BASE_URL: 'http://127.0.0.1:8000',

    // Endpoints
    ENDPOINTS: {
        OFERTAS: '/api/ofertas',
        OFERTA_BY_ID: (id) => `/api/ofertas/${id}`,
        POSTULACIONES: '/api/postulaciones'
    },

    // Timeout para peticiones
    TIMEOUT: 10000
};

// ============================================
// SERVICIO DE DATOS (DATA SERVICE)
// ============================================

class OfertasService {
    constructor() {
        this.useAPI = API_CONFIG.USE_API;
        this.baseURL = API_CONFIG.BASE_URL;
    }

    // ========== OBTENER TODAS LAS OFERTAS ==========
    async obtenerTodasLasOfertas() {
        try {
            if (this.useAPI) {
                // Modo API (Backend)
                const response = await this._fetchWithTimeout(
                    `${this.baseURL}${API_CONFIG.ENDPOINTS.OFERTAS}`
                );

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                const data = await response.json();
                // Mapear campos del backend al formato esperado por el frontend
                const ofertas = (data.ofertas || data).map(oferta => ({
                    ...oferta,
                    responsabilidades: oferta.funciones || oferta.responsabilidades || 'No especificado'
                }));
                return ofertas;
            } else {
                // Modo LocalStorage (Sin Backend)
                return this._getFromLocalStorage();
            }
        } catch (error) {
            console.error('Error al obtener ofertas:', error);
            throw new Error('No se pudieron cargar las ofertas. Intenta de nuevo.');
        }
    }

    // ========== OBTENER OFERTA POR ID ==========
    async obtenerOfertaPorId(id) {
        try {
            if (this.useAPI) {
                // Modo API
                const response = await this._fetchWithTimeout(
                    `${this.baseURL}${API_CONFIG.ENDPOINTS.OFERTA_BY_ID(id)}`
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        return null;
                    }
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                const oferta = await response.json();
                // Asegurar que el campo responsabilidades esté presente
                return {
                    ...oferta,
                    responsabilidades: oferta.responsabilidades || oferta.funciones || 'No especificado'
                };
            } else {
                // Modo LocalStorage
                const ofertas = this._getFromLocalStorage();
                return ofertas.find(oferta => oferta.id === parseInt(id));
            }
        } catch (error) {
            console.error('Error al obtener oferta:', error);
            throw new Error('No se pudo cargar la oferta. Intenta de nuevo.');
        }
    }

    // ========== CREAR NUEVA OFERTA ==========
    async crearOferta(ofertaData) {
        try {
            if (this.useAPI) {
                // Modo API
                const response = await this._fetchWithTimeout(
                    `${this.baseURL}${API_CONFIG.ENDPOINTS.OFERTAS}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(ofertaData)
                    }
                );

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                const data = await response.json();
                return data.oferta || data;
            } else {
                // Modo LocalStorage
                const nuevaOferta = {
                    ...ofertaData,
                    id: Date.now(), // ID temporal (el backend debe generar el real)
                    fechaCreacion: new Date().toISOString()
                };

                const ofertas = this._getFromLocalStorage();
                ofertas.push(nuevaOferta);
                this._saveToLocalStorage(ofertas);

                return nuevaOferta;
            }
        } catch (error) {
            console.error('Error al crear oferta:', error);
            throw new Error('No se pudo crear la oferta. Intenta de nuevo.');
        }
    }

    // ========== ACTUALIZAR OFERTA ==========
    async actualizarOferta(id, ofertaData) {
        try {
            if (this.useAPI) {
                // Modo API
                const response = await this._fetchWithTimeout(
                    `${this.baseURL}${API_CONFIG.ENDPOINTS.OFERTA_BY_ID(id)}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(ofertaData)
                    }
                );

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                const data = await response.json();
                return data.oferta || data;
            } else {
                // Modo LocalStorage
                const ofertas = this._getFromLocalStorage();
                const index = ofertas.findIndex(o => o.id === parseInt(id));

                if (index === -1) {
                    throw new Error('Oferta no encontrada');
                }

                ofertas[index] = {...ofertas[index], ...ofertaData };
                this._saveToLocalStorage(ofertas);

                return ofertas[index];
            }
        } catch (error) {
            console.error('Error al actualizar oferta:', error);
            throw new Error('No se pudo actualizar la oferta. Intenta de nuevo.');
        }
    }

    // ========== ELIMINAR OFERTA ==========
    async eliminarOferta(id) {
        try {
            if (this.useAPI) {
                // Modo API
                const response = await this._fetchWithTimeout(
                    `${this.baseURL}${API_CONFIG.ENDPOINTS.OFERTA_BY_ID(id)}`, {
                        method: 'DELETE'
                    }
                );

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                return true;
            } else {
                // Modo LocalStorage
                const ofertas = this._getFromLocalStorage();
                const ofertasFiltradas = ofertas.filter(o => o.id !== parseInt(id));
                this._saveToLocalStorage(ofertasFiltradas);

                return true;
            }
        } catch (error) {
            console.error('Error al eliminar oferta:', error);
            throw new Error('No se pudo eliminar la oferta. Intenta de nuevo.');
        }
    }

    // ========== REGISTRAR POSTULACIÓN ==========
    async registrarPostulacion(ofertaId, datosPostulante = {}) {
        try {
            if (this.useAPI) {
                // Obtener usuario_id de la sesión
                const session = JSON.parse(localStorage.getItem("session"));
                if (!session || !session.user_id) {
                    throw new Error('No estás logueado. Por favor, inicia sesión primero.');
                }

                // Modo API - el backend espera usuario_id y oferta_id
                const response = await this._fetchWithTimeout(
                    `${this.baseURL}${API_CONFIG.ENDPOINTS.POSTULACIONES}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            usuario_id: session.user_id,
                            oferta_id: ofertaId
                        })
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Error HTTP: ${response.status}`);
                }

                const data = await response.json();
                return data;
            } else {
                // Modo LocalStorage
                const oferta = await this.obtenerOfertaPorId(ofertaId);

                if (!oferta) {
                    throw new Error('Oferta no encontrada');
                }

                const postulacion = {
                    id: Date.now(),
                    ofertaId: oferta.id,
                    tituloOferta: oferta.titulo,
                    empresa: oferta.empresa,
                    fecha: new Date().toISOString(),
                    ...datosPostulante
                };

                // Guardar en localStorage
                let postulaciones = localStorage.getItem('postulaciones');
                postulaciones = postulaciones ? JSON.parse(postulaciones) : [];
                postulaciones.push(postulacion);
                localStorage.setItem('postulaciones', JSON.stringify(postulaciones));

                return postulacion;
            }
        } catch (error) {
            console.error('Error al registrar postulación:', error);
            throw error; // Lanzar el error original para mejor manejo
        }
    }

    // ========== MÉTODOS PRIVADOS ==========

    // Obtener datos de localStorage
    _getFromLocalStorage() {
        const ofertas = localStorage.getItem('ofertas');
        return ofertas ? JSON.parse(ofertas) : [];
    }

    // Guardar datos en localStorage
    _saveToLocalStorage(ofertas) {
        localStorage.setItem('ofertas', JSON.stringify(ofertas));
    }

    // Fetch con timeout
    async _fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('La petición tardó demasiado. Verifica tu conexión.');
            }
            throw error;
        }
    }
}

// ============================================
// UTILIDADES
// ============================================

// Formatear números con separador de miles
function formatearNumero(numero) {
    return numero.toLocaleString('es-ES');
}

// Validar email
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Sanitizar HTML para prevenir XSS
function sanitizarHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// Debounce para búsquedas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// EXPORTAR SERVICIO (Singleton)
// ============================================

const ofertasService = new OfertasService();

// Para usar en otros archivos:
// <script src="../js/api-service.js"></script>
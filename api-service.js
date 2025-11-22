// ============================================
// CONFIGURACIÃN DE LA API
// ============================================

const API_CONFIG = {
    // Cambiar a true cuando tengas backend
    USE_API: false,

    // URL base de tu API (cambiar cuando tengas backend)
    BASE_URL: 'http://localhost:3000/api',

    // Endpoints
    ENDPOINTS: {
        OFERTAS: '/ofertas',
        OFERTA_BY_ID: (id) => `/ofertas/${id}`,
        POSTULACIONES: '/postulaciones'
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
                return data.ofertas || data; // Adaptar segÃºn respuesta del backend
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

                const data = await response.json();
                return data.oferta || data;
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

    // ========== REGISTRAR POSTULACIÃN ==========
    async registrarPostulacion(ofertaId, datosPostulante = {}) {
        try {
            if (this.useAPI) {
                // Modo API
                const response = await this._fetchWithTimeout(
                    `${this.baseURL}${API_CONFIG.ENDPOINTS.POSTULACIONES}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ofertaId,
                            ...datosPostulante,
                            fecha: new Date().toISOString()
                        })
                    }
                );

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                const data = await response.json();
                return data.postulacion || data;
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
            console.error('Error al registrar postulaciÃ³n:', error);
            throw new Error('No se pudo registrar la postulaciÃ³n. Intenta de nuevo.');
        }
    }

    // ========== MÃTODOS PRIVADOS ==========

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
                throw new Error('La peticiÃ³n tardÃ³ demasiado. Verifica tu conexiÃ³n.');
            }
            throw error;
        }
    }
}

// ============================================
// UTILIDADES
// ============================================

// Formatear nÃºmeros con separador de miles
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

// Debounce para bÃºsquedas
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

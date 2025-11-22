class PostulacionesManager {
    constructor() {
        this.postulaciones = [];
        this.currentPostulacion = null;
        this.apiBaseUrl = 'http://localhost:8000';
        
        this.init();
    }

    async init() {
        await this.loadPostulaciones();
        this.setupEventListeners();
        this.renderPostulaciones();
    }

    setupEventListeners() {
        // Filtro de estado
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterPostulaciones(e.target.value);
        });

        // Botón cancelar postulación
        document.addEventListener('click', (e) => {
            if (e.target.closest('#cancelPostulacion')) {
                this.cancelPostulacion();
            }
        });
    }

    async loadPostulaciones() {
        try {
            // Intentar obtener postulaciones del backend (usa cookie user_id o sesión)
            const resp = await fetch('/api/postulaciones');
            if (resp.ok) {
                const json = await resp.json();
                // API devuelve { postulaciones: [...], total: N }
                this.postulaciones = json.postulaciones || [];
            } else {
                console.warn('Backend /api/postulaciones respondió con', resp.status);
                this.postulaciones = [];
            }

            // Si no obtuvimos postulaciones desde el backend, mantener datos de ejemplo
            if (!this.postulaciones || !this.postulaciones.length) {
                this.postulaciones = [
                {
                    id: 1,
                    usuario_id: 1,
                    oferta_id: 101,
                    empresa: "GESTION COMPETITIVA SAS",
                    puesto: "Programador de software",
                    descripcion: "Desarrollo de aplicaciones web y móviles",
                    estado_actual: "Registrada",
                    fecha_creacion: "2025-10-20T10:30:00",
                    fecha_actualizacion: "2025-10-20T10:30:00",
                    salario: "$2,5 a $3 millones",
                    ubicacion: "Bogotá",
                    tags: ["programador web", "ingeniería de software"],
                    historial: [
                        {
                            id: 1,
                    }
                            estado_nuevo: "Registrada",
                            fecha_cambio: "2025-10-20T10:30:00",
                            usuario_cambio: "sistema"
                        }
                    ]
                },
                {
                    id: 2,
                    usuario_id: 1,
                    oferta_id: 102,
                    empresa: "TECH SOLUTIONS COLOMBIA",
                    puesto: "Desarrollador Frontend",
                    descripcion: "Desarrollo de interfaces de usuario",
                    estado_actual: "En progreso",
                    fecha_creacion: "2025-10-18T14:20:00",
                    fecha_actualizacion: "2025-10-19T09:15:00",
                    salario: "$3 a $3,5 millones",
                    ubicacion: "Medellín",
                    tags: ["react", "javascript", "frontend"],
                    historial: [
                        {
                            id: 2,
                            estado_anterior: null,
                            estado_nuevo: "Registrada",
                            fecha_cambio: "2025-10-18T14:20:00",
                            usuario_cambio: "sistema"
                        },
                        {
                            id: 3,
                            estado_anterior: "Registrada",
                            estado_nuevo: "En progreso",
                            fecha_cambio: "2025-10-19T09:15:00",
                            usuario_cambio: "empresa"
                        }
                    ]
                },
                {
                    id: 3,
                    usuario_id: 1,
                    oferta_id: 103,
                    empresa: "DATA ANALYTICS SA",
                    puesto: "Analista de Datos",
                    descripcion: "Análisis de datos empresariales",
                    estado_actual: "Aprobada",
                    fecha_creacion: "2025-10-15T08:45:00",
                    fecha_actualizacion: "2025-10-17T16:30:00",
                    salario: "$2,8 a $3,2 millones",
                    ubicacion: "Cali",
                    tags: ["python", "sql", "analytics"],
                    historial: [
                        {
                            id: 4,
                            estado_anterior: null,
                            estado_nuevo: "Registrada",
                            fecha_cambio: "2025-10-15T08:45:00",
                            usuario_cambio: "sistema"
                        },
                        {
                            id: 5,
                            estado_anterior: "Registrada",
                            estado_nuevo: "En progreso",
                            fecha_cambio: "2025-10-16T11:20:00",
                            usuario_cambio: "empresa"
                        },
                        {
                            id: 6,
                            estado_anterior: "En progreso",
                            estado_nuevo: "Aprobada",
                            fecha_cambio: "2025-10-17T16:30:00",
                            usuario_cambio: "empresa"
                        }
                    ]
                }
            ];
            
            this.updateStats();
            
        } catch (error) {
            console.error('Error cargando postulaciones:', error);
        }
    }

    renderPostulaciones() {
        const container = document.getElementById('postulacionesContainer');
        const template = document.getElementById('postulacionTemplate');
        
        container.innerHTML = '';
        
        this.postulaciones.forEach(postulacion => {
            const card = template.content.cloneNode(true);
            const cardElement = card.querySelector('.postulacion-card');
            
            cardElement.dataset.id = postulacion.id;
            
            // Llenar datos
            card.querySelector('.puesto-title').textContent = postulacion.puesto;
            card.querySelector('.fecha-postulacion').textContent = 
                `Postulado: ${this.formatDate(postulacion.fecha_creacion)}`;
            card.querySelector('.empresa-nombre').textContent = postulacion.empresa;
            card.querySelector('.empresa-ubicacion').innerHTML = 
                `<i class="fas fa-map-marker-alt"></i>${postulacion.ubicacion}`;
            card.querySelector('.salario').textContent = postulacion.salario;
            
            // Tags
            const tagsContainer = card.querySelector('.postulacion-tags');
            tagsContainer.innerHTML = '';
            postulacion.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
            
            // Estado
            const statusBadge = card.querySelector('.status-badge');
            statusBadge.dataset.status = postulacion.estado_actual.toLowerCase();
            statusBadge.textContent = postulacion.estado_actual;
            
            // Event listener para selección
            cardElement.addEventListener('click', () => {
                this.selectPostulacion(postulacion);
            });
            
            container.appendChild(card);
        });
    }

    selectPostulacion(postulacion) {
        // Remover clase active de todas las tarjetas
        document.querySelectorAll('.postulacion-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Agregar clase active a la tarjeta seleccionada
        const selectedCard = document.querySelector(`[data-id="${postulacion.id}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
        
        this.currentPostulacion = postulacion;
        this.showStatusPanel(postulacion);
    }

    showStatusPanel(postulacion) {
        const statusContent = document.getElementById('statusContent');
        const template = document.getElementById('statusPanelTemplate');
        
        statusContent.innerHTML = '';
        const panel = template.content.cloneNode(true);
        
        // Llenar datos básicos
        panel.querySelector('.detalle-empresa').textContent = postulacion.empresa;
        panel.querySelector('.detalle-puesto').textContent = postulacion.puesto;
        panel.querySelector('.detalle-ubicacion').textContent = postulacion.ubicacion;
        panel.querySelector('.detalle-salario').textContent = postulacion.salario;
        panel.querySelector('.detalle-fecha').textContent = this.formatDate(postulacion.fecha_creacion);
        
        // Estado actual
        const statusBadge = panel.querySelector('.status-badge.large');
        statusBadge.dataset.status = postulacion.estado_actual.toLowerCase();
        statusBadge.textContent = postulacion.estado_actual;
        panel.querySelector('.status-date').textContent = 
            `Actualizado: ${this.formatDate(postulacion.fecha_actualizacion)}`;
        
        // Mostrar/ocultar botón cancelar
        const cancelBtn = panel.querySelector('#cancelPostulacion');
        if (['Registrada', 'En progreso'].includes(postulacion.estado_actual)) {
            cancelBtn.style.display = 'flex';
        }
        
        // Timeline
        const timeline = panel.querySelector('.timeline');
        this.renderTimeline(postulacion.historial, timeline);
        
        // Mostrar panel
        const statusDetails = panel.querySelector('.status-details');
        statusDetails.style.display = 'block';
        
        statusContent.appendChild(panel);
    }

    renderTimeline(historial, container) {
        const template = document.getElementById('timelineEventTemplate');
        container.innerHTML = '';
        
        // Ordenar historial por fecha (más reciente primero)
        const sortedHistorial = [...historial].sort((a, b) => 
            new Date(b.fecha_cambio) - new Date(a.fecha_cambio)
        );
        
        sortedHistorial.forEach((evento, index) => {
            const eventElement = template.content.cloneNode(true);
            const timelineEvent = eventElement.querySelector('.timeline-event');
            
            // Marcar el último evento
            if (index === 0) {
                timelineEvent.querySelector('.timeline-marker').style.backgroundColor = 'var(--primary-color)';
                timelineEvent.querySelector('.timeline-marker').style.borderColor = 'var(--primary-color)';
            }
            
            // Estado
            const statusBadge = eventElement.querySelector('.status-badge');
            statusBadge.dataset.status = evento.estado_nuevo.toLowerCase();
            statusBadge.textContent = evento.estado_nuevo;
            
            // Descripción
            const descElement = eventElement.querySelector('.timeline-desc');
            if (evento.estado_anterior) {
                descElement.textContent = 
                    `Cambio de ${evento.estado_anterior} a ${evento.estado_nuevo}`;
            } else {
                descElement.textContent = `Postulación ${evento.estado_nuevo.toLowerCase()}`;
            }
            
            // Fecha
            eventElement.querySelector('.timeline-date').textContent = 
                `${this.formatDate(evento.fecha_cambio)} - ${this.formatTime(evento.fecha_cambio)}`;
            
            container.appendChild(eventElement);
        });
    }

    async cancelPostulacion() {
        if (!this.currentPostulacion) return;
        
        if (!confirm('¿Estás seguro de que quieres cancelar esta postulación?')) {
            return;
        }
        
        try {
            // Intentar cancelar mediante la API
            try {
                await fetch(`/api/postulaciones/${this.currentPostulacion.id}/cambiar-estado`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nuevo_estado: 'Cancelada', usuario: 'usuario' })
                });
            } catch (e) {
                console.warn('No se pudo notificar al backend, aplicando cambio local sólo', e);
            }
            
            // Simular cambio local
            this.currentPostulacion.estado_actual = 'Cancelada';
            this.currentPostulacion.fecha_actualizacion = new Date().toISOString();
            
            // Agregar al historial
            this.currentPostulacion.historial.push({
                estado_anterior: this.currentPostulacion.estado_actual,
                estado_nuevo: 'Cancelada',
                fecha_cambio: new Date().toISOString(),
                usuario_cambio: 'usuario'
            });
            
            // Actualizar UI
            this.renderPostulaciones();
            this.selectPostulacion(this.currentPostulacion);
            this.updateStats();
            
            alert('Postulación cancelada exitosamente');
            
        } catch (error) {
            console.error('Error cancelando postulación:', error);
            alert('Error al cancelar la postulación');
        }
    }

    filterPostulaciones(status) {
        const cards = document.querySelectorAll('.postulacion-card');
        
        cards.forEach(card => {
            if (status === 'all') {
                card.style.display = 'block';
            } else {
                const cardStatus = card.querySelector('.status-badge').textContent;
                card.style.display = cardStatus === status ? 'block' : 'none';
            }
        });
        
        this.updateStats();
    }

    updateStats() {
        const totalCount = document.getElementById('totalCount');
        totalCount.textContent = this.postulaciones.length;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PostulacionesManager();
});
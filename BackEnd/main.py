from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import sqlite3
import json
from datetime import datetime
#from BackEnd.models.models import Postulacion, PostulacionCreate, CambioEstadoRequest, EstadoPostulacion

app = FastAPI(title="Sistema de Postulaciones CEO")

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# (Static files mounting will be configured after BASE_DIR is defined)


# Ruta absoluta a la base de datos para evitar que se creen archivos en otros directorios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv("CEO_DB_PATH", os.path.join(BASE_DIR, "CEO.db"))

# --- Servir archivos estáticos / HTML del FrontEnd y del propio BackEnd ---
# Project root (para que las rutas absolutas como /Sprint1/FrontEnd/... funcionen)
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, os.pardir))
FRONTEND_HTML_DIR = os.path.abspath(os.path.join(PROJECT_ROOT, "FrontEnd", "templates", "html"))

# Montar el proyecto (para que referencias absolutas en los HTML funcionen)
if os.path.isdir(PROJECT_ROOT):
    app.mount("/Sprint1", StaticFiles(directory=PROJECT_ROOT), name="sprint1")

# Montar la carpeta FrontEnd directamente para soportar referencias que usan `/FrontEnd/...`
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "FrontEnd")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/FrontEnd", StaticFiles(directory=FRONTEND_DIR), name="frontend_static")

# Montar el BackEnd para referencias relativas a BackEnd (p. ej. /BackEnd/JS/...)
app.mount("/BackEnd", StaticFiles(directory=BASE_DIR), name="backend_static")


# ================================
# Modelos Pydantic (request bodies)
# ================================

class OfertaCreate(BaseModel):
    empresa_id: int
    titulo: str
    descripcion: str
    funciones: Optional[str] = None
    requisitos: Optional[str] = None
    habilidades_requeridas: Optional[Any] = None  # Puede venir como lista o str
    ubicacion: Optional[str] = None
    modalidad: Optional[str] = None  # presencial|remoto|hibrido
    tipo_contrato: Optional[str] = None
    jornada: Optional[str] = None
    salario_min: Optional[float] = None
    salario_max: Optional[float] = None
    fecha_cierre: Optional[str] = None

    class Config:
        extra = "ignore"  # Ignorar campos adicionales como 'empresa', camelCase duplicados, etc.


class CambioEstadoRequest(BaseModel):
    nuevo_estado: str
    usuario: Optional[str] = "usuario"  # 'usuario' | 'empresa' | 'sistema'
    observaciones: Optional[str] = None


@app.get("/")
def inicio():
    # Servir la página de login por defecto si existe
    login_path = os.path.join(FRONTEND_HTML_DIR, "login-app.html")
    if os.path.exists(login_path):
        return FileResponse(login_path, media_type="text/html")
    return {"mensaje": "Hi Class! - login no encontrado"}


@app.get('/ofertas/{oferta_id}')
def oferta_detalle_page(oferta_id: int):
    """Sirve la página estática `detalle-oferta.html` para rutas tipo `/ofertas/6`.
    El JS en la página se encargará de solicitar `/api/ofertas/{id}` para cargar datos.
    """
    detalle_path = os.path.join(FRONTEND_HTML_DIR, "detalle-oferta.html")
    if os.path.exists(detalle_path):
        return FileResponse(detalle_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página de detalle no encontrada")




@app.get("/create-db/")
def create_db():

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Tabla de usuarios (buscadores de empleo)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                nombre TEXT NOT NULL,
                tipo_usuario TEXT CHECK(tipo_usuario IN ('buscador', 'empresa')) NOT NULL,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                activo BOOLEAN DEFAULT 1
            )
        ''')
        
        # Tabla de perfiles de buscadores de empleo
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS perfiles_buscadores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                identidad_genero TEXT,
                condicion_discapacidad TEXT,
                informacion_academica TEXT,
                experiencia_laboral TEXT,
                habilidades TEXT,  -- JSON con lista de habilidades
                cv_filename TEXT,
                fecha_nacimiento DATE,
                telefono TEXT,
                ubicacion TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
            )
        ''')
        
        # Tabla de empresas/empleadores
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS empresas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                razon_social TEXT NOT NULL,
                nit TEXT UNIQUE NOT NULL,
                rut TEXT,
                sector TEXT,
                direccion TEXT,
                telefono TEXT,
                sitio_web TEXT,
                redes_sociales TEXT,  -- JSON con enlaces
                actividad_economica TEXT,
                tamano_empresa TEXT,
                verificada BOOLEAN DEFAULT 0,
                fecha_verificacion DATETIME,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
            )
        ''')
        
        # Tabla de ofertas de empleo
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ofertas_empleo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empresa_id INTEGER NOT NULL,
                titulo TEXT NOT NULL,
                descripcion TEXT NOT NULL,
                funciones TEXT,
                requisitos TEXT,
                habilidades_requeridas TEXT,  -- JSON con lista de habilidades
                ubicacion TEXT,
                modalidad TEXT CHECK(modalidad IN ('presencial', 'remoto', 'hibrido')),
                tipo_contrato TEXT,
                jornada TEXT,
                salario_min REAL,
                salario_max REAL,
                fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_cierre DATETIME,
                activa BOOLEAN DEFAULT 1,
                FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE
            )
        ''')
        
        # Tabla de postulaciones (RF3.3, RF3.4, RF3.5)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS postulaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                oferta_id INTEGER NOT NULL,
                empresa TEXT NOT NULL,
                puesto TEXT NOT NULL,
                descripcion TEXT,
                estado_actual TEXT CHECK(estado_actual IN (
                    'Registrada', 'En progreso', 'Aprobada', 'Rechazada', 'Cancelada'
                )) DEFAULT 'Registrada',
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                salario TEXT,
                ubicacion TEXT,
                tags TEXT,  -- JSON con etiquetas
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
                FOREIGN KEY (oferta_id) REFERENCES ofertas_empleo (id) ON DELETE CASCADE
            )
        ''')
        
        # Tabla de historial de estados (RF3.4 - Seguimiento)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historial_estados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                postulacion_id INTEGER NOT NULL,
                estado_anterior TEXT,
                estado_nuevo TEXT NOT NULL,
                fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,
                usuario_cambio TEXT NOT NULL,  -- 'usuario' o 'empresa' o 'sistema'
                observaciones TEXT,
                FOREIGN KEY (postulacion_id) REFERENCES postulaciones (id) ON DELETE CASCADE
            )
        ''')
        
        # Tabla de cursos (RF3.5, RF4.x)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cursos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empresa_id INTEGER NOT NULL,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                objetivos TEXT,
                temario TEXT,
                duracion_estimada INTEGER,  -- en horas
                nivel_dificultad TEXT CHECK(nivel_dificultad IN ('basico', 'intermedio', 'avanzado')),
                formato_contenido TEXT,  -- JSON con tipos de contenido
                visibilidad TEXT CHECK(visibilidad IN ('publico', 'privado')) DEFAULT 'publico',
                oferta_asociada INTEGER,
                fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                activo BOOLEAN DEFAULT 1,
                FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE CASCADE,
                FOREIGN KEY (oferta_asociada) REFERENCES ofertas_empleo (id) ON DELETE SET NULL
            )
        ''')
        
        # Tabla de inscripciones a cursos
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inscripciones_cursos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                curso_id INTEGER NOT NULL,
                fecha_inscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
                progreso REAL DEFAULT 0,  -- 0 a 100
                estado TEXT CHECK(estado IN ('no_iniciado', 'en_progreso', 'completado')) DEFAULT 'no_iniciado',
                fecha_completado DATETIME,
                puntaje_test REAL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
                FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE,
                UNIQUE(usuario_id, curso_id)
            )
        ''')
        
        # Tabla de insignias digitales (RF4.6)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS insignias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                curso_id INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                fecha_obtencion DATETIME DEFAULT CURRENT_TIMESTAMP,
                codigo_verificacion TEXT UNIQUE,
                imagen_url TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
                FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE
            )
        ''')
        
        # Tabla de evaluaciones/post-test (RF4.5)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS evaluaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                curso_id INTEGER NOT NULL,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                preguntas TEXT,  -- JSON con array de preguntas
                puntaje_minimo REAL DEFAULT 60,
                numero_intentos INTEGER DEFAULT 1,
                obligatorio BOOLEAN DEFAULT 1,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                activo BOOLEAN DEFAULT 1,
                FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE
            )
        ''')
        
        
        
        conn.commit()
        conn.close()
        
        return {"message": "Database created successfully", "db_path": DB_PATH}, status.HTTP_201_CREATED
        
    except sqlite3.Error as e:
        return {
            "error": "Error al crear la base de datos",
            "detalle": str(e)
        }, status.HTTP_500_INTERNAL_SERVER_ERROR
    
@app.get("/datos-example/")
def insertar_datos_ejemplo():
    """
    Inserta datos de ejemplo en la base de datos CEO.db para testing
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Insertar usuarios de ejemplo
        cursor.execute('''
            INSERT OR IGNORE INTO usuarios (email, password, nombre, tipo_usuario) 
            VALUES 
            ('buscador1@ejemplo.com', 'password123', 'Ana García', 'buscador'),
            ('buscador2@ejemplo.com', 'password123', 'Carlos Rodríguez', 'buscador'),
            ('empresa1@ejemplo.com', 'password123', 'Tech Solutions SAS', 'empresa'),
            ('empresa2@ejemplo.com', 'password123', 'Innovación Digital Ltda', 'empresa'),
            ('empresa3@ejemplo.com', 'password123', 'Desarrollo Web Colombia', 'empresa')
        ''')
        
        # Insertar empresas de ejemplo
        cursor.execute('''
            INSERT OR IGNORE INTO empresas (usuario_id, razon_social, nit, sector, direccion, telefono, verificada) 
            VALUES 
            (3, 'Tech Solutions SAS', '900123456-1', 'Tecnología', 'Calle 123 #45-67, Bogotá', '6011234567', 1),
            (4, 'Innovación Digital Ltda', '900789012-2', 'Desarrollo Software', 'Av. Siempre Viva 742, Medellín', '6049876543', 1),
            (5, 'Desarrollo Web Colombia', '900345678-3', 'Tecnología', 'Cra 50 #80-10, Cali', '6024567890', 0)
        ''')
        
        # Insertar perfiles de buscadores
        cursor.execute('''
            INSERT OR IGNORE INTO perfiles_buscadores (usuario_id, identidad_genero, informacion_academica, experiencia_laboral, habilidades, telefono, ubicacion) 
            VALUES 
            (1, 'Femenino', 'Ingeniera de Sistemas - Universidad Nacional', '2 años como desarrolladora frontend', '["JavaScript", "React", "CSS", "HTML"]', '3001234567', 'Bogotá'),
            (2, 'Masculino', 'Tecnólogo en Desarrollo de Software - SENA', '1 año como desarrollador fullstack', '["Python", "Django", "PostgreSQL", "JavaScript"]', '3109876543', 'Medellín')
        ''')
        
        # Insertar ofertas de empleo
        cursor.execute('''
            INSERT OR IGNORE INTO ofertas_empleo (empresa_id, titulo, descripcion, funciones, requisitos, habilidades_requeridas, ubicacion, modalidad, tipo_contrato, jornada, salario_min, salario_max) 
            VALUES 
            (1, 'Desarrollador Frontend React', 'Buscamos desarrollador frontend con experiencia en React para unirse a nuestro equipo de innovación.', 'Desarrollar interfaces de usuario, colaborar con equipo backend, optimizar performance', 'Experiencia mínima 1 año en React, conocimientos en JavaScript ES6+', '["React", "JavaScript", "CSS", "HTML", "Git"]', 'Bogotá', 'hibrido', 'Término Indefinido', 'Tiempo Completo', 2800000, 3500000),
            (1, 'Programador de software', 'Desarrollo de aplicaciones web y móviles para clientes internacionales', 'Desarrollar features, escribir tests, participar en code reviews', 'Conocimientos en patrones de diseño, bases de datos, APIs REST', '["Java", "Spring Boot", "SQL", "AWS"]', 'Bogotá', 'remoto', 'Término Indefinido', 'Tiempo Completo', 2500000, 3000000),
            (2, 'Desarrollador FullStack Python', 'Desarrollo de aplicaciones web completas con Django y React', 'Desarrollo backend con Django, frontend con React, deployment en cloud', 'Experiencia con Django REST Framework, React, bases de datos relacionales', '["Python", "Django", "React", "PostgreSQL", "Docker"]', 'Medellín', 'presencial', 'Término Fijo', 'Tiempo Completo', 3000000, 4000000),
            (3, 'Analista de Datos Junior', 'Análisis de datos empresariales y creación de reportes', 'Extraer y analizar datos, crear dashboards, reportes ejecutivos', 'Conocimientos en SQL, Excel, Python para análisis de datos', '["SQL", "Python", "Excel", "Power BI", "Estadística"]', 'Cali', 'hibrido', 'Término Indefinido', 'Medio Tiempo', 1800000, 2200000)
        ''')
        
        # Insertar postulaciones
        cursor.execute('''
            INSERT OR IGNORE INTO postulaciones (usuario_id, oferta_id, empresa, puesto, descripcion, estado_actual, salario, ubicacion, tags) 
            VALUES 
            (1, 1, 'Tech Solutions SAS', 'Desarrollador Frontend React', 'Postulación para puesto de desarrollador frontend con React', 'En progreso', '$2,8 a $3,5 millones', 'Bogotá', '["react", "javascript", "frontend", "desarrollador"]'),
            (1, 2, 'Tech Solutions SAS', 'Programador de software', 'Interesado en el puesto de programador de software', 'Registrada', '$2,5 a $3 millones', 'Bogotá', '["java", "spring", "backend", "programador"]'),
            (2, 3, 'Innovación Digital Ltda', 'Desarrollador FullStack Python', 'Postulación para fullstack developer con Python y Django', 'Aprobada', '$3 a $4 millones', 'Medellín', '["python", "django", "react", "fullstack"]'),
            (2, 1, 'Tech Solutions SAS', 'Desarrollador Frontend React', 'Postulación para puesto frontend', 'Rechazada', '$2,8 a $3,5 millones', 'Bogotá', '["react", "frontend", "javascript"]')
        ''')
        
        # Insertar historial de estados
        cursor.execute('''
            INSERT OR IGNORE INTO historial_estados (postulacion_id, estado_anterior, estado_nuevo, usuario_cambio, observaciones) 
            VALUES 
            (1, NULL, 'Registrada', 'sistema', 'Postulación creada automáticamente'),
            (1, 'Registrada', 'En progreso', 'empresa', 'CV en revisión por el equipo de RH'),
            (2, NULL, 'Registrada', 'sistema', 'Postulación creada automáticamente'),
            (3, NULL, 'Registrada', 'sistema', 'Postulación creada automáticamente'),
            (3, 'Registrada', 'En progreso', 'empresa', 'Candidato pasa a siguiente fase'),
            (3, 'En progreso', 'Aprobada', 'empresa', 'Candidato seleccionado para el puesto'),
            (4, NULL, 'Registrada', 'sistema', 'Postulación creada automáticamente'),
            (4, 'Registrada', 'Rechazada', 'empresa', 'Perfil no coincide con los requisitos del puesto')
        ''')
        
        # Insertar cursos
        cursor.execute('''
            INSERT OR IGNORE INTO cursos (empresa_id, titulo, descripcion, objetivos, temario, duracion_estimada, nivel_dificultad, formato_contenido, visibilidad, oferta_asociada) 
            VALUES 
            (1, 'React desde Cero', 'Curso completo de React para desarrolladores frontend', 'Aprender los fundamentos de React y hooks avanzados', 'Introducción, Componentes, Hooks, Estado, Efectos', 20, 'intermedio', '["video", "documentos", "ejercicios"]', 'publico', 1),
            (2, 'Django REST Framework', 'Desarrollo de APIs REST con Django', 'Crear APIs robustas y seguras con Django REST Framework', 'Serializers, Views, Authentication, Testing', 25, 'avanzado', '["video", "codigo", "proyectos"]', 'publico', 3),
            (1, 'Introducción a Java Spring', 'Fundamentos de Spring Boot para desarrollo backend', 'Aprender a crear aplicaciones empresariales con Spring', 'Spring Core, Spring Boot, Spring Data JPA', 30, 'basico', '["video", "ejemplos", "quices"]', 'privado', 2)
        ''')
        
        # Insertar inscripciones a cursos
        cursor.execute('''
            INSERT OR IGNORE INTO inscripciones_cursos (usuario_id, curso_id, progreso, estado, puntaje_test) 
            VALUES 
            (1, 1, 75.5, 'en_progreso', NULL),
            (2, 2, 100.0, 'completado', 85.0),
            (1, 3, 0.0, 'no_iniciado', NULL)
        ''')
        
        # Insertar insignias
        cursor.execute('''
            INSERT OR IGNORE INTO insignias (usuario_id, curso_id, nombre, descripcion, codigo_verificacion) 
            VALUES 
            (2, 2, 'Desarrollador API Django', 'Certificación en desarrollo de APIs con Django REST Framework', 'DJREST-2024-001')
        ''')
        
        # Insertar evaluaciones
        cursor.execute('''
            INSERT OR IGNORE INTO evaluaciones (curso_id, titulo, descripcion, preguntas, puntaje_minimo, numero_intentos) 
            VALUES 
            (1, 'Evaluación Final React', 'Test de conocimientos adquiridos en el curso de React', '[{"pregunta": "¿Qué es un Hook en React?", "tipo": "seleccion_multiple", "opciones": ["Función nativa de JavaScript", "Función que te permite usar estado y otras características", "Componente de React", "Librería externa"], "respuesta_correcta": "Función que te permite usar estado y otras características", "puntaje": 20}, {"pregunta": "useState es un Hook", "tipo": "verdadero_falso", "respuesta_correcta": "true", "puntaje": 10}]', 70.0, 2)
        ''')
        
        conn.commit()
        
        # Contar registros insertados
        counts = {}
        tablas = ['usuarios', 'empresas', 'perfiles_buscadores', 'ofertas_empleo', 
                 'postulaciones', 'historial_estados', 'cursos', 'inscripciones_cursos', 
                 'insignias', 'evaluaciones']
        
        for tabla in tablas:
            cursor.execute(f'SELECT COUNT(*) as count FROM {tabla}')
            counts[tabla] = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "message": "Datos de ejemplo insertados correctamente en CEO.db",
            "database": DB_PATH,
            "registros_insertados": counts,
            "total_registros": sum(counts.values())
        }
        
    except sqlite3.Error as e:
        return {
            "error": "Error insertando datos de ejemplo",
            "detalle": str(e)
        }, status.HTTP_500_INTERNAL_SERVER_ERROR


@app.get("/db-info")
def db_info():
    """Devuelve información de la base de datos en uso."""
    info = {
        "db_path": DB_PATH,
        "exists": os.path.exists(DB_PATH),
        "working_directory": os.getcwd()
    }
    try:
        if os.path.exists(DB_PATH):
            stats = os.stat(DB_PATH)
            info.update({
                "size_bytes": stats.st_size,
                "last_modified": datetime.fromtimestamp(stats.st_mtime).isoformat()
            })
    except Exception as ex:
        info["warning"] = f"No se pudieron obtener estadísticas del archivo: {ex}"
    return info


# ============================================
# ENDPOINTS PARA OFERTAS DE EMPLEO
# ============================================

@app.get("/api/ofertas")
def obtener_todas_las_ofertas():
    """
    Obtiene todas las ofertas de empleo activas con información de la empresa
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Para obtener resultados como diccionarios
        cursor = conn.cursor()
        
        # Query con JOIN para obtener información de la empresa
        cursor.execute('''
            SELECT 
                o.id,
                o.titulo,
                o.descripcion,
                o.funciones,
                o.requisitos,
                o.habilidades_requeridas,
                o.ubicacion,
                o.modalidad,
                o.tipo_contrato,
                o.jornada,
                o.salario_min,
                o.salario_max,
                o.fecha_publicacion,
                o.fecha_cierre,
                o.activa,
                e.razon_social as empresa,
                e.sector,
                e.direccion as direccion_empresa
            FROM ofertas_empleo o
            INNER JOIN empresas e ON o.empresa_id = e.id
            WHERE o.activa = 1
            ORDER BY o.fecha_publicacion DESC
        ''')
        
        ofertas = []
        for row in cursor.fetchall():
            oferta = {
                'id': row['id'],
                'titulo': row['titulo'],
                'empresa': row['empresa'],
                'sector': row['sector'],
                'descripcion': row['descripcion'],
                'funciones': row['funciones'],  # Este es "responsabilidades" en el frontend
                'requisitos': row['requisitos'],
                'habilidadesRequeridas': json.loads(row['habilidades_requeridas']) if row['habilidades_requeridas'] else [],
                'ubicacion': row['ubicacion'],
                'modalidad': row['modalidad'].capitalize() if row['modalidad'] else 'No especificado',
                'tipoContrato': row['tipo_contrato'] if row['tipo_contrato'] else 'No especificado',
                'jornada': row['jornada'] if row['jornada'] else 'No especificado',
                'salarioMin': row['salario_min'] if row['salario_min'] else 0,
                'salarioMax': row['salario_max'] if row['salario_max'] else 0,
                'fechaPublicacion': row['fecha_publicacion'],
                'fechaCierre': row['fecha_cierre']
            }
            ofertas.append(oferta)
        
        conn.close()
        
        return {
            "ofertas": ofertas,
            "total": len(ofertas)
        }
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener ofertas: {str(e)}"
        )


@app.get('/api/ofertas/recomendadas')
def obtener_ofertas_recomendadas(user_id: Optional[int] = None, limit: int = 2):
    """Devuelve ofertas recomendadas para un usuario (simple: últimas `limit` ofertas).
    Parámetros: user_id (opcional), limit (por defecto 2)
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT o.id, o.titulo, o.descripcion, o.ubicacion, o.modalidad, o.tipo_contrato,
                   o.salario_min, o.salario_max, o.fecha_publicacion, e.razon_social as empresa
            FROM ofertas_empleo o
            LEFT JOIN empresas e ON o.empresa_id = e.id
            WHERE o.activa = 1
            ORDER BY datetime(o.fecha_publicacion) DESC
            LIMIT ?
        ''', (limit,))

        rows = cursor.fetchall()
        ofertas = []
        for row in rows:
            ofertas.append({
                'id': row['id'],
                'titulo': row['titulo'],
                'empresa': row['empresa'],
                'ubicacion': row['ubicacion'],
                'modalidad': row['modalidad'],
                'tipo_contrato': row['tipo_contrato'],
                'salarioMin': row['salario_min'],
                'salarioMax': row['salario_max'],
                'fechaPublicacion': row['fecha_publicacion']
            })

        conn.close()
        return { 'success': True, 'data': ofertas, 'total': len(ofertas) }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=str(e))
        


@app.get("/api/ofertas/{oferta_id}")
def obtener_oferta_por_id(oferta_id: int):
    """
    Obtiene una oferta de empleo específica por su ID
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                o.id,
                o.titulo,
                o.descripcion,
                o.funciones,
                o.requisitos,
                o.habilidades_requeridas,
                o.ubicacion,
                o.modalidad,
                o.tipo_contrato,
                o.jornada,
                o.salario_min,
                o.salario_max,
                o.fecha_publicacion,
                o.fecha_cierre,
                o.activa,
                o.empresa_id,
                e.razon_social as empresa,
                e.sector,
                e.direccion as direccion_empresa,
                e.telefono as telefono_empresa,
                e.sitio_web,
                e.redes_sociales
            FROM ofertas_empleo o
            INNER JOIN empresas e ON o.empresa_id = e.id
            WHERE o.id = ? AND o.activa = 1
        ''', (oferta_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Oferta no encontrada"
            )
        
        oferta = {
            'id': row['id'],
            'titulo': row['titulo'],
            'empresa': row['empresa'],
            'empresaId': row['empresa_id'],
            'sector': row['sector'],
            'descripcion': row['descripcion'],
            'responsabilidades': row['funciones'],  # Mapeo para el frontend
            'funciones': row['funciones'],
            'requisitos': row['requisitos'],
            'habilidadesRequeridas': json.loads(row['habilidades_requeridas']) if row['habilidades_requeridas'] else [],
            'ubicacion': row['ubicacion'],
            'modalidad': row['modalidad'].capitalize() if row['modalidad'] else 'No especificado',
            'tipoContrato': row['tipo_contrato'] if row['tipo_contrato'] else 'No especificado',
            'jornada': row['jornada'] if row['jornada'] else 'No especificado',
            'salarioMin': row['salario_min'] if row['salario_min'] else 0,
            'salarioMax': row['salario_max'] if row['salario_max'] else 0,
            'fechaPublicacion': row['fecha_publicacion'],
            'fechaCierre': row['fecha_cierre'],
            'contactoEmpresa': {
                'direccion': row['direccion_empresa'],
                'telefono': row['telefono_empresa'],
                'sitioWeb': row['sitio_web'],
                'redesSociales': json.loads(row['redes_sociales']) if row['redes_sociales'] else {}
            }
        }
        
        return oferta
        
    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener la oferta: {str(e)}"
        )


class PostularRequest(BaseModel):
    usuario_id: int

@app.post("/api/ofertas/{oferta_id}/postular")
def postular_a_oferta(oferta_id: int, postulacion: PostularRequest):
    """
    Permite a un usuario postularse a una oferta de empleo
    """
    try:
        usuario_id = postulacion.usuario_id
        
        if not usuario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere usuario_id para postularse"
            )
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verificar que el usuario existe y es un buscador
        cursor.execute('SELECT id, tipo_usuario FROM usuarios WHERE id = ?', (usuario_id,))
        usuario = cursor.fetchone()
        
        if not usuario:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        if usuario['tipo_usuario'] != 'buscador':
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los usuarios (buscadores de empleo) pueden postularse a ofertas"
            )
        
        # Verificar que la oferta existe y está activa
        cursor.execute('''
            SELECT o.id, o.titulo, o.empresa_id, o.ubicacion, o.salario_min, o.salario_max, e.razon_social
            FROM ofertas_empleo o
            LEFT JOIN empresas e ON o.empresa_id = e.id
            WHERE o.id = ? AND o.activa = 1
        ''', (oferta_id,))
        oferta = cursor.fetchone()
        
        if not oferta:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Oferta no encontrada o no está disponible"
            )
        
        # Verificar si ya está postulado
        cursor.execute('''
            SELECT id FROM postulaciones 
            WHERE usuario_id = ? AND oferta_id = ?
        ''', (usuario_id, oferta_id))
        postulacion_existente = cursor.fetchone()
        
        if postulacion_existente:
            conn.close()
            return {
                "message": "Ya estás postulado a esta oferta",
                "postulacion_id": postulacion_existente['id'],
                "ya_postulado": True,
                "oferta_titulo": oferta['titulo']
            }
        
        # Obtener información de la empresa
        empresa_nombre = oferta['razon_social'] or 'Empresa'
        
        # Preparar datos de la postulación
        salario_str = None
        if oferta['salario_min'] and oferta['salario_max']:
            salario_str = f"${oferta['salario_min']:,.0f} - ${oferta['salario_max']:,.0f}"
        elif oferta['salario_min']:
            salario_str = f"Desde ${oferta['salario_min']:,.0f}"
        
        # Crear la postulación
        cursor.execute('''
            INSERT INTO postulaciones (
                usuario_id, oferta_id, empresa, puesto, descripcion,
                estado_actual, salario, ubicacion, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            usuario_id,
            oferta_id,
            empresa_nombre,
            oferta['titulo'],
            None,  # descripcion puede ser NULL
            'Registrada',
            salario_str,
            oferta['ubicacion'],
            json.dumps([])  # tags vacío por defecto
        ))
        
        postulacion_id = cursor.lastrowid
        
        # Crear registro inicial en historial de estados
        cursor.execute('''
            INSERT INTO historial_estados (
                postulacion_id, estado_anterior, estado_nuevo, usuario_cambio, observaciones
            ) VALUES (?, ?, ?, ?, ?)
        ''', (
            postulacion_id,
            None,
            'Registrada',
            'usuario',
            'Postulación creada por el usuario'
        ))
        
        conn.commit()
        conn.close()
        
        return {
            "message": "Postulación creada exitosamente",
            "postulacion_id": postulacion_id,
            "ya_postulado": False,
            "oferta_titulo": oferta['titulo'],
            "empresa": empresa_nombre
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear la postulación: {str(e)}"
        )


@app.post("/api/ofertas")
def crear_oferta(oferta: OfertaCreate):
    """Crea una nueva oferta de empleo a partir de un JSON en el body."""
    try:
        # Normalizar campos
        modalidad = oferta.modalidad.lower() if oferta.modalidad else None
        habilidades_value = oferta.habilidades_requeridas
        if isinstance(habilidades_value, list):
            try:
                habilidades_requeridas = json.dumps(habilidades_value, ensure_ascii=False)
            except Exception:
                habilidades_requeridas = None
        else:
            habilidades_requeridas = habilidades_value  # ya es str o None

        # Validar que la empresa existe
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM empresas WHERE id = ?', (oferta.empresa_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa no encontrada"
            )

        # Insertar la oferta
        cursor.execute('''
            INSERT INTO ofertas_empleo (
                empresa_id, titulo, descripcion, funciones, requisitos,
                habilidades_requeridas, ubicacion, modalidad, tipo_contrato,
                jornada, salario_min, salario_max, fecha_cierre
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''' , (
            oferta.empresa_id,
            oferta.titulo,
            oferta.descripcion,
            oferta.funciones,
            oferta.requisitos,
            habilidades_requeridas,
            oferta.ubicacion,
            modalidad,
            oferta.tipo_contrato,
            oferta.jornada,
            oferta.salario_min,
            oferta.salario_max,
            oferta.fecha_cierre
        ))

        new_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return {"message": "Oferta creada exitosamente", "oferta_id": new_id}

    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear la oferta: {str(e)}"
        )


@app.put("/api/ofertas/{oferta_id}")
def actualizar_oferta(
    oferta_id: int,
    titulo: Optional[str] = None,
    descripcion: Optional[str] = None,
    funciones: Optional[str] = None,
    requisitos: Optional[str] = None,
    habilidades_requeridas: Optional[str] = None,
    ubicacion: Optional[str] = None,
    modalidad: Optional[str] = None,
    tipo_contrato: Optional[str] = None,
    jornada: Optional[str] = None,
    salario_min: Optional[float] = None,
    salario_max: Optional[float] = None,
    fecha_cierre: Optional[str] = None,
    activa: Optional[bool] = None
):
    """
    Actualiza una oferta de empleo existente
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verificar que la oferta existe
        cursor.execute('SELECT id FROM ofertas_empleo WHERE id = ?', (oferta_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Oferta no encontrada"
            )
        
        # Construir query de actualización dinámicamente
        campos_actualizar = []
        valores = []
        
        if titulo is not None:
            campos_actualizar.append('titulo = ?')
            valores.append(titulo)
        if descripcion is not None:
            campos_actualizar.append('descripcion = ?')
            valores.append(descripcion)
        if funciones is not None:
            campos_actualizar.append('funciones = ?')
            valores.append(funciones)
        if requisitos is not None:
            campos_actualizar.append('requisitos = ?')
            valores.append(requisitos)
        if habilidades_requeridas is not None:
            campos_actualizar.append('habilidades_requeridas = ?')
            valores.append(habilidades_requeridas)
        if ubicacion is not None:
            campos_actualizar.append('ubicacion = ?')
            valores.append(ubicacion)
        if modalidad is not None:
            campos_actualizar.append('modalidad = ?')
            valores.append(modalidad.lower())
        if tipo_contrato is not None:
            campos_actualizar.append('tipo_contrato = ?')
            valores.append(tipo_contrato)
        if jornada is not None:
            campos_actualizar.append('jornada = ?')
            valores.append(jornada)
        if salario_min is not None:
            campos_actualizar.append('salario_min = ?')
            valores.append(salario_min)
        if salario_max is not None:
            campos_actualizar.append('salario_max = ?')
            valores.append(salario_max)
        if fecha_cierre is not None:
            campos_actualizar.append('fecha_cierre = ?')
            valores.append(fecha_cierre)
        if activa is not None:
            campos_actualizar.append('activa = ?')
            valores.append(1 if activa else 0)
        
        if not campos_actualizar:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se proporcionaron campos para actualizar"
            )
        
        # Agregar fecha de actualización
        campos_actualizar.append('fecha_actualizacion = CURRENT_TIMESTAMP')
        
        valores.append(oferta_id)
        
        query = f"UPDATE ofertas_empleo SET {', '.join(campos_actualizar)} WHERE id = ?"
        cursor.execute(query, valores)
        
        conn.commit()
        conn.close()
        
        return {
            "message": "Oferta actualizada exitosamente",
            "oferta_id": oferta_id
        }
        
    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar la oferta: {str(e)}"
        )


@app.delete("/api/ofertas/{oferta_id}")
def eliminar_oferta(oferta_id: int):
    """
    Desactiva una oferta de empleo (soft delete)
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM ofertas_empleo WHERE id = ?', (oferta_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Oferta no encontrada"
            )
        
        # Soft delete: marcar como inactiva
        cursor.execute('UPDATE ofertas_empleo SET activa = 0 WHERE id = ?', (oferta_id,))
        
        conn.commit()
        conn.close()
        
        return {
            "message": "Oferta eliminada exitosamente",
            "oferta_id": oferta_id
        }
        
    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la oferta: {str(e)}"
        )


# ============================================
# ENDPOINTS PARA POSTULACIONES
# ============================================

# ============================================
# ENDPOINT LOGIN
# ============================================

from fastapi import Request
from fastapi.responses import JSONResponse
import hashlib

def hash_password_sha256(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

@app.post("/api/validar-login")
async def validar_login(request: Request):
    body = await request.json()
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    if not email or len(password) < 8:
        return JSONResponse({"ok": False, "message": "Email y contraseña requeridos."}, status_code=400)
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM usuarios WHERE LOWER(email)=LOWER(?)', (email,))
        user = cursor.fetchone()
        conn.close()
        if not user:
            return JSONResponse({"ok": False, "message": "Usuario no encontrado."}, status_code=404)
        # Comparar directamente con la columna 'password' (los datos de ejemplo guardan texto plano)
        if password != user['password']:
            return JSONResponse({"ok": False, "message": "Contraseña incorrecta."}, status_code=401)
        session = {
            "user_id": user['id'],
            "rol": user['tipo_usuario'],
            "nombre": user['nombre'],
            "email": user['email']
        }
        return {"ok": True, "session": session}
    except Exception as e:
        return JSONResponse({"ok": False, "message": f"Error: {e}"}, status_code=500)

@app.get("/api/postulaciones")
def listar_postulaciones(usuario_id: Optional[int] = 1):
    """Lista las postulaciones de un usuario (por ahora usuario_id genérico=1 si no se envía)."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT p.* FROM postulaciones p
            WHERE p.usuario_id = ?
            ORDER BY p.fecha_creacion DESC
        ''', (usuario_id,))

        filas = cursor.fetchall()

        # Traer historial para todas las postulaciones en un solo query
        ids = [row['id'] for row in filas]
        historial_por_postulacion = {pid: [] for pid in ids}
        if ids:
            qmarks = ','.join('?' for _ in ids)
            cursor.execute(f'''
                SELECT h.* FROM historial_estados h
                WHERE h.postulacion_id IN ({qmarks})
                ORDER BY datetime(h.fecha_cambio) DESC
            ''', ids)
            for h in cursor.fetchall():
                historial_por_postulacion[h['postulacion_id']].append({
                    'id': h['id'],
                    'estado_anterior': h['estado_anterior'],
                    'estado_nuevo': h['estado_nuevo'],
                    'fecha_cambio': h['fecha_cambio'],
                    'usuario_cambio': h['usuario_cambio'],
                    'observaciones': h['observaciones']
                })

        postulaciones = []
        for row in filas:
            postulaciones.append({
                'id': row['id'],
                'usuario_id': row['usuario_id'],
                'oferta_id': row['oferta_id'],
                'empresa': row['empresa'],
                'puesto': row['puesto'],
                'descripcion': row['descripcion'],
                'estado_actual': row['estado_actual'],
                'fecha_creacion': row['fecha_creacion'],
                'fecha_actualizacion': row['fecha_actualizacion'],
                'salario': row['salario'],
                'ubicacion': row['ubicacion'],
                'tags': json.loads(row['tags']) if row['tags'] else [],
                'historial': historial_por_postulacion.get(row['id'], [])
            })

        conn.close()
        return {"postulaciones": postulaciones, "total": len(postulaciones)}

    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Error al listar postulaciones: {e}")


@app.get('/api/postulaciones/usuario/{user_id}')
def listar_postulaciones_por_usuario(user_id: int):
    """Devuelve las postulaciones de un usuario por su id"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT p.id, p.usuario_id, p.oferta_id, p.empresa, p.puesto, p.descripcion, p.estado_actual, p.fecha_creacion, p.fecha_actualizacion, p.salario, p.ubicacion, p.tags,
                   o.titulo AS oferta_titulo
            FROM postulaciones p
            LEFT JOIN ofertas_empleo o ON p.oferta_id = o.id
            WHERE p.usuario_id = ?
            ORDER BY p.fecha_creacion DESC
        ''', (user_id,))

        filas = cursor.fetchall()
        postulaciones = []
        for row in filas:
            postulaciones.append({
                'postulacion_id': row['id'],
                'usuario_id': row['usuario_id'],
                'oferta_id': row['oferta_id'],
                'oferta_titulo': row['oferta_titulo'] or row['puesto'],
                'empresa_nombre': row['empresa'],
                'fecha_postulacion': row['fecha_creacion'],
                'estado': row['estado_actual'],
                'descripcion': row['descripcion'],
                'salario': row['salario'],
                'ubicacion': row['ubicacion'],
                'tags': json.loads(row['tags']) if row['tags'] else []
            })

        conn.close()
        return { 'postulaciones': postulaciones, 'total': len(postulaciones) }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/user/profile')
def api_user_profile(request: Request):
    """Devuelve un perfil simplificado del usuario a partir de la cookie `user_id`."""
    user_id = request.cookies.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail='No autenticado')
    try:
        uid = int(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail='user_id inválido')
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT id, email, nombre, tipo_usuario FROM usuarios WHERE id = ?', (uid,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail='Usuario no encontrado')
        return dict(row)
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/user/type')
def api_user_type(request: Request):
    """Devuelve solo el tipo de usuario (tipo_usuario) usando cookie user_id."""
    user_id = request.cookies.get('user_id')
    if not user_id:
        return {"userType": None}
    try:
        uid = int(user_id)
    except Exception:
        return {"userType": None}
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT tipo_usuario FROM usuarios WHERE id = ?', (uid,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return {"userType": None}
        return {"userType": row[0]}
    except sqlite3.Error:
        return {"userType": None}


@app.get('/api/dashboard/{userType}')
def api_dashboard(userType: str):
    """Endpoint de ejemplo que devuelve datos de dashboard según el tipo de usuario."""
    userType = (userType or '').lower()
    if userType == 'empresa' or userType == 'empleador':
        # datos de ejemplo para empleadores
        return {
            "sections": [
                "Dashboard de gestión de ofertas",
                "Estadísticas de postulaciones",
                "Herramientas de reclutamiento",
                "Gestión de empresa"
            ],
            "metrics": {
                "ofertas_publicadas": 12,
                "postulaciones_recibidas": 134,
                "candidatos_destacados": 5
            }
        }
    else:
        # datos de ejemplo para buscadores de empleo
        return {
            "sections": [
                "Búsqueda de empleo avanzada",
                "Ofertas recomendadas",
                "Postulaciones recientes",
                "Perfil profesional"
            ],
            "recommendations": [
                {"id": 1, "titulo": "Desarrollador Frontend React"},
                {"id": 2, "titulo": "Analista de Datos Junior"}
            ]
        }



@app.get('/api/employer/dashboard')
def api_employer_dashboard():
    """Alias para dashboard de empleadores."""
    return api_dashboard('empresa')


@app.get('/api/jobseeker/dashboard')
def api_jobseeker_dashboard():
    """Alias para dashboard de buscadores de empleo."""
    return api_dashboard('buscador')


@app.get("/api/postulaciones/empresa/{empresa_id}")
def listar_postulaciones_empresa(empresa_id: int):
    """
    Lista todas las postulaciones a las ofertas de empleo de una empresa específica.
    Incluye información del usuario postulante y de la oferta.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Verificar que la empresa existe
        cursor.execute('SELECT id FROM empresas WHERE id = ?', (empresa_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa no encontrada"
            )

        # Obtener todas las postulaciones a las ofertas de esta empresa
        cursor.execute('''
            SELECT 
                p.id,
                p.usuario_id,
                p.oferta_id,
                p.empresa,
                p.puesto,
                p.descripcion,
                p.estado_actual,
                p.fecha_creacion,
                p.fecha_actualizacion,
                p.salario,
                p.ubicacion,
                p.tags,
                u.nombre AS usuario_nombre,
                u.email AS usuario_email,
                o.titulo AS oferta_titulo,
                o.descripcion AS oferta_descripcion,
                o.modalidad AS oferta_modalidad,
                o.tipo_contrato AS oferta_tipo_contrato
            FROM postulaciones p
            INNER JOIN ofertas_empleo o ON p.oferta_id = o.id
            INNER JOIN usuarios u ON p.usuario_id = u.id
            WHERE o.empresa_id = ?
            ORDER BY p.fecha_creacion DESC
        ''', (empresa_id,))

        filas = cursor.fetchall()

        postulaciones = []
        for row in filas:
            postulaciones.append({
                'id': row['id'],
                'usuario_id': row['usuario_id'],
                'usuario_nombre': row['usuario_nombre'],
                'usuario_email': row['usuario_email'],
                'oferta_id': row['oferta_id'],
                'oferta_titulo': row['oferta_titulo'],
                'oferta_descripcion': row['oferta_descripcion'],
                'oferta_modalidad': row['oferta_modalidad'],
                'oferta_tipo_contrato': row['oferta_tipo_contrato'],
                'empresa': row['empresa'],
                'puesto': row['puesto'],
                'descripcion': row['descripcion'],
                'estado_actual': row['estado_actual'],
                'fecha_creacion': row['fecha_creacion'],
                'fecha_actualizacion': row['fecha_actualizacion'],
                'salario': row['salario'],
                'ubicacion': row['ubicacion'],
                'tags': json.loads(row['tags']) if row['tags'] else []
            })

        conn.close()
        return {"postulaciones": postulaciones, "total": len(postulaciones)}

    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar postulaciones de la empresa: {str(e)}"
        )


class PostulacionRequest(BaseModel):
    usuario_id: int
    oferta_id: int

@app.post("/api/postulaciones")
def crear_postulacion(postulacion: PostulacionRequest):
    """
    Crea una nueva postulación a una oferta de empleo.
    Requiere que el usuario esté autenticado y sea un buscador (no empresa).
    """
    try:
        usuario_id = postulacion.usuario_id
        oferta_id = postulacion.oferta_id
        
        if not usuario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere usuario_id para postularse a la oferta"
            )
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verificar que el usuario existe y es un buscador
        cursor.execute('SELECT id, tipo_usuario FROM usuarios WHERE id = ?', (usuario_id,))
        usuario = cursor.fetchone()
        
        if not usuario:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        if usuario['tipo_usuario'] != 'buscador':
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los usuarios (buscadores de empleo) pueden postularse a ofertas"
            )
        
        # Verificar que la oferta existe y está activa
        cursor.execute('''
            SELECT o.id, o.titulo, o.empresa_id, o.ubicacion, o.salario_min, o.salario_max, e.razon_social
            FROM ofertas_empleo o
            LEFT JOIN empresas e ON o.empresa_id = e.id
            WHERE o.id = ? AND o.activa = 1
        ''', (oferta_id,))
        oferta = cursor.fetchone()
        
        if not oferta:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Oferta no encontrada o no está disponible"
            )
        
        # Verificar si ya está postulado
        cursor.execute('''
            SELECT id FROM postulaciones 
            WHERE usuario_id = ? AND oferta_id = ?
        ''', (usuario_id, oferta_id))
        postulacion_existente = cursor.fetchone()
        
        if postulacion_existente:
            conn.close()
            return {
                "message": "Ya estás postulado a esta oferta",
                "postulacion_id": postulacion_existente['id'],
                "ya_postulado": True,
                "oferta_titulo": oferta['titulo']
            }
        
        # Obtener información de la empresa
        empresa_nombre = oferta['razon_social'] or 'Empresa'
        
        # Preparar datos de la postulación
        salario_str = None
        if oferta['salario_min'] and oferta['salario_max']:
            salario_str = f"${oferta['salario_min']:,.0f} - ${oferta['salario_max']:,.0f}"
        elif oferta['salario_min']:
            salario_str = f"Desde ${oferta['salario_min']:,.0f}"
        
        # Crear la postulación
        cursor.execute('''
            INSERT INTO postulaciones (
                usuario_id, oferta_id, empresa, puesto, descripcion,
                estado_actual, salario, ubicacion, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            usuario_id,
            oferta_id,
            empresa_nombre,
            oferta['titulo'],
            None,  # descripcion puede ser NULL
            'Registrada',
            salario_str,
            oferta['ubicacion'],
            json.dumps([])  # tags vacío por defecto
        ))
        
        postulacion_id = cursor.lastrowid
        
        # Crear registro inicial en historial de estados
        cursor.execute('''
            INSERT INTO historial_estados (
                postulacion_id, estado_anterior, estado_nuevo, usuario_cambio, observaciones
            ) VALUES (?, ?, ?, ?, ?)
        ''', (
            postulacion_id,
            None,
            'Registrada',
            'usuario',
            'Postulación creada por el usuario'
        ))
        
        conn.commit()
        conn.close()
        
        return {
            "message": "Postulación creada exitosamente",
            "postulacion_id": postulacion_id,
            "ya_postulado": False,
            "oferta_titulo": oferta['titulo'],
            "empresa": empresa_nombre
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear la postulación: {str(e)}"
        )


@app.post("/api/postulaciones/{postulacion_id}/cambiar-estado")
def cambiar_estado_postulacion(postulacion_id: int, req: CambioEstadoRequest):
    """Cambia el estado de una postulación y registra el historial."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Validar existencia y estado actual
        cursor.execute('SELECT estado_actual FROM postulaciones WHERE id = ?', (postulacion_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Postulación no encontrada")

        estado_anterior = row['estado_actual']
        nuevo_estado = req.nuevo_estado

        # Validar nuevo estado permitido
        permitidos = {'Registrada', 'En progreso', 'Aprobada', 'Rechazada', 'Cancelada'}
        if nuevo_estado not in permitidos:
            conn.close()
            raise HTTPException(status_code=400, detail="Estado no permitido")

        # Actualizar postulación
        cursor.execute('''
            UPDATE postulaciones
            SET estado_actual = ?, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (nuevo_estado, postulacion_id))

        # Insertar historial
        cursor.execute('''
            INSERT INTO historial_estados (postulacion_id, estado_anterior, estado_nuevo, usuario_cambio, observaciones)
            VALUES (?, ?, ?, ?, ?)
        ''', (postulacion_id, estado_anterior, nuevo_estado, req.usuario or 'usuario', req.observaciones))

        conn.commit()
        conn.close()

        return {"message": "Estado actualizado", "postulacion_id": postulacion_id, "nuevo_estado": nuevo_estado}

    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Error al cambiar estado: {e}")


@app.put('/api/postulaciones/{postulacion_id}/estado')
def actualizar_estado_postulacion(postulacion_id: int, req: CambioEstadoRequest):
    """Alias más RESTful para actualizar el estado de una postulación."""
    # Reusar la lógica del endpoint existente
    return cambiar_estado_postulacion(postulacion_id, req)


@app.get('/api/empresa/{empresa_id}/aspirantes')
def obtener_aspirantes_empresa(empresa_id: int, limit: Optional[int] = 0):
    """Devuelve los aspirantes que aplicaron a las ofertas de la empresa.
    Si no hay postulaciones, devuelve lista vacía (frontend mostrará datos de muestra).
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Verificar existencia de empresa
        cursor.execute('SELECT id, razon_social FROM empresas WHERE id = ?', (empresa_id,))
        empresa = cursor.fetchone()
        if not empresa:
            conn.close()
            raise HTTPException(status_code=404, detail='Empresa no encontrada')

        q = '''
            SELECT u.id as usuario_id, u.nombre, u.email, o.titulo as puesto_aplicado,
                   p.fecha_creacion as fecha_postulacion, p.estado_actual as estado, p.id as postulacion_id
            FROM postulaciones p
            JOIN usuarios u ON p.usuario_id = u.id
            JOIN ofertas_empleo o ON p.oferta_id = o.id
            WHERE o.empresa_id = ?
            ORDER BY p.fecha_creacion DESC
        '''
        params = (empresa_id,)
        if limit and int(limit) > 0:
            q = q + '\nLIMIT ?'
            params = (empresa_id, int(limit))

        cursor.execute(q, params)
        rows = cursor.fetchall()
        aspirantes = []
        for r in rows:
            # Intentar separar nombre en nombres/apellidos si es posible
            nombres = r['nombre'] or ''
            partes = nombres.split(' ', 1)
            apellido = partes[1] if len(partes) > 1 else ''
            primer_nombre = partes[0] if len(partes) > 0 else ''
            aspirantes.append({
                'postulacion_id': r['postulacion_id'],
                'usuario_id': r['usuario_id'],
                'nombres': primer_nombre,
                'apellidos': apellido,
                'email': r['email'],
                'puesto_aplicado': r['puesto_aplicado'],
                'fecha_postulacion': r['fecha_postulacion'],
                'estado': r['estado']
            })

        conn.close()
        return {'aspirantes': aspirantes, 'total': len(aspirantes)}

    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/empresa/{empresa_id}/ofertas')
def obtener_ofertas_empresa(empresa_id: int):
    """Devuelve las ofertas de una empresa junto con el número de postulantes por oferta."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Verificar existencia de empresa
        cursor.execute('SELECT id, razon_social FROM empresas WHERE id = ?', (empresa_id,))
        empresa = cursor.fetchone()
        if not empresa:
            conn.close()
            raise HTTPException(status_code=404, detail='Empresa no encontrada')

        cursor.execute('''
            SELECT o.id, o.titulo, o.descripcion, o.activa, o.fecha_publicacion,
                   COUNT(p.id) as postulantes
            FROM ofertas_empleo o
            LEFT JOIN postulaciones p ON o.id = p.oferta_id
            WHERE o.empresa_id = ?
            GROUP BY o.id
            ORDER BY o.fecha_publicacion DESC
        ''', (empresa_id,))

        ofertas = []
        for row in cursor.fetchall():
            ofertas.append({
                'id': row['id'],
                'titulo': row['titulo'],
                'descripcion': row['descripcion'],
                'activa': bool(row['activa']),
                'fecha_publicacion': row['fecha_publicacion'],
                'postulantes': int(row['postulantes'])
            })

        conn.close()
        return {'ofertas': ofertas, 'total': len(ofertas)}

    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    














@app.get("/api/perfiles/{usuario_id}")
async def obtener_perfil(usuario_id: int):
    """
    Obtiene el perfil completo de un usuario, incluyendo:
    - datos del perfil (perfiles_buscadores)
    - insignias asociadas
    - inscripciones a cursos (con información básica del curso)

    Devuelve un único objeto JSON con las propiedades agrupadas.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # 1) Datos básicos del usuario + perfil buscador
        cursor.execute('''
            SELECT u.id AS usuario_id, u.nombre, u.email, u.tipo_usuario,
                   p.identidad_genero, p.condicion_discapacidad, p.informacion_academica,
                   p.experiencia_laboral, p.habilidades, p.telefono, p.ubicacion
            FROM usuarios u
            LEFT JOIN perfiles_buscadores p ON u.id = p.usuario_id
            WHERE u.id = ?
        ''', (usuario_id,))

        row = cursor.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Perfil no encontrado")

        perfil_data = dict(row)

        # Parsear habilidades si vienen como JSON string
        habilidades = perfil_data.get('habilidades')
        try:
            if habilidades and isinstance(habilidades, str):
                perfil_data['habilidades'] = json.loads(habilidades)
            elif not habilidades:
                perfil_data['habilidades'] = []
        except Exception:
            perfil_data['habilidades'] = []

        # 2) Insignias del usuario (puede haber varias)
        cursor.execute('''
            SELECT id, curso_id, nombre, descripcion, fecha_obtencion, codigo_verificacion, imagen_url
            FROM insignias
            WHERE usuario_id = ?
            ORDER BY fecha_obtencion DESC
        ''', (usuario_id,))
        insignias = []
        for i in cursor.fetchall():
            insignias.append({
                'id': i['id'],
                'curso_id': i['curso_id'],
                'nombre': i['nombre'],
                'descripcion': i['descripcion'],
                'fecha_obtencion': i['fecha_obtencion'],
                'codigo_verificacion': i['codigo_verificacion'],
                'imagen_url': i['imagen_url']
            })
        perfil_data['insignias'] = insignias

        # 3) Inscripciones a cursos (unir con la tabla cursos para mostrar título)
        cursor.execute('''
            SELECT ic.id as inscripcion_id, ic.curso_id, ic.fecha_inscripcion, ic.progreso, ic.estado, ic.fecha_completado, ic.puntaje_test,
                   c.titulo AS curso_titulo, c.descripcion AS curso_descripcion
            FROM inscripciones_cursos ic
            LEFT JOIN cursos c ON ic.curso_id = c.id
            WHERE ic.usuario_id = ?
            ORDER BY ic.fecha_inscripcion DESC
        ''', (usuario_id,))
        inscripciones = []
        for ic in cursor.fetchall():
            inscripciones.append({
                'id': ic['inscripcion_id'],
                'curso_id': ic['curso_id'],
                'curso_titulo': ic['curso_titulo'],
                'curso_descripcion': ic['curso_descripcion'],
                'fecha_inscripcion': ic['fecha_inscripcion'],
                'progreso': ic['progreso'],
                'estado': ic['estado'],
                'fecha_completado': ic['fecha_completado'],
                'puntaje_test': ic['puntaje_test']
            })
        perfil_data['inscripciones'] = inscripciones

        # 4) Postulaciones a ofertas de empleo (unir con la tabla ofertas_empleo para mostrar información)
        cursor.execute('''
            SELECT p.id as postulacion_id, p.oferta_id, p.empresa, p.puesto, p.descripcion, 
                   p.estado_actual, p.fecha_creacion, p.fecha_actualizacion, p.salario, p.ubicacion, p.tags,
                   o.titulo AS oferta_titulo, o.descripcion AS oferta_descripcion, o.modalidad, o.tipo_contrato
            FROM postulaciones p
            LEFT JOIN ofertas_empleo o ON p.oferta_id = o.id
            WHERE p.usuario_id = ?
            ORDER BY p.fecha_creacion DESC
        ''', (usuario_id,))
        postulaciones = []
        for p in cursor.fetchall():
            postulaciones.append({
                'id': p['postulacion_id'],
                'oferta_id': p['oferta_id'],
                'empresa': p['empresa'],
                'puesto': p['puesto'],
                'descripcion': p['descripcion'],
                'estado_actual': p['estado_actual'],
                'fecha_creacion': p['fecha_creacion'],
                'fecha_actualizacion': p['fecha_actualizacion'],
                'salario': p['salario'],
                'ubicacion': p['ubicacion'],
                'tags': json.loads(p['tags']) if p['tags'] else [],
                'oferta_titulo': p['oferta_titulo'],
                'oferta_descripcion': p['oferta_descripcion'],
                'modalidad': p['modalidad'],
                'tipo_contrato': p['tipo_contrato']
            })
        perfil_data['postulaciones'] = postulaciones

        conn.close()
        return perfil_data

    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el perfil: {str(e)}")
    

@app.get("/api/perfiles/empresa/{usuario_id}")
async def obtener_perfil_empresa(usuario_id: int):
    """
    Obtiene el perfil completo de una empresa, incluyendo:
    - datos básicos del usuario
    - información completa de la empresa
    - ofertas publicadas
    - cursos publicados
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # 1) Datos básicos del usuario + información de la empresa
        cursor.execute('''
            SELECT u.id AS usuario_id, u.nombre, u.email, u.tipo_usuario, u.fecha_creacion,
                   e.id AS empresa_id, e.razon_social, e.nit, e.rut, e.sector,
                   e.direccion, e.telefono, e.sitio_web, e.redes_sociales,
                   e.actividad_economica, e.tamano_empresa, e.verificada, e.fecha_verificacion
            FROM usuarios u
            INNER JOIN empresas e ON u.id = e.usuario_id
            WHERE u.id = ? AND u.tipo_usuario = 'empresa'
        ''', (usuario_id,))

        row = cursor.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Perfil de empresa no encontrado")

        perfil_data = dict(row)

        # Parsear redes sociales si vienen como JSON string
        redes_sociales = perfil_data.get('redes_sociales')
        try:
            if redes_sociales and isinstance(redes_sociales, str):
                perfil_data['redes_sociales'] = json.loads(redes_sociales)
            elif not redes_sociales:
                perfil_data['redes_sociales'] = {}
        except Exception:
            perfil_data['redes_sociales'] = {}

        # 2) Ofertas publicadas por la empresa
        cursor.execute('''
            SELECT id, titulo, descripcion, ubicacion, modalidad, tipo_contrato,
                   salario_min, salario_max, fecha_publicacion, activa
            FROM ofertas_empleo
            WHERE empresa_id = ?
            ORDER BY fecha_publicacion DESC
        ''', (perfil_data['empresa_id'],))
        
        ofertas = []
        for o in cursor.fetchall():
            ofertas.append({
                'id': o['id'],
                'titulo': o['titulo'],
                'descripcion': o['descripcion'],
                'ubicacion': o['ubicacion'],
                'modalidad': o['modalidad'],
                'tipo_contrato': o['tipo_contrato'],
                'salario_min': o['salario_min'],
                'salario_max': o['salario_max'],
                'fecha_publicacion': o['fecha_publicacion'],
                'activa': bool(o['activa'])
            })
        perfil_data['ofertas'] = ofertas

        # 3) Cursos publicados por la empresa
        cursor.execute('''
            SELECT id, titulo, descripcion, duracion_estimada, nivel_dificultad,
                   visibilidad, fecha_publicacion, activo
            FROM cursos
            WHERE empresa_id = ?
            ORDER BY fecha_publicacion DESC
        ''', (perfil_data['empresa_id'],))
        
        cursos = []
        for c in cursor.fetchall():
            cursos.append({
                'id': c['id'],
                'titulo': c['titulo'],
                'descripcion': c['descripcion'],
                'duracion_estimada': c['duracion_estimada'],
                'nivel_dificultad': c['nivel_dificultad'],
                'visibilidad': c['visibilidad'],
                'fecha_publicacion': c['fecha_publicacion'],
                'activo': bool(c['activo'])
            })
        perfil_data['cursos'] = cursos

        conn.close()
        return perfil_data

    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el perfil de empresa: {str(e)}")


# ============================================
# ENDPOINTS PARA CURSOS
# ============================================

class CursoCreate(BaseModel):
    empresa_id: int
    titulo: str
    descripcion: str  # Requerido según el formulario
    objetivos: Optional[str] = None
    temario: Optional[str] = None
    duracion_estimada: int  # Requerido según el formulario
    nivel_dificultad: str  # Requerido según el formulario: basico|intermedio|avanzado
    formato_contenido: Optional[Any] = None  # Puede venir como lista o str JSON
    visibilidad: str = "publico"  # Requerido según el formulario: publico|privado
    oferta_asociada: Optional[int] = None

    class Config:
        extra = "ignore"


@app.get("/api/cursos")
def obtener_todos_los_cursos():
    """
    Obtiene todos los cursos públicos activos con información de la empresa
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Query con JOIN para obtener información de la empresa
        cursor.execute('''
            SELECT 
                c.id,
                c.titulo,
                c.descripcion,
                c.objetivos,
                c.temario,
                c.duracion_estimada,
                c.nivel_dificultad,
                c.formato_contenido,
                c.visibilidad,
                c.fecha_publicacion,
                c.activo,
                e.razon_social as empresa,
                e.sector
            FROM cursos c
            INNER JOIN empresas e ON c.empresa_id = e.id
            WHERE c.visibilidad = 'publico' AND c.activo = 1
            ORDER BY c.fecha_publicacion DESC
        ''')
        
        cursos = []
        for row in cursor.fetchall():
            # Parsear formato_contenido si viene como JSON string
            formato_contenido = row['formato_contenido']
            try:
                if formato_contenido and isinstance(formato_contenido, str):
                    formato_contenido = json.loads(formato_contenido)
                elif not formato_contenido:
                    formato_contenido = []
            except Exception:
                formato_contenido = []
            
            curso = {
                'id': row['id'],
                'titulo': row['titulo'],
                'descripcion': row['descripcion'],
                'objetivos': row['objetivos'],
                'temario': row['temario'],
                'duracion_estimada': row['duracion_estimada'],
                'nivel_dificultad': row['nivel_dificultad'],
                'formato_contenido': formato_contenido,
                'visibilidad': row['visibilidad'],
                'fecha_publicacion': row['fecha_publicacion'],
                'empresa': row['empresa'],
                'sector': row['sector']
            }
            cursos.append(curso)
        
        conn.close()
        
        return {
            "cursos": cursos,
            "total": len(cursos)
        }
        
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener cursos: {str(e)}"
        )


@app.post("/api/cursos")
def crear_curso(curso: CursoCreate):
    """Crea un nuevo curso a partir de un JSON en el body."""
    try:
        # Validar campos requeridos
        if not curso.titulo or not curso.titulo.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El título del curso es obligatorio"
            )
        
        if not curso.descripcion or not curso.descripcion.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La descripción del curso es obligatoria"
            )
        
        if not curso.duracion_estimada or curso.duracion_estimada < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La duración estimada debe ser al menos 1 hora"
            )
        
        if not curso.nivel_dificultad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nivel de dificultad es obligatorio"
            )
        
        # Normalizar campos
        nivel_dificultad = curso.nivel_dificultad.lower().strip()
        visibilidad = curso.visibilidad.lower().strip() if curso.visibilidad else 'publico'
        
        # Validar nivel de dificultad
        if nivel_dificultad not in ['basico', 'intermedio', 'avanzado']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nivel de dificultad debe ser: basico, intermedio o avanzado"
            )
        
        # Validar visibilidad
        if visibilidad not in ['publico', 'privado']:
            visibilidad = 'publico'

        # Procesar formato_contenido
        formato_value = curso.formato_contenido
        if isinstance(formato_value, list):
            try:
                formato_contenido = json.dumps(formato_value, ensure_ascii=False)
            except Exception:
                formato_contenido = None
        else:
            formato_contenido = formato_value  # ya es str o None

        # Validar que la empresa existe
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM empresas WHERE id = ?', (curso.empresa_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa no encontrada"
            )

        # Insertar el curso
        # Nota: activo y fecha_publicacion tienen valores por defecto en la BD,
        # pero los establecemos explícitamente para asegurar consistencia
        cursor.execute('''
            INSERT INTO cursos (
                empresa_id, titulo, descripcion, objetivos, temario,
                duracion_estimada, nivel_dificultad, formato_contenido,
                visibilidad, oferta_asociada, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            curso.empresa_id,
            curso.titulo,
            curso.descripcion,
            curso.objetivos,
            curso.temario,
            curso.duracion_estimada,
            nivel_dificultad,
            formato_contenido,
            visibilidad,
            curso.oferta_asociada
        ))

        new_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return {"message": "Curso creado exitosamente", "curso_id": new_id}

    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear el curso: {str(e)}"
        )


# Ruta para servir otras páginas HTML por nombre simple.
# Ejemplos: GET /registro -> sirve FrontEnd/templates/html/registro-app.html si existe
@app.get("/{page_name}")
def serve_page(page_name: str):
    # Evitar interceptar rutas de la API
    if page_name.startswith("api"):
        raise HTTPException(status_code=404, detail="Not Found")

    # Si el cliente pidió explícitamente 'ofertas.html' (u otro archivo .html),
    # permitir servirlo directamente. También soportar la versión sin extensión (/ofertas)
    candidates = []
    # Si el page_name incluye extensión .html o .htm, intentar servir ese archivo directo
    if page_name.lower().endswith('.html') or page_name.lower().endswith('.htm'):
        candidates.append(page_name)

    # Añadir variantes comunes: sin extensión, con sufijo -app, y carpeta/index.html
    base = page_name
    if page_name.lower().endswith('.html') or page_name.lower().endswith('.htm'):
        base = os.path.splitext(page_name)[0]

    candidates.extend([
        f"{base}.html",
        f"{base}-app.html",
        f"{base}.htm",
        os.path.join(base, "index.html")
    ])

    for c in candidates:
        p = os.path.join(FRONTEND_HTML_DIR, c)
        if os.path.exists(p):
            return FileResponse(p, media_type="text/html")

    # Si no se encontró, devolver 404
    raise HTTPException(status_code=404, detail=f"Página '{page_name}' no encontrada")


@app.get("/api/cursos/{curso_id}")
def obtener_detalle_curso(curso_id: int):
    """
    Obtiene los detalles completos de un curso específico por su ID
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Query con JOIN para obtener información completa del curso y la empresa
        cursor.execute('''
            SELECT 
                c.id,
                c.titulo,
                c.descripcion,
                c.objetivos,
                c.temario,
                c.duracion_estimada,
                c.nivel_dificultad,
                c.formato_contenido,
                c.visibilidad,
                c.fecha_publicacion,
                c.activo,
                c.oferta_asociada,
                e.id as empresa_id,
                e.razon_social as empresa_nombre,
                e.sector as empresa_sector,
                e.direccion as empresa_direccion,
                e.telefono as empresa_telefono
            FROM cursos c
            INNER JOIN empresas e ON c.empresa_id = e.id
            WHERE c.id = ? AND c.activo = 1
        ''', (curso_id,))
        
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Curso no encontrado o inactivo"
            )
        
        # Parsear formato_contenido si viene como JSON string
        formato_contenido = row['formato_contenido']
        try:
            if formato_contenido and isinstance(formato_contenido, str):
                formato_contenido = json.loads(formato_contenido)
            elif not formato_contenido:
                formato_contenido = []
        except Exception:
            formato_contenido = []
        
        # Obtener información de la oferta asociada si existe
        oferta_info = None
        if row['oferta_asociada']:
            cursor.execute('''
                SELECT id, titulo, descripcion
                FROM ofertas_empleo
                WHERE id = ?
            ''', (row['oferta_asociada'],))
            oferta_row = cursor.fetchone()
            if oferta_row:
                oferta_info = {
                    'id': oferta_row['id'],
                    'titulo': oferta_row['titulo'],
                    'descripcion': oferta_row['descripcion']
                }
        
        curso = {
            'id': row['id'],
            'titulo': row['titulo'],
            'descripcion': row['descripcion'],
            'objetivos': row['objetivos'],
            'temario': row['temario'],
            'duracion_estimada': row['duracion_estimada'],
            'nivel_dificultad': row['nivel_dificultad'],
            'formato_contenido': formato_contenido,
            'visibilidad': row['visibilidad'],
            'fecha_publicacion': row['fecha_publicacion'],
            'oferta_asociada': oferta_info,
            'empresa': {
                'id': row['empresa_id'],
                'nombre': row['empresa_nombre'],
                'sector': row['empresa_sector'],
                'direccion': row['empresa_direccion'],
                'telefono': row['empresa_telefono']
            }
        }
        
        conn.close()
        return curso
        
    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener el detalle del curso: {str(e)}"
        )


@app.get("/api/cursos/usuario/{user_id}")
def obtener_cursos_usuario(user_id: int):
    """
    Obtiene los cursos en los que está inscrito un usuario específico
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                c.id,
                c.titulo,
                c.descripcion,
                c.objetivos,
                c.temario,
                c.duracion_estimada,
                c.nivel_dificultad,
                c.formato_contenido,
                c.visibilidad,
                c.fecha_publicacion,
                c.activo,
                ic.fecha_inscripcion,
                ic.progreso,
                ic.estado,
                ic.fecha_completado,
                ic.puntaje_test,
                e.razon_social as empresa_nombre,
                e.sector as empresa_sector
            FROM inscripciones_cursos ic
            INNER JOIN cursos c ON ic.curso_id = c.id
            INNER JOIN empresas e ON c.empresa_id = e.id
            WHERE ic.usuario_id = ? AND c.activo = 1
            ORDER BY ic.fecha_inscripcion DESC
        ''', (user_id,))
        
        cursos = []
        for row in cursor.fetchall():
            # Parsear formato_contenido si viene como JSON string
            formato_contenido = row['formato_contenido']
            try:
                if formato_contenido and isinstance(formato_contenido, str):
                    formato_contenido = json.loads(formato_contenido)
                elif not formato_contenido:
                    formato_contenido = []
            except Exception:
                formato_contenido = []
            
            curso = {
                'id': row['id'],
                'titulo': row['titulo'],
                'descripcion': row['descripcion'],
                'objetivos': row['objetivos'],
                'temario': row['temario'],
                'duracion_estimada': row['duracion_estimada'],
                'nivel_dificultad': row['nivel_dificultad'],
                'formato_contenido': formato_contenido,
                'visibilidad': row['visibilidad'],
                'fecha_publicacion': row['fecha_publicacion'],
                'empresa_nombre': row['empresa_nombre'],
                'empresa_sector': row['empresa_sector'],
                'inscripcion': {
                    'fecha_inscripcion': row['fecha_inscripcion'],
                    'progreso': row['progreso'],
                    'estado': row['estado'],
                    'fecha_completado': row['fecha_completado'],
                    'puntaje_test': row['puntaje_test']
                }
            }
            cursos.append(curso)
        
        conn.close()
        
        return {
            "cursos": cursos,
            "total": len(cursos)
        }
        
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener cursos del usuario: {str(e)}"
        )


class InscripcionRequest(BaseModel):
    usuario_id: int

@app.post("/api/cursos/{curso_id}/inscribir")
def inscribir_usuario_curso(curso_id: int, inscripcion: InscripcionRequest):
    """
    Inscribe un usuario a un curso específico.
    Requiere que el usuario esté autenticado y sea un buscador (no empresa).
    """
    try:
        usuario_id = inscripcion.usuario_id
        
        if not usuario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere usuario_id para inscribirse al curso"
            )
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verificar que el usuario existe y es un buscador
        cursor.execute('SELECT id, tipo_usuario FROM usuarios WHERE id = ?', (usuario_id,))
        usuario = cursor.fetchone()
        
        if not usuario:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        if usuario['tipo_usuario'] != 'buscador':
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los usuarios (buscadores de empleo) pueden inscribirse a cursos"
            )
        
        # Verificar que el curso existe y está activo
        cursor.execute('SELECT id, titulo, activo FROM cursos WHERE id = ?', (curso_id,))
        curso = cursor.fetchone()
        
        if not curso:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Curso no encontrado"
            )
        
        if not curso['activo']:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El curso no está disponible para inscripción"
            )
        
        # Verificar si ya está inscrito
        cursor.execute('''
            SELECT id FROM inscripciones_cursos 
            WHERE usuario_id = ? AND curso_id = ?
        ''', (usuario_id, curso_id))
        
        inscripcion_existente = cursor.fetchone()
        
        if inscripcion_existente:
            conn.close()
            return {
                "message": "Ya estás inscrito en este curso",
                "inscripcion_id": inscripcion_existente['id'],
                "ya_inscrito": True
            }
        
        # Insertar la inscripción
        cursor.execute('''
            INSERT INTO inscripciones_cursos (usuario_id, curso_id, estado, progreso)
            VALUES (?, ?, 'no_iniciado', 0)
        ''', (usuario_id, curso_id))
        
        inscripcion_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "message": "Inscripción realizada exitosamente",
            "inscripcion_id": inscripcion_id,
            "curso_id": curso_id,
            "curso_titulo": curso['titulo'],
            "usuario_id": usuario_id,
            "ya_inscrito": False
        }
        
    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al inscribirse al curso: {str(e)}"
        )


@app.get("/api/session") 
def get_session(request: Request): 
    user_id = request.cookies.get("user_id") 
    if not user_id: 
        return {"logged": False} 
    try: 
        uid = int(user_id) 
    except Exception: 
        return {"logged": False} 
    try: 
        conn = sqlite3.connect(DB_PATH) 
        conn.row_factory = sqlite3.Row 
        cursor = conn.cursor() 
        cursor.execute("SELECT id, email, nombre, tipo_usuario FROM usuarios WHERE id = ?", (uid,)) 
        user = cursor.fetchone() 
        conn.close() 
        if not user: 
            return {"logged": False} 
        return {"logged": True, "session": dict(user)} 
    except Exception as e: return {"logged": False, "error": str(e)}
    




from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator, EmailStr
from datetime import datetime
from enum import Enum

# Enums para tipos de datos
class TipoUsuario(str, Enum):
    BUSCADOR = "buscador"
    EMPRESA = "empresa"

class EstadoPostulacion(str, Enum):
    REGISTRADA = "Registrada"
    EN_PROGRESO = "En progreso"
    APROBADA = "Aprobada"
    RECHAZADA = "Rechazada"
    CANCELADA = "Cancelada"

class ModalidadTrabajo(str, Enum):
    PRESENCIAL = "presencial"
    REMOTO = "remoto"
    HIBRIDO = "hibrido"

# Modelo Usuario
class Usuario(BaseModel):
    id: Optional[int] = Field(None, description="ID del usuario (autogenerado)")
    email: EmailStr = Field(..., description="Email del usuario")
    password: str = Field(..., min_length=6, description="Contraseña del usuario")
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre del usuario")
    tipo_usuario: TipoUsuario = Field(..., description="Tipo de usuario: buscador o empresa")
    fecha_creacion: Optional[datetime] = Field(None, description="Fecha de creación")
    fecha_actualizacion: Optional[datetime] = Field(None, description="Fecha de actualización")
    activo: bool = Field(True, description="Estado activo/inactivo")

    @validator('*', pre=True)
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

# Modelo Postulacion (RF3.3, RF3.4, RF3.5)
class Postulacion(BaseModel):
    id: Optional[int] = Field(None, description="ID de la postulación (autogenerado)")
    usuario_id: int = Field(..., description="ID del usuario que postula")
    oferta_id: int = Field(..., description="ID de la oferta de empleo")
    empresa: str = Field(..., min_length=1, max_length=100, description="Nombre de la empresa")
    puesto: str = Field(..., min_length=1, max_length=100, description="Puesto de trabajo")
    descripcion: Optional[str] = Field(None, max_length=1000, description="Descripción de la postulación")
    estado_actual: EstadoPostulacion = Field(EstadoPostulacion.REGISTRADA, description="Estado actual de la postulación")
    fecha_creacion: Optional[datetime] = Field(None, description="Fecha de creación")
    fecha_actualizacion: Optional[datetime] = Field(None, description="Fecha de actualización")
    salario: Optional[str] = Field(None, description="Rango salarial")
    ubicacion: Optional[str] = Field(None, description="Ubicación del trabajo")
    tags: Optional[List[str]] = Field(None, description="Lista de etiquetas/tags")

    @validator('*', pre=True)
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

# Modelo HistorialEstado (RF3.4 - Seguimiento)
class HistorialEstado(BaseModel):
    id: Optional[int] = Field(None, description="ID del historial (autogenerado)")
    postulacion_id: int = Field(..., description="ID de la postulación relacionada")
    estado_anterior: Optional[str] = Field(None, description="Estado anterior")
    estado_nuevo: str = Field(..., description="Nuevo estado")
    fecha_cambio: Optional[datetime] = Field(None, description="Fecha del cambio")
    usuario_cambio: str = Field(..., description="Quién realizó el cambio")
    observaciones: Optional[str] = Field(None, description="Observaciones del cambio")

    @validator('*', pre=True)
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

# Modelo PerfilBuscador (RF2.1)
class PerfilBuscador(BaseModel):
    id: Optional[int] = Field(None, description="ID del perfil (autogenerado)")
    usuario_id: int = Field(..., description="ID del usuario relacionado")
    identidad_genero: Optional[str] = Field(None, description="Identidad de género")
    condicion_discapacidad: Optional[str] = Field(None, description="Condición de discapacidad")
    informacion_academica: Optional[str] = Field(None, description="Información académica")
    experiencia_laboral: Optional[str] = Field(None, description="Experiencia laboral")
    habilidades: Optional[List[str]] = Field(None, description="Lista de habilidades")
    fecha_nacimiento: Optional[str] = Field(None, description="Fecha de nacimiento")
    telefono: Optional[str] = Field(None, description="Teléfono de contacto")
    ubicacion: Optional[str] = Field(None, description="Ubicación")
    cv_filename: Optional[str] = Field(None, description="Nombre del archivo CV")

    @validator('*', pre=True)
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

# Modelo Empresa (RF2.2)
class Empresa(BaseModel):
    id: Optional[int] = Field(None, description="ID de la empresa (autogenerado)")
    usuario_id: int = Field(..., description="ID del usuario relacionado")
    razon_social: str = Field(..., min_length=1, max_length=200, description="Razón social")
    nit: str = Field(..., min_length=1, max_length=20, description="NIT de la empresa")
    rut: Optional[str] = Field(None, description="RUT de la empresa")
    sector: Optional[str] = Field(None, description="Sector económico")
    direccion: Optional[str] = Field(None, description="Dirección")
    telefono: Optional[str] = Field(None, description="Teléfono")
    sitio_web: Optional[str] = Field(None, description="Sitio web")
    redes_sociales: Optional[List[str]] = Field(None, description="Redes sociales")
    actividad_economica: Optional[str] = Field(None, description="Actividad económica")
    tamano_empresa: Optional[str] = Field(None, description="Tamaño de la empresa")
    verificada: bool = Field(False, description="Empresa verificada")
    fecha_verificacion: Optional[datetime] = Field(None, description="Fecha de verificación")

    @validator('*', pre=True)
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

# Modelo OfertaEmpleo (RF3.1)
class OfertaEmpleo(BaseModel):
    id: Optional[int] = Field(None, description="ID de la oferta (autogenerado)")
    empresa_id: int = Field(..., description="ID de la empresa")
    titulo: str = Field(..., min_length=1, max_length=200, description="Título del puesto")
    descripcion: str = Field(..., min_length=1, description="Descripción del puesto")
    funciones: Optional[str] = Field(None, description="Funciones del puesto")
    requisitos: Optional[str] = Field(None, description="Requisitos")
    habilidades_requeridas: Optional[List[str]] = Field(None, description="Habilidades requeridas")
    ubicacion: str = Field(..., description="Ubicación")
    modalidad: ModalidadTrabajo = Field(..., description="Modalidad de trabajo")
    tipo_contrato: Optional[str] = Field(None, description="Tipo de contrato")
    jornada: Optional[str] = Field(None, description="Jornada laboral")
    salario_min: Optional[float] = Field(None, description="Salario mínimo")
    salario_max: Optional[float] = Field(None, description="Salario máximo")
    fecha_publicacion: Optional[datetime] = Field(None, description="Fecha de publicación")
    fecha_cierre: Optional[datetime] = Field(None, description="Fecha de cierre")
    activa: bool = Field(True, description="Oferta activa")

    @validator('*', pre=True)
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

# Modelo para crear postulaciones
class PostulacionCreate(BaseModel):
    usuario_id: int = Field(..., description="ID del usuario que postula")
    oferta_id: int = Field(..., description="ID de la oferta de empleo")
    empresa: str = Field(..., min_length=1, max_length=100, description="Nombre de la empresa")
    puesto: str = Field(..., min_length=1, max_length=100, description="Puesto de trabajo")
    descripcion: Optional[str] = Field(None, description="Descripción de la postulación")
    salario: Optional[str] = Field(None, description="Rango salarial")
    ubicacion: Optional[str] = Field(None, description="Ubicación del trabajo")
    tags: Optional[List[str]] = Field(None, description="Lista de etiquetas/tags")

    @validator('*', pre=True)
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

# Modelo para cambiar estado de postulación
class CambioEstadoRequest(BaseModel):
    nuevo_estado: EstadoPostulacion = Field(..., description="Nuevo estado de la postulación")
    usuario: str = Field("sistema", description="Quién realiza el cambio")
    observaciones: Optional[str] = Field(None, description="Observaciones del cambio")

    @validator('*', pre=True)
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

# Modelo para respuesta de postulación con historial
class PostulacionConHistorial(Postulacion):
    historial: List[HistorialEstado] = Field([], description="Historial de cambios de estado")
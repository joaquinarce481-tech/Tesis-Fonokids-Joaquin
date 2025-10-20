import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PatientProfile {
  id: number;
  datosPersonales: {
    nombreCompleto: string;
    fechaNacimiento: string;
    edad: number;
    sexo: 'Masculino' | 'Femenino' | 'Otro';
    numeroDocumento?: string;
    direccion?: string;
    telefonoPrincipal?: string;
    telefonoSecundario?: string;
    email?: string;
    username?: string;
  };
  tutores?: {
    id: number;
    nombreCompleto: string;
    relacion: string;
    telefonoPrincipal?: string;
    telefonoSecundario?: string;
    email?: string;
    direccion?: string;
    esContactoEmergencia: boolean;
    esResponsableLegal: boolean;
  }[];
  informacionFonoaudiologica?: {
    diagnostico?: string;
    dificultadesHabla?: string[];
    nivelLenguaje?: 'Inicial' | 'Intermedio' | 'Avanzado';
    objetivosTerapia?: string[];
    fechaInicioTerapia?: string;
    sesionesCompletadas?: number;
    progresoActual?: number;
    logrosAlcanzados?: string[];
    observacionesTerapeuta?: string;
  };
  estadisticasPracticas?: {
    tiempoTotalMinutos?: number;
    ejerciciosCompletados?: number;
    diasConsecutivos?: number;
    ejerciciosFavoritos?: string[];
    nivelDificultad?: 'Fácil' | 'Medio' | 'Difícil';
    puntuacionTotal?: number;
    insigniasObtenidas?: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = `${environment.backendLogin}/api`;
     
  // Estado reactivo del perfil actual
  private currentPatientSubject = new BehaviorSubject<PatientProfile | null>(null);
  public currentPatient$ = this.currentPatientSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Obtener headers de autenticación
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('fonokids_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // OBTENER PERFIL DEL USUARIO ACTUAL (usa /api/perfil)
  getPatientProfile(patientId?: number): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.get(`${this.apiUrl}/perfil`, { headers }).pipe(
      tap((response: any) => {
        if (response.success && response.data) {
          // Transformar datos del backend a la estructura del frontend
          const transformedData = this.transformBackendData(response.data);
          this.currentPatientSubject.next(transformedData);
        }
      })
    );
  }

  // ACTUALIZAR PERFIL DEL USUARIO ACTUAL (usa /api/perfil)
  updatePersonalData(patientId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    
    // Transformar datos del frontend al formato del backend
    const backendData = {
      nombre_completo: data.nombreCompleto,
      fecha_nacimiento: data.fechaNacimiento,
      sexo: data.sexo,
      numero_documento: data.numeroDocumento,
      direccion: data.direccion,
      telefono_principal: data.telefonoPrincipal,
      telefono_secundario: data.telefonoSecundario,
      email: data.email
    };
    
    return this.http.put(`${this.apiUrl}/perfil`, backendData, { headers }).pipe(
      tap((response: any) => {
        if (response.success) {
          // Recargar datos después de actualizar
          this.getPatientProfile().subscribe();
        }
      })
    );
  }

  // TRANSFORMAR DATOS DEL BACKEND AL FORMATO DEL FRONTEND
  private transformBackendData(backendData: any): PatientProfile {
    return {
      id: backendData.id_paciente,
      datosPersonales: {
        nombreCompleto: backendData.nombre_completo || '',
        fechaNacimiento: backendData.fecha_nacimiento || '',
        edad: backendData.edad || 0,
        sexo: backendData.sexo || 'Otro',
        numeroDocumento: backendData.numero_documento || '',
        direccion: backendData.direccion || '',
        telefonoPrincipal: backendData.telefono_principal || '',
        telefonoSecundario: backendData.telefono_secundario || '',
        email: backendData.email || '',
        username: backendData.username || ''
      },
      // Por ahora estas secciones estarán vacías hasta que implementes las tablas relacionadas
      informacionFonoaudiologica: {
        diagnostico: '',
        dificultadesHabla: [],
        nivelLenguaje: 'Inicial',
        objetivosTerapia: [],
        sesionesCompletadas: 0,
        progresoActual: 0,
        logrosAlcanzados: [],
        observacionesTerapeuta: ''
      },
      estadisticasPracticas: {
        tiempoTotalMinutos: 0,
        ejerciciosCompletados: 0,
        diasConsecutivos: 0,
        ejerciciosFavoritos: [],
        nivelDificultad: 'Fácil',
        puntuacionTotal: 0,
        insigniasObtenidas: []
      }
    };
  }

  // OBTENER PERFIL DE OTRO PACIENTE POR ID (para admin/terapeutas)
  getPatientById(patientId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.get(`${this.apiUrl}/perfil/${patientId}`, { headers }).pipe(
      tap((response: any) => {
        if (response.success && response.data) {
          const transformedData = this.transformBackendData(response.data);
          this.currentPatientSubject.next(transformedData);
        }
      })
    );
  }

  // Crear nuevo paciente (mantenemos para compatibilidad)
  createPatient(patientData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/pacientes`, patientData, { headers });
  }

  // Obtener todos los pacientes (para lista - solo admin/terapeutas)
  getAllPatients(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/pacientes`, { headers });
  }

  // Obtener paciente actual desde el estado
  getCurrentPatient(): PatientProfile | null {
    return this.currentPatientSubject.value;
  }

  // Actualizar información fonoaudiológica (cuando implementes esas tablas)
  updateClinicalInfo(patientId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    // TODO: Implementar cuando tengas las tablas de información fonoaudiológica
    return this.http.put(`${this.apiUrl}/clinical-info`, data, { headers });
  }

  // Actualizar estadísticas de prácticas (cuando implementes esas tablas)
  updateStatistics(patientId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    // TODO: Implementar cuando tengas las tablas de estadísticas
    return this.http.put(`${this.apiUrl}/statistics`, data, { headers });
  }

  // Limpiar estado
  clearCurrentPatient(): void {
    this.currentPatientSubject.next(null);
  }
}
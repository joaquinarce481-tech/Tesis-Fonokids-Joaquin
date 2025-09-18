import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

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
  informacionFonoaudiologica: {
    diagnostico?: string;
    dificultadesHabla: string[];
    nivelLenguaje: 'Inicial' | 'Intermedio' | 'Avanzado';
    objetivosTerapia: string[];
    fechaInicioTerapia?: string;
    sesionesCompletadas: number;
    progresoActual: number;
    logrosAlcanzados: string[];
    observacionesTerapeuta?: string;
  };
  estadisticasPracticas: {
    tiempoTotalMinutos: number;
    ejerciciosCompletados: number;
    diasConsecutivos: number;
    ejerciciosFavoritos: string[];
    nivelDificultad: 'Fácil' | 'Medio' | 'Difícil';
    puntuacionTotal: number;
    insigniasObtenidas: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = 'http://localhost:3001/api';
  
  // Estado reactivo del perfil actual
  private currentPatientSubject = new BehaviorSubject<PatientProfile | null>(null);
  public currentPatient$ = this.currentPatientSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Obtener perfil de paciente
  getPatientProfile(patientId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/pacientes/${patientId}`).pipe(
      tap((response: any) => {
        if (response.success) {
          this.currentPatientSubject.next(response.data);
        }
      })
    );
  }

  // Crear nuevo paciente
  createPatient(patientData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/pacientes`, patientData);
  }

  // Actualizar paciente
  updatePatient(patientId: number, patientData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/pacientes/${patientId}`, patientData).pipe(
      tap((response: any) => {
        if (response.success) {
          // Recargar datos después de actualizar
          this.getPatientProfile(patientId).subscribe();
        }
      })
    );
  }

  // Obtener todos los pacientes (para lista)
  getAllPatients(): Observable<any> {
    return this.http.get(`${this.apiUrl}/pacientes`);
  }

  // Obtener paciente actual desde el estado
  getCurrentPatient(): PatientProfile | null {
    return this.currentPatientSubject.value;
  }

  // Actualizar solo información personal
  updatePersonalData(patientId: number, data: any): Observable<any> {
    const updateData = {
      datosPersonales: data
    };
    return this.updatePatient(patientId, updateData);
  }

  // Actualizar información fonoaudiológica
  updateClinicalInfo(patientId: number, data: any): Observable<any> {
    const updateData = {
      informacionFonoaudiologica: data
    };
    return this.updatePatient(patientId, updateData);
  }

  // Actualizar estadísticas de prácticas
  updateStatistics(patientId: number, data: any): Observable<any> {
    const updateData = {
      estadisticasPracticas: data
    };
    return this.updatePatient(patientId, updateData);
  }

  // Limpiar estado
  clearCurrentPatient(): void {
    this.currentPatientSubject.next(null);
  }
}
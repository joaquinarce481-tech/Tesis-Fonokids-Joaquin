import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RegistrarActividadDto {
  id_paciente: number;
  tipo_actividad: 'juego_terapeutico' | 'ejercicio_praxia';
  nombre_actividad: string;
}

@Injectable({
  providedIn: 'root'
})
export class HistorialActividadesService {
  // ✅ CORREGIDO: Agregado /api/ antes de /historial-actividades
  private apiUrl = `${environment.backendApi}/api/historial-actividades`;

  constructor(private http: HttpClient) {
    console.log('🔧 HistorialActividadesService configurado:', this.apiUrl);
  }

  /**
   * Registra una nueva actividad en el historial
   * @param actividad Datos de la actividad a registrar
   */
  registrarActividad(actividad: RegistrarActividadDto): Observable<any> {
    console.log('📝 Registrando actividad:', actividad);
    return this.http.post(`${this.apiUrl}`, actividad);
  }

  /**
   * Obtiene el historial de actividades de un paciente
   * @param idPaciente ID del paciente
   */
  obtenerHistorial(idPaciente: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/paciente/${idPaciente}`);
  }

  /**
   * Método auxiliar para registrar un juego terapéutico
   * Obtiene automáticamente el ID del paciente del localStorage
   */
  registrarJuego(nombreJuego: string): Observable<any> {
    const idPaciente = this.obtenerIdPaciente();
    if (!idPaciente) {
      throw new Error('No se encontró ID de paciente');
    }

    return this.registrarActividad({
      id_paciente: idPaciente,
      tipo_actividad: 'juego_terapeutico',
      nombre_actividad: nombreJuego
    });
  }

  /**
   * Método auxiliar para registrar un ejercicio de praxia
   * Obtiene automáticamente el ID del paciente del localStorage
   */
  registrarEjercicio(nombreEjercicio: string): Observable<any> {
    const idPaciente = this.obtenerIdPaciente();
    if (!idPaciente) {
      throw new Error('No se encontró ID de paciente');
    }

    return this.registrarActividad({
      id_paciente: idPaciente,
      tipo_actividad: 'ejercicio_praxia',
      nombre_actividad: nombreEjercicio
    });
  }

  /**
   * Obtiene el ID del paciente desde el localStorage
   */
  private obtenerIdPaciente(): number | null {
    const userData = localStorage.getItem('fonokids_user');
    if (!userData) {
      return null;
    }

    const user = JSON.parse(userData);
    return user.id_paciente || user.id || null;
  }
}
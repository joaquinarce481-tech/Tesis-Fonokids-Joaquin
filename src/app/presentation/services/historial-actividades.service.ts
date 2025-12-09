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
  // ✅ USAR backendLogin (donde está el server.js con historial-actividades)
  private apiUrl = `${environment.backendLogin}/api/historial-actividades`;

  constructor(private http: HttpClient) {
    console.log('🔧 HistorialActividadesService configurado:', this.apiUrl);
  }

  registrarActividad(actividad: RegistrarActividadDto): Observable<any> {
    console.log('📝 Registrando actividad:', actividad);
    return this.http.post(`${this.apiUrl}`, actividad);
  }

  obtenerHistorial(idPaciente: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/paciente/${idPaciente}`);
  }

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

  private obtenerIdPaciente(): number | null {
    const userData = localStorage.getItem('fonokids_user');
    if (!userData) {
      return null;
    }

    const user = JSON.parse(userData);
    return user.id_paciente || user.id || null;
  }
}
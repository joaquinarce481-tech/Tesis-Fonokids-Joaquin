import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PatientService, PatientProfile } from '../../services/patient.service';
import { AuthService } from '../../presentation/services/auth.service';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.css']
})
export class MiPerfilComponent implements OnInit {
  profileForm: FormGroup;
  currentPatient: PatientProfile | null = null;
  isSaving = false;
  statusMessage = '';
  statusType: 'success' | 'error' = 'success';
  
  // Arrays para mostrar objetivos y dificultades
  objetivosTerapia: string[] = [];
  dificultadesHabla: string[] = [];
  
  // Edad calculada
  edadCalculada: number = 0;

  // Configuraciones locales (localStorage)
  private readonly CONFIG_STORAGE_KEY = 'fonokids_user_config';

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private authService: AuthService,
    private router: Router
  ) {
    // Inicializar arrays vacíos desde el constructor
    this.objetivosTerapia = [];
    this.dificultadesHabla = [];
    this.profileForm = this.createForm();
  }

  ngOnInit() {
    // Inicializar arrays vacíos para evitar errores de template
    this.objetivosTerapia = [];
    this.dificultadesHabla = [];
    
    this.loadPatientProfile();
    this.loadUserConfig();
    
    // Suscribirse a cambios en el paciente actual
    this.patientService.currentPatient$.subscribe(patient => {
      this.currentPatient = patient;
      if (patient) {
        this.updateForm(patient);
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      // Datos básicos que SÍ existen en la BD
      nombreCompleto: ['', [Validators.required]],
      email: ['', [Validators.email]],
      fechaNacimiento: ['', [Validators.required]],
      sexo: ['Otro'],
      numeroDocumento: [''],
      direccion: [''],
      telefonoPrincipal: [''],
      telefonoSecundario: [''],
      
      // Información fonoaudiológica (solo lectura)
      diagnostico: [{value: '', disabled: true}],
      nivelLenguaje: [{value: 'Inicial', disabled: true}],
      sesionesCompletadas: [{value: 0, disabled: true}],
      
      // Configuraciones locales (solo frontend)
      theme: ['auto'],
      notificationsEnabled: [true]
    });
  }

  loadPatientProfile() {
    // Verificar que el usuario esté autenticado
    const currentUser = this.authService.currentUser;
    
    if (!currentUser) {
      console.error('No hay usuario logueado');
      this.showStatus('Debes iniciar sesión para ver tu perfil', 'error');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('Cargando perfil para usuario:', currentUser.username);
    
    // El PatientService ya maneja la autenticación internamente
    this.patientService.getPatientProfile().subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Perfil cargado:', response.data);
          // No necesitamos updateForm porque el PatientService ya actualiza el BehaviorSubject
          this.showStatus('Perfil cargado correctamente', 'success');
        } else {
          console.warn('No se encontró perfil para este usuario');
          this.showStatus('No se encontró tu perfil. Contacta al administrador.', 'error');
        }
      },
      error: (error) => {
        console.error('Error cargando perfil:', error);
        
        if (error.status === 401 || error.status === 403) {
          this.showStatus('Tu sesión ha expirado. Inicia sesión nuevamente.', 'error');
          this.authService.logout();
        } else if (error.status === 404) {
          this.showStatus('No se encontró tu perfil. Contacta al administrador.', 'error');
        } else {
          this.showStatus('Error al cargar el perfil. Inténtalo de nuevo.', 'error');
        }
      }
    });
  }

  updateForm(patient: PatientProfile) {
    // Procesar objetivos y dificultades
    this.procesarObjetivos(patient.informacionFonoaudiologica?.objetivosTerapia);
    this.procesarDificultades(patient.informacionFonoaudiologica?.dificultadesHabla);

    // Actualizar formulario con datos de la BD
    this.profileForm.patchValue({
      nombreCompleto: patient.datosPersonales?.nombreCompleto || '',
      email: patient.datosPersonales?.email || '',
      fechaNacimiento: this.formatearFecha(patient.datosPersonales?.fechaNacimiento) || '',
      sexo: patient.datosPersonales?.sexo || 'Otro',
      numeroDocumento: patient.datosPersonales?.numeroDocumento || '',
      direccion: patient.datosPersonales?.direccion || '',
      telefonoPrincipal: patient.datosPersonales?.telefonoPrincipal || '',
      telefonoSecundario: patient.datosPersonales?.telefonoSecundario || '',
      
      // Información fonoaudiológica (solo lectura)
      diagnostico: patient.informacionFonoaudiologica?.diagnostico || '',
      nivelLenguaje: patient.informacionFonoaudiologica?.nivelLenguaje || 'Inicial',
      sesionesCompletadas: patient.informacionFonoaudiologica?.sesionesCompletadas || 0
    });
    
    // Calcular edad si hay fecha de nacimiento
    if (patient.datosPersonales?.fechaNacimiento) {
      this.calculateAge();
    }
  }

  // Formatear fecha de la BD (YYYY-MM-DD) para el input date
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '';
    
    // Si viene como timestamp o fecha con hora, extraer solo la parte de fecha
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return '';
    
    return fechaObj.toISOString().split('T')[0];
  }

  // Procesar objetivos que pueden venir como string separado por comas
  procesarObjetivos(objetivos: string | string[] | undefined) {
    // Siempre inicializar como array vacío primero
    this.objetivosTerapia = [];
    
    if (!objetivos) {
      return;
    }
    
    try {
      if (typeof objetivos === 'string' && objetivos.trim()) {
        // Si viene como string, separar por comas o puntos y comas
        this.objetivosTerapia = objetivos
          .split(/[,;]/)
          .map(obj => obj.trim())
          .filter(obj => obj.length > 0);
      } else if (Array.isArray(objetivos)) {
        this.objetivosTerapia = objetivos.filter(obj => obj && obj.toString().trim());
      }
    } catch (error) {
      console.error('Error procesando objetivos:', error);
      this.objetivosTerapia = [];
    }
  }

  // Procesar dificultades que pueden venir como string separado por comas
  procesarDificultades(dificultades: string | string[] | undefined) {
    // Siempre inicializar como array vacío primero
    this.dificultadesHabla = [];
    
    if (!dificultades) {
      return;
    }
    
    try {
      if (typeof dificultades === 'string' && dificultades.trim()) {
        this.dificultadesHabla = dificultades
          .split(/[,;]/)
          .map(dif => dif.trim())
          .filter(dif => dif.length > 0);
      } else if (Array.isArray(dificultades)) {
        this.dificultadesHabla = dificultades.filter(dif => dif && dif.toString().trim());
      }
    } catch (error) {
      console.error('Error procesando dificultades:', error);
      this.dificultadesHabla = [];
    }
  }

  calculateAge() {
    const birthDate = this.profileForm.get('fechaNacimiento')?.value;
    if (birthDate) {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      this.edadCalculada = age;
    }
  }

  saveProfile() {
    // Verificar autenticación
    const currentUser = this.authService.currentUser;
    
    if (!currentUser) {
      this.showStatus('Debes iniciar sesión para guardar cambios', 'error');
      this.router.navigate(['/login']);
      return;
    }
    
    if (this.profileForm.valid) {
      this.isSaving = true;
      
      const formData = this.profileForm.value;
      
      // Preparar datos para actualizar solo los campos editables
      const updateData = {
        nombreCompleto: formData.nombreCompleto,
        email: formData.email,
        fechaNacimiento: formData.fechaNacimiento,
        sexo: formData.sexo,
        numeroDocumento: formData.numeroDocumento,
        direccion: formData.direccion,
        telefonoPrincipal: formData.telefonoPrincipal,
        telefonoSecundario: formData.telefonoSecundario
      };

      // El PatientService ya maneja el userId internamente
      this.patientService.updatePersonalData(0, updateData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showStatus('Perfil actualizado correctamente', 'success');
            this.profileForm.markAsPristine();
            // Guardar configuraciones locales
            this.saveUserConfig();
          } else {
            this.showStatus('Error al actualizar el perfil', 'error');
          }
        },
        error: (error) => {
          console.error('Error actualizando perfil:', error);
          
          if (error.status === 401 || error.status === 403) {
            this.showStatus('Tu sesión ha expirado. Inicia sesión nuevamente.', 'error');
            this.authService.logout();
          } else {
            this.showStatus('Error al actualizar el perfil', 'error');
          }
        },
        complete: () => {
          this.isSaving = false;
        }
      });
    } else {
      this.showStatus('Por favor completa los campos obligatorios', 'error');
    }
  }

  // === CONFIGURACIONES LOCALES (Solo Frontend) ===
  
  loadUserConfig() {
    const config = localStorage.getItem(this.CONFIG_STORAGE_KEY);
    if (config) {
      try {
        const userConfig = JSON.parse(config);
        this.profileForm.patchValue({
          theme: userConfig.theme || 'auto',
          notificationsEnabled: userConfig.notifications !== undefined ? userConfig.notifications : true
        });
        
        // Aplicar tema guardado
        this.applyTheme(userConfig.theme || 'auto');
      } catch (error) {
        console.error('Error cargando configuración local:', error);
      }
    }
  }

  saveUserConfig() {
    const config = {
      theme: this.profileForm.get('theme')?.value,
      notifications: this.profileForm.get('notificationsEnabled')?.value,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(config));
  }

  updateTheme() {
    const theme = this.profileForm.get('theme')?.value;
    this.applyTheme(theme);
    this.saveUserConfig();
    this.showStatus('Tema actualizado', 'success');
  }

  updateNotifications() {
    this.saveUserConfig();
    const enabled = this.profileForm.get('notificationsEnabled')?.value;
    this.showStatus(enabled ? 'Notificaciones activadas' : 'Notificaciones desactivadas', 'success');
  }

  private applyTheme(theme: string) {
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme');
    
    if (theme === 'light') {
      body.classList.add('light-theme');
    } else if (theme === 'dark') {
      body.classList.add('dark-theme');
    }
    // 'auto' no agrega clase, usa el CSS por defecto
  }

  showStatus(message: string, type: 'success' | 'error') {
    this.statusMessage = message;
    this.statusType = type;
    
    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
      this.statusMessage = '';
    }, 3000);
  }

  // Navegar de vuelta al dashboard
  volverAlDashboard() {
    console.log('Navegando al dashboard');
    this.router.navigate(['/dashboard']);
  }

  // Getter para facilitar validaciones en el template
  get f() {
    return this.profileForm.controls;
  }

  // Método para verificar si un campo tiene errores
  hasFieldError(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Método para obtener el mensaje de error de un campo
  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return 'Este campo es obligatorio';
      }
      if (field.errors['email']) {
        return 'Ingrese un email válido';
      }
    }
    return '';
  }
}
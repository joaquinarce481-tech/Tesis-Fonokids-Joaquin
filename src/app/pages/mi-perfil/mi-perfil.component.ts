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
  
  // Edad calculada
  edadCalculada: number = 0;

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.createForm();
  }

  ngOnInit() {
    this.loadPatientProfile();
    
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
      // Solo datos personales editables
      nombreCompleto: ['', [Validators.required]],
      email: ['', [Validators.email]],
      fechaNacimiento: ['', [Validators.required]],
      sexo: ['Otro'],
      numeroDocumento: [''],
      direccion: [''],
      telefonoPrincipal: [''],
      telefonoSecundario: ['']
    });
  }

  loadPatientProfile() {
    const currentUser = this.authService.currentUser;
    
    if (!currentUser) {
      console.error('No hay usuario logueado');
      this.showStatus('Debes iniciar sesión para ver tu perfil', 'error');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('Cargando perfil para usuario:', currentUser.username);
    
    this.patientService.getPatientProfile().subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Perfil cargado:', response.data);
          this.showStatus('Perfil cargado correctamente', 'success');
        } else {
          console.warn('No se encontró perfil para este usuario');
          this.showStatus('No se encontró tu perfil. Contacta al administrador.', 'error');
        }
      },
      error: (error) => {
        console.error('❌ Error cargando perfil:', error);
        
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
    this.profileForm.patchValue({
      nombreCompleto: patient.datosPersonales?.nombreCompleto || '',
      email: patient.datosPersonales?.email || '',
      fechaNacimiento: this.formatearFecha(patient.datosPersonales?.fechaNacimiento) || '',
      sexo: patient.datosPersonales?.sexo || 'Otro',
      numeroDocumento: patient.datosPersonales?.numeroDocumento || '',
      direccion: patient.datosPersonales?.direccion || '',
      telefonoPrincipal: patient.datosPersonales?.telefonoPrincipal || '',
      telefonoSecundario: patient.datosPersonales?.telefonoSecundario || ''
    });
    
    // Calcular edad si hay fecha de nacimiento
    if (patient.datosPersonales?.fechaNacimiento) {
      this.calculateAge();
    }
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return '';
    
    return fechaObj.toISOString().split('T')[0];
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
    const currentUser = this.authService.currentUser;
    
    if (!currentUser) {
      this.showStatus('Debes iniciar sesión para guardar cambios', 'error');
      this.router.navigate(['/login']);
      return;
    }
    
    if (this.profileForm.valid) {
      this.isSaving = true;
      
      const formData = this.profileForm.value;
      
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

      this.patientService.updatePersonalData(0, updateData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showStatus('✅ Perfil actualizado correctamente', 'success');
            this.profileForm.markAsPristine();
          } else {
            this.showStatus('❌ Error al actualizar el perfil', 'error');
          }
        },
        error: (error) => {
          console.error('❌ Error actualizando perfil:', error);
          
          if (error.status === 401 || error.status === 403) {
            this.showStatus('Tu sesión ha expirado. Inicia sesión nuevamente.', 'error');
            this.authService.logout();
          } else {
            this.showStatus('❌ Error al actualizar el perfil', 'error');
          }
        },
        complete: () => {
          this.isSaving = false;
        }
      });
    } else {
      this.showStatus('⚠️ Por favor completa los campos obligatorios', 'error');
    }
  }

  showStatus(message: string, type: 'success' | 'error') {
    this.statusMessage = message;
    this.statusType = type;
    
    setTimeout(() => {
      this.statusMessage = '';
    }, 4000);
  }

  volverAlDashboard() {
    console.log('🏠 Navegando al dashboard');
    this.router.navigate(['/dashboard']);
  }

  get f() {
    return this.profileForm.controls;
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

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
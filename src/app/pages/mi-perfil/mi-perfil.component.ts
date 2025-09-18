import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PatientService, PatientProfile } from '../../services/patient.service';

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

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService
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
      // Datos básicos de identificación
      nombreCompleto: ['', [Validators.required]],
      email: ['', [Validators.email]],
      fechaNacimiento: ['', [Validators.required]],
      sexo: ['Otro'],
      numeroDocumento: [''],
      direccion: [''],
      telefonoPrincipal: [''],
      telefonoSecundario: [''],
      
      // Información fonoaudiológica
      diagnostico: [''],
      nivelLenguaje: [{value: 'Inicial', disabled: false}], // Sin disabled por defecto
      sesionesCompletadas: [0],
      
      // Tutores/Padres - campos básicos
      nombreTutor1: [''],
      telefonoTutor1: [''],
      relacionTutor1: ['Padre/Madre'],
      nombreTutor2: [''],
      telefonoTutor2: [''],
      relacionTutor2: ['Padre/Madre'],
      
      // Configuraciones adicionales que pueden aparecer en el HTML
      theme: ['auto'],
      notificationsEnabled: [true]
    });
  }

  // Método para calcular edad automáticamente
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

  loadPatientProfile() {
    // Por ahora usar ID fijo, después se obtiene del login/routing
    const patientId = 1;
    
    this.patientService.getPatientProfile(patientId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Perfil cargado:', response.data);
          this.updateForm(response.data);
          this.showStatus('Perfil cargado correctamente', 'success');
        }
      },
      error: (error) => {
        console.error('Error cargando perfil:', error);
        this.showStatus('Error al cargar el perfil', 'error');
      }
    });
  }

  updateForm(patient: PatientProfile) {
    // Actualizar arrays
    this.objetivosTerapia = patient.informacionFonoaudiologica?.objetivosTerapia || [];
    this.dificultadesHabla = patient.informacionFonoaudiologica?.dificultadesHabla || [];

    // Actualizar formulario
    this.profileForm.patchValue({
      nombreCompleto: patient.datosPersonales?.nombreCompleto || '',
      email: patient.datosPersonales?.email || '',
      fechaNacimiento: patient.datosPersonales?.fechaNacimiento || '',
      sexo: patient.datosPersonales?.sexo || 'Otro',
      numeroDocumento: patient.datosPersonales?.numeroDocumento || '',
      direccion: patient.datosPersonales?.direccion || '',
      telefonoPrincipal: patient.datosPersonales?.telefonoPrincipal || '',
      telefonoSecundario: patient.datosPersonales?.telefonoSecundario || '',
      
      diagnostico: patient.informacionFonoaudiologica?.diagnostico || '',
      nivelLenguaje: patient.informacionFonoaudiologica?.nivelLenguaje || 'Inicial',
      sesionesCompletadas: patient.informacionFonoaudiologica?.sesionesCompletadas || 0,
      
      // Tutores si existen
      nombreTutor1: patient.tutores?.[0]?.nombreCompleto || '',
      telefonoTutor1: patient.tutores?.[0]?.telefonoPrincipal || '',
      relacionTutor1: patient.tutores?.[0]?.relacion || 'Padre/Madre',
      nombreTutor2: patient.tutores?.[1]?.nombreCompleto || '',
      telefonoTutor2: patient.tutores?.[1]?.telefonoPrincipal || '',
      relacionTutor2: patient.tutores?.[1]?.relacion || 'Padre/Madre'
    });
    
    // Calcular edad si hay fecha de nacimiento
    if (patient.datosPersonales?.fechaNacimiento) {
      this.calculateAge();
    }
  }

  saveProfile() {
    if (this.profileForm.valid && this.currentPatient) {
      this.isSaving = true;
      
      const formData = this.profileForm.value;
      const updateData = {
        datosPersonales: {
          nombreCompleto: formData.nombreCompleto,
          email: formData.email,
          fechaNacimiento: formData.fechaNacimiento,
          sexo: formData.sexo,
          numeroDocumento: formData.numeroDocumento,
          direccion: formData.direccion,
          telefonoPrincipal: formData.telefonoPrincipal,
          telefonoSecundario: formData.telefonoSecundario
        },
        informacionFonoaudiologica: {
          diagnostico: formData.diagnostico,
          nivelLenguaje: formData.nivelLenguaje
        }
      };

      this.patientService.updatePersonalData(this.currentPatient.id, updateData.datosPersonales).subscribe({
        next: (response) => {
          if (response.success) {
            this.showStatus('Perfil actualizado correctamente', 'success');
            this.profileForm.markAsPristine();
          }
        },
        error: (error) => {
          console.error('Error actualizando perfil:', error);
          this.showStatus('Error al actualizar el perfil', 'error');
        },
        complete: () => {
          this.isSaving = false;
        }
      });
    } else {
      this.showStatus('Por favor completa los campos obligatorios', 'error');
    }
  }

  // Método para habilitar/deshabilitar campos dinámicamente
  toggleFieldDisabled(fieldName: string, disabled: boolean = true) {
    const field = this.profileForm.get(fieldName);
    if (field) {
      if (disabled) {
        field.disable();
      } else {
        field.enable();
      }
    }
  }

  // Método para agregar objetivo de terapia
  addTherapyGoal(goal: string) {
    if (goal.trim() && !this.objetivosTerapia.includes(goal.trim())) {
      this.objetivosTerapia.push(goal.trim());
    }
  }

  // Método para remover objetivo de terapia
  removeTherapyGoal(index: number) {
    if (index >= 0 && index < this.objetivosTerapia.length) {
      this.objetivosTerapia.splice(index, 1);
    }
  }

  showStatus(message: string, type: 'success' | 'error') {
    this.statusMessage = message;
    this.statusType = type;
    
    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
      this.statusMessage = '';
    }, 3000);
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
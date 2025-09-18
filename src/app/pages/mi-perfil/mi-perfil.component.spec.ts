import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MiPerfilComponent } from './mi-perfil.component';
import { PatientService } from '../../services/patient.service';

// Mock del PatientService
const mockPatientService = {
  currentPatient$: of(null),
  getPatientProfile: jasmine.createSpy('getPatientProfile').and.returnValue(
    of({ success: false, data: null })
  ),
  updatePersonalData: jasmine.createSpy('updatePersonalData').and.returnValue(
    of({ success: true })
  )
};

describe('MiPerfilComponent', () => {
  let component: MiPerfilComponent;
  let fixture: ComponentFixture<MiPerfilComponent>;
  let patientService: jasmine.SpyObj<PatientService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MiPerfilComponent,
        ReactiveFormsModule
      ],
      providers: [
        { provide: PatientService, useValue: mockPatientService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MiPerfilComponent);
    component = fixture.componentInstance;
    patientService = TestBed.inject(PatientService) as jasmine.SpyObj<PatientService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.profileForm).toBeDefined();
    expect(component.profileForm.get('nombreCompleto')?.value).toBe('');
    expect(component.profileForm.get('sexo')?.value).toBe('Otro');
    expect(component.profileForm.get('nivelLenguaje')?.value).toBe('Inicial');
  });

  it('should calculate age correctly', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 25);
    
    component.profileForm.patchValue({
      fechaNacimiento: birthDate.toISOString().split('T')[0]
    });
    
    component.calculateAge();
    expect(component.edadCalculada).toBe(25);
  });

  it('should validate required fields', () => {
    const nombreField = component.profileForm.get('nombreCompleto');
    expect(nombreField?.invalid).toBeTruthy();
    
    nombreField?.setValue('Juan Pérez');
    expect(nombreField?.valid).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailField = component.profileForm.get('email');
    
    emailField?.setValue('invalid-email');
    expect(emailField?.invalid).toBeTruthy();
    
    emailField?.setValue('test@example.com');
    expect(emailField?.valid).toBeTruthy();
  });

  it('should show status messages', () => {
    component.showStatus('Test message', 'success');
    expect(component.statusMessage).toBe('Test message');
    expect(component.statusType).toBe('success');
  });

  it('should add therapy goals', () => {
    component.addTherapyGoal('Mejorar pronunciación');
    expect(component.objetivosTerapia).toContain('Mejorar pronunciación');
    
    // No debe agregar duplicados
    component.addTherapyGoal('Mejorar pronunciación');
    expect(component.objetivosTerapia.length).toBe(1);
  });

  it('should remove therapy goals', () => {
    component.objetivosTerapia = ['Goal 1', 'Goal 2', 'Goal 3'];
    component.removeTherapyGoal(1);
    expect(component.objetivosTerapia).toEqual(['Goal 1', 'Goal 3']);
  });

  it('should toggle field disabled state', () => {
    const field = component.profileForm.get('nivelLenguaje');
    
    component.toggleFieldDisabled('nivelLenguaje', true);
    expect(field?.disabled).toBeTruthy();
    
    component.toggleFieldDisabled('nivelLenguaje', false);
    expect(field?.enabled).toBeTruthy();
  });

  it('should detect field errors correctly', () => {
    const nombreField = component.profileForm.get('nombreCompleto');
    nombreField?.markAsTouched();
    
    expect(component.hasFieldError('nombreCompleto')).toBeTruthy();
    expect(component.getFieldError('nombreCompleto')).toBe('Este campo es obligatorio');
  });

  it('should handle save profile with valid data', () => {
    // Simular un paciente actual
    component.currentPatient = { id: 1 } as any;
    
    // Hacer el formulario válido
    component.profileForm.patchValue({
      nombreCompleto: 'Juan Pérez',
      fechaNacimiento: '2000-01-01'
    });
    
    component.saveProfile();
    
    expect(patientService.updatePersonalData).toHaveBeenCalled();
  });

  it('should handle save profile with invalid data', () => {
    component.currentPatient = { id: 1 } as any;
    
    // Dejar campos requeridos vacíos
    component.profileForm.patchValue({
      nombreCompleto: '',
      fechaNacimiento: ''
    });
    
    component.saveProfile();
    
    expect(component.statusMessage).toBe('Por favor completa los campos obligatorios');
    expect(component.statusType).toBe('error');
  });
});
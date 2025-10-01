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

  it('should initialize arrays correctly', () => {
    expect(component.objetivosTerapia).toEqual([]);
    expect(component.dificultadesHabla).toEqual([]);
    expect(component.edadCalculada).toBe(0);
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

  it('should process objectives correctly', () => {
    // Test con string separado por comas
    component.procesarObjetivos('Objetivo 1, Objetivo 2, Objetivo 3');
    expect(component.objetivosTerapia).toEqual(['Objetivo 1', 'Objetivo 2', 'Objetivo 3']);
    
    // Test con array
    component.procesarObjetivos(['Objetivo A', 'Objetivo B']);
    expect(component.objetivosTerapia).toEqual(['Objetivo A', 'Objetivo B']);
    
    // Test con undefined
    component.procesarObjetivos(undefined);
    expect(component.objetivosTerapia).toEqual([]);
  });

  it('should process difficulties correctly', () => {
    // Test con string separado por comas
    component.procesarDificultades('Dificultad 1; Dificultad 2');
    expect(component.dificultadesHabla).toEqual(['Dificultad 1', 'Dificultad 2']);
    
    // Test con array
    component.procesarDificultades(['Dificultad A', 'Dificultad B']);
    expect(component.dificultadesHabla).toEqual(['Dificultad A', 'Dificultad B']);
    
    // Test con undefined
    component.procesarDificultades(undefined);
    expect(component.dificultadesHabla).toEqual([]);
  });

  it('should format dates correctly', () => {
    const testDate = '2023-12-25T10:30:00.000Z';
    const formattedDate = component.formatearFecha(testDate);
    expect(formattedDate).toBe('2023-12-25');
    
    // Test con fecha undefined
    const emptyDate = component.formatearFecha(undefined);
    expect(emptyDate).toBe('');
  });

  it('should detect field errors correctly', () => {
    const nombreField = component.profileForm.get('nombreCompleto');
    nombreField?.markAsTouched();
    
    expect(component.hasFieldError('nombreCompleto')).toBeTruthy();
    expect(component.getFieldError('nombreCompleto')).toBe('Este campo es obligatorio');
  });

  it('should handle user config correctly', () => {
    // Simular configuración guardada
    const mockConfig = {
      theme: 'dark',
      notifications: false
    };
    
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(mockConfig));
    
    component.loadUserConfig();
    
    expect(component.profileForm.get('theme')?.value).toBe('dark');
    expect(component.profileForm.get('notificationsEnabled')?.value).toBe(false);
  });

  it('should save user config correctly', () => {
    spyOn(localStorage, 'setItem');
    
    component.profileForm.patchValue({
      theme: 'light',
      notificationsEnabled: true
    });
    
    component.saveUserConfig();
    
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'fonokids_user_config', 
      jasmine.stringMatching(/"theme":"light"/)
    );
  });

  it('should handle theme updates', () => {
    spyOn(component, 'saveUserConfig');
    spyOn(component, 'showStatus');
    
    component.profileForm.patchValue({ theme: 'dark' });
    component.updateTheme();
    
    expect(component.saveUserConfig).toHaveBeenCalled();
    expect(component.showStatus).toHaveBeenCalledWith('Tema actualizado', 'success');
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

  it('should handle save profile without current patient', () => {
    component.currentPatient = null;
    
    component.profileForm.patchValue({
      nombreCompleto: 'Juan Pérez',
      fechaNacimiento: '2000-01-01'
    });
    
    component.saveProfile();
    
    expect(component.statusMessage).toBe('Por favor completa los campos obligatorios');
    expect(component.statusType).toBe('error');
  });
});
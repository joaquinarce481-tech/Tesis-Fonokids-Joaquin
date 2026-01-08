import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EjerciciosOrofacialesComponent } from './ejercicios-orofaciales.component';

describe('EjerciciosOrofacialesComponent', () => {
  let component: EjerciciosOrofacialesComponent;
  let fixture: ComponentFixture<EjerciciosOrofacialesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EjerciciosOrofacialesComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(EjerciciosOrofacialesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

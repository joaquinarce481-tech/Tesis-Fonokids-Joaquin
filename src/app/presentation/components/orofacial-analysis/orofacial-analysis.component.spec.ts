import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrofacialAnalysisComponent } from './orofacial-analysis.component';

describe('OrofacialAnalysisComponent', () => {
  let component: OrofacialAnalysisComponent;
  let fixture: ComponentFixture<OrofacialAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrofacialAnalysisComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OrofacialAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

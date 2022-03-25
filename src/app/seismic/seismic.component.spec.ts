import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SeismicComponent } from './seismic.component';

describe('SeismicComponent', () => {
  let component: SeismicComponent;
  let fixture: ComponentFixture<SeismicComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SeismicComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SeismicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SeismicComponent } from './seismic.component';

describe('SeismicComponent', () => {
  let component: SeismicComponent;
  let fixture: ComponentFixture<SeismicComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [SeismicComponent],
    teardown: { destroyAfterEach: false }
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

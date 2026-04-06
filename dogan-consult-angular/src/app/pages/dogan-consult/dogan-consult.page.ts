import { Component } from '@angular/core';
import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { SolutionsComponent } from '../../components/solutions/solutions.component';
import { FeaturesSectionComponent } from '../../components/features-section/features-section.component';
import { TechnologyVisionComponent } from '../../components/technology-vision/technology-vision.component';
import { ServicesComponent } from '../../components/services/services.component';
import { TestimonialsComponent } from '../../components/testimonials/testimonials.component';

@Component({
  selector: 'app-dogan-consult-page',
  imports: [
    HeroSectionComponent, SolutionsComponent, FeaturesSectionComponent,
    TechnologyVisionComponent, ServicesComponent, TestimonialsComponent,
  ],
  template: `
    <app-hero-section />
    <app-solutions />
    <app-features-section />
    <app-technology-vision />
    <app-services />
    <app-testimonials />
  `,
})
export class DoganConsultPage {}

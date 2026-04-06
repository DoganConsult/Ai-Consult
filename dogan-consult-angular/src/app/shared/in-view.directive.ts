import { Directive, ElementRef, inject, output, afterNextRender, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appInView]',
})
export class InViewDirective implements OnDestroy {
  private el = inject(ElementRef);
  private observer: IntersectionObserver | null = null;

  inView = output<boolean>();

  constructor() {
    afterNextRender(() => {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.inView.emit(true);
            this.observer?.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      this.observer.observe(this.el.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}

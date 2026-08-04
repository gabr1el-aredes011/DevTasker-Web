import { isPlatformBrowser } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    NgZone,
    OnDestroy,
    PLATFORM_ID,
    ViewChild,
    inject,
} from '@angular/core';

interface AuthParticle {
    x: number;
    y: number;

    velocityX: number;
    velocityY: number;

    radius: number;
    phase: number;
}

interface PointerPosition {
    x: number;
    y: number;
    active: boolean;
}

@Component({
    selector: 'app-auth-particles',
    standalone: true,
    templateUrl: './auth-particles.component.html',
    styleUrl: './auth-particles.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthParticlesComponent
    implements AfterViewInit, OnDestroy {
    @ViewChild('particlesCanvas', {
        static: true,
    })
    private particlesCanvas!: ElementRef<HTMLCanvasElement>;

    private readonly platformId = inject(PLATFORM_ID);
    private readonly zone = inject(NgZone);

    private context: CanvasRenderingContext2D | null = null;

    private animationFrameId: number | null = null;
    private resizeObserver: ResizeObserver | null = null;

    private particles: AuthParticle[] = [];

    private width = 0;
    private height = 0;
    private devicePixelRatio = 1;

    private previousTimestamp = 0;
    private reducedMotion = false;

    private readonly pointer: PointerPosition = {
        x: 0,
        y: 0,
        active: false,
    };

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.zone.runOutsideAngular(() => {
            this.initializeCanvas();
        });
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (this.animationFrameId !== null) {
            window.cancelAnimationFrame(
                this.animationFrameId,
            );
        }

        this.resizeObserver?.disconnect();

        window.removeEventListener(
            'pointermove',
            this.handlePointerMove,
        );

        window.removeEventListener(
            'pointerout',
            this.handlePointerOut,
        );

        window.removeEventListener(
            'blur',
            this.deactivatePointer,
        );
    }

    private initializeCanvas(): void {
        const canvas =
            this.particlesCanvas.nativeElement;

        this.context = canvas.getContext('2d');

        if (!this.context) {
            return;
        }

        this.reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        window.addEventListener(
            'pointermove',
            this.handlePointerMove,
            {
                passive: true,
            },
        );

        window.addEventListener(
            'pointerout',
            this.handlePointerOut,
            {
                passive: true,
            },
        );

        window.addEventListener(
            'blur',
            this.deactivatePointer,
        );

        this.resizeObserver = new ResizeObserver(
            () => {
                this.resizeCanvas();
            },
        );

        this.resizeObserver.observe(canvas);

        this.resizeCanvas();

        if (this.reducedMotion) {
            this.renderFrame(0);
            return;
        }

        this.animationFrameId =
            window.requestAnimationFrame(
                this.animate,
            );
    }

    private resizeCanvas(): void {
        const canvas =
            this.particlesCanvas.nativeElement;

        const bounds =
            canvas.getBoundingClientRect();

        if (
            bounds.width <= 0 ||
            bounds.height <= 0
        ) {
            return;
        }

        this.width = bounds.width;
        this.height = bounds.height;

        this.devicePixelRatio = Math.min(
            window.devicePixelRatio || 1,
            2,
        );

        canvas.width = Math.round(
            this.width * this.devicePixelRatio,
        );

        canvas.height = Math.round(
            this.height * this.devicePixelRatio,
        );

        canvas.style.width = `${this.width}px`;
        canvas.style.height = `${this.height}px`;

        this.context?.setTransform(
            this.devicePixelRatio,
            0,
            0,
            this.devicePixelRatio,
            0,
            0,
        );

        this.createParticles();

        if (this.reducedMotion) {
            this.renderFrame(0);
        }
    }

    private createParticles(): void {
        const isCompactViewport =
            this.width < 640;

        const calculatedAmount = Math.round(
            (this.width * this.height) / 18000,
        );

        const particleAmount = isCompactViewport
            ? 26
            : Math.min(
                96,
                Math.max(44, calculatedAmount),
            );

        this.particles = Array.from(
            {
                length: particleAmount,
            },
            () => ({
                x: Math.random() * this.width,
                y: Math.random() * this.height,

                velocityX:
                    (Math.random() - 0.5) * 0.62,

                velocityY:
                    (Math.random() - 0.5) * 0.62,

                radius:
                    1.4 + Math.random() * 2.1,

                phase:
                    Math.random() * Math.PI * 2,
            }),
        );
    }

    private readonly animate = (
        timestamp: number,
    ): void => {
        const elapsed =
            this.previousTimestamp === 0
                ? 16.67
                : timestamp - this.previousTimestamp;

        this.previousTimestamp = timestamp;

        const delta = Math.min(
            elapsed / 16.67,
            2,
        );

        this.updateParticles(delta, timestamp,);
        this.renderFrame(timestamp);

        this.animationFrameId =
            window.requestAnimationFrame(
                this.animate,
            );
    };

    private updateParticles(
        delta: number,
        timestamp: number,
    ): void {
        const influenceRadius = 260;
        const repulsionRadius = 74;
        const maximumSpeed = 0.95;

        for (const particle of this.particles) {

            const driftAngle =
                particle.phase +
                timestamp * 0.00022;

            particle.velocityX +=
                Math.cos(driftAngle) *
                0.0018 *
                delta;

            particle.velocityY +=
                Math.sin(driftAngle * 1.17) *
                0.0015 *
                delta;
            if (this.pointer.active) {
                const differenceX =
                    this.pointer.x - particle.x;

                const differenceY =
                    this.pointer.y - particle.y;

                const distance = Math.hypot(
                    differenceX,
                    differenceY,
                );

                if (
                    distance > 0 &&
                    distance < influenceRadius
                ) {
                    const proximity =
                        1 - distance / influenceRadius;

                    const direction =
                        distance < repulsionRadius
                            ? -1
                            : 1;

                    const force =
                        proximity *
                        0.018 *
                        direction *
                        delta;

                    particle.velocityX +=
                        (differenceX / distance) * force;

                    particle.velocityY +=
                        (differenceY / distance) * force;
                }
            }

            particle.velocityX *= 0.9992;
            particle.velocityY *= 0.9992;

            const currentSpeed = Math.hypot(
                particle.velocityX,
                particle.velocityY,
            );

            if (currentSpeed > maximumSpeed) {
                const correction =
                    maximumSpeed / currentSpeed;

                particle.velocityX *= correction;
                particle.velocityY *= correction;
            }

            particle.x +=
                particle.velocityX * delta;

            particle.y +=
                particle.velocityY * delta;

            /*
             * Quando sai da tela, reaparece
             * suavemente no lado oposto.
             */
            if (particle.x < -20) {
                particle.x = this.width + 20;
            }

            if (particle.x > this.width + 20) {
                particle.x = -20;
            }

            if (particle.y < -20) {
                particle.y = this.height + 20;
            }

            if (particle.y > this.height + 20) {
                particle.y = -20;
            }
        }
    }

    private renderFrame(
        timestamp: number,
    ): void {
        const context = this.context;

        if (!context) {
            return;
        }

        context.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        this.drawPointerGlow(context);
        this.drawParticleConnections(context);
        this.drawPointerConnections(context);
        this.drawParticles(context, timestamp);
        this.drawPointerIndicator(context);
    }

    private drawPointerGlow(
        context: CanvasRenderingContext2D,
    ): void {
        if (!this.pointer.active) {
            return;
        }

        const glowRadius = 240;

        const gradient =
            context.createRadialGradient(
                this.pointer.x,
                this.pointer.y,
                0,
                this.pointer.x,
                this.pointer.y,
                glowRadius,
            );

        gradient.addColorStop(
            0,
            'rgba(34, 237, 95, 0.10)',
        );

        gradient.addColorStop(
            0.35,
            'rgba(34, 237, 95, 0.045)',
        );

        gradient.addColorStop(
            1,
            'rgba(34, 237, 95, 0)',
        );

        context.save();

        context.fillStyle = gradient;

        context.fillRect(
            this.pointer.x - glowRadius,
            this.pointer.y - glowRadius,
            glowRadius * 2,
            glowRadius * 2,
        );

        context.restore();
    }

    private drawParticleConnections(
        context: CanvasRenderingContext2D,
    ): void {
        const connectionDistance = 158;

        context.save();
        context.lineWidth = 0.75;

        for (
            let firstIndex = 0;
            firstIndex < this.particles.length;
            firstIndex += 1
        ) {
            const firstParticle =
                this.particles[firstIndex];

            for (
                let secondIndex = firstIndex + 1;
                secondIndex < this.particles.length;
                secondIndex += 1
            ) {
                const secondParticle =
                    this.particles[secondIndex];

                const distance = Math.hypot(
                    firstParticle.x - secondParticle.x,
                    firstParticle.y - secondParticle.y,
                );

                if (distance > connectionDistance) {
                    continue;
                }

                const opacity =
                    (1 - distance / connectionDistance) *
                    0.17;

                context.beginPath();

                context.moveTo(
                    firstParticle.x,
                    firstParticle.y,
                );

                context.lineTo(
                    secondParticle.x,
                    secondParticle.y,
                );

                context.strokeStyle =
                    `rgba(70, 255, 120, ${opacity})`;

                context.stroke();
            }
        }

        context.restore();
    }

    private drawPointerConnections(
        context: CanvasRenderingContext2D,
    ): void {
        if (!this.pointer.active) {
            return;
        }

        const connectionDistance = 230;

        context.save();
        context.lineWidth = 1;

        for (const particle of this.particles) {
            const distance = Math.hypot(
                particle.x - this.pointer.x,
                particle.y - this.pointer.y,
            );

            if (distance > connectionDistance) {
                continue;
            }

            const opacity =
                (1 - distance / connectionDistance) *
                0.42;

            context.beginPath();

            context.moveTo(
                particle.x,
                particle.y,
            );

            context.lineTo(
                this.pointer.x,
                this.pointer.y,
            );

            context.strokeStyle =
                `rgba(92, 255, 138, ${opacity})`;

            context.stroke();
        }

        context.restore();
    }

    private drawParticles(
        context: CanvasRenderingContext2D,
        timestamp: number,
    ): void {
        context.save();

        for (const particle of this.particles) {
            const pulse =
                0.58 +
                Math.sin(
                    timestamp * 0.0015 +
                    particle.phase,
                ) *
                0.22;

            context.beginPath();

            context.arc(
                particle.x,
                particle.y,
                particle.radius,
                0,
                Math.PI * 2,
            );

            context.fillStyle =
                `rgba(82, 255, 132, ${pulse})`;

            context.shadowBlur = 13;

            context.shadowColor =
                'rgba(34, 237, 95, 0.55)';

            context.fill();
        }

        context.restore();
    }

    private drawPointerIndicator(
        context: CanvasRenderingContext2D,
    ): void {
        if (!this.pointer.active) {
            return;
        }

        context.save();

        context.beginPath();

        context.arc(
            this.pointer.x,
            this.pointer.y,
            4,
            0,
            Math.PI * 2,
        );

        context.fillStyle =
            'rgba(70, 255, 120, 0.9)';

        context.shadowBlur = 18;

        context.shadowColor =
            'rgba(34, 237, 95, 0.8)';

        context.fill();

        context.shadowBlur = 0;

        context.beginPath();

        context.arc(
            this.pointer.x,
            this.pointer.y,
            18,
            0,
            Math.PI * 2,
        );

        context.setLineDash([3, 5]);

        context.strokeStyle =
            'rgba(112, 255, 154, 0.32)';

        context.lineWidth = 1;

        context.stroke();

        context.restore();
    }

    private readonly handlePointerMove = (
        event: PointerEvent,
    ): void => {
        /*
         * Não existe cursor no touch.
         * No celular as partículas continuam
         * com movimento ambiente.
         */
        if (event.pointerType === 'touch') {
            this.pointer.active = false;
            return;
        }

        const canvas =
            this.particlesCanvas.nativeElement;

        const bounds =
            canvas.getBoundingClientRect();

        const relativeX =
            event.clientX - bounds.left;

        const relativeY =
            event.clientY - bounds.top;

        const isInsideCanvas =
            relativeX >= 0 &&
            relativeX <= bounds.width &&
            relativeY >= 0 &&
            relativeY <= bounds.height;

        this.pointer.x = relativeX;
        this.pointer.y = relativeY;
        this.pointer.active = isInsideCanvas;
    };

    private readonly handlePointerOut = (
        event: PointerEvent,
    ): void => {
        if (event.relatedTarget === null) {
            this.deactivatePointer();
        }
    };

    private readonly deactivatePointer =
        (): void => {
            this.pointer.active = false;
        };
}
import * as THREE from 'three';
import { SceneContext } from '../core/SceneContext';
import { SelectionController } from './SelectionController';
import { ModelDeformer } from '../geometry/ModelDeformer';
import { extrudeConfig } from '../core/config';

export class ExtrudeController {
    private readonly ctx: SceneContext;
    private readonly selection: SelectionController;
    private readonly deformers = new WeakMap<THREE.Object3D, ModelDeformer>();

    private active = false;
    private target: THREE.Object3D | null = null;
    private deformer: ModelDeformer | null = null;
    private startX = 0;
    private baseFactor = 1;
    private lastPointerX = 0;

    onDeform?: (model: THREE.Object3D) => void;

    constructor(ctx: SceneContext, selection: SelectionController) {
        this.ctx = ctx;
        this.selection = selection;
        window.addEventListener('keydown', this.onKeyDown);
        ctx.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    }

    private onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') { this.exit(); return; }
        if (e.key.toLowerCase() !== extrudeConfig.toggleKey) return;
        if (this.active) this.exit();
        else this.enter();
    };

    private enter(): void {
        const model = this.selection.selected;
        if (!model) return;

        let deformer = this.deformers.get(model);
        if (!deformer) {
            deformer = new ModelDeformer(model);
            this.deformers.set(model, deformer);
        }

        this.target = model;
        this.deformer = deformer;
        this.baseFactor = deformer.factor;
        this.startX = this.lastPointerX;
        this.active = true;

        this.ctx.controls.enabled = false;
        this.selection.setGizmoEnabled(false);
    }

    private exit(): void {
        if (!this.active) return;
        this.active = false;
        this.target = null;
        this.deformer = null;
        this.ctx.controls.enabled = true;
        this.selection.setGizmoEnabled(true);
    }

    private onPointerMove = (e: PointerEvent): void => {
        this.lastPointerX = e.clientX;
        if (!this.active || !this.deformer || !this.target) return;

        if (this.selection.selected !== this.target) { this.exit(); return; }

        const dx = e.clientX - this.startX;
        const steps = Math.round(dx / extrudeConfig.stepPixels);
        const factor = Math.max(
            extrudeConfig.minFactor,
            this.baseFactor + steps * extrudeConfig.stepFactor,
        );

        this.deformer.setFactor(factor);
        this.deformer.refresh(this.target);
        this.onDeform?.(this.target);
    };
}

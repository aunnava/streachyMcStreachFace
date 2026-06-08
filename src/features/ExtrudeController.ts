import * as THREE from 'three';
import { SceneContext } from '../core/SceneContext';
import { SelectionController } from './SelectionController';
import { ModelDeformer } from '../geometry/ModelDeformer';
import { extrudeConfig } from '../core/config';



//Handles the input for the extrude/extend feature. Checks for mode switch, tracks the pointer movement and scales the object

export class ExtrudeController {
    private readonly ctx: SceneContext;
    private readonly selection: SelectionController;
    private readonly deformers = new WeakMap<THREE.Object3D, ModelDeformer>(); //one deformer per model - to resume from current factor

    private activeMode = false;
    private target: THREE.Object3D | null = null;
    private deformer: ModelDeformer | null = null;
    private startX = 0;
    private baseFactor = 1;
    private lastPointerX = 0;

    onDeform?: (model: THREE.Object3D) => void;
    onModeChange?: (active: boolean) => void;

    get active(): boolean {
        return this.activeMode;
    }

    setActive(on: boolean): void {
        if (on) this.enter();
        else this.exit();
    }

    constructor(ctx: SceneContext, selection: SelectionController) {
        this.ctx = ctx;
        this.selection = selection;
        window.addEventListener('keydown', this.onKeyDown);
        ctx.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    }

    private onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') { this.exit(); return; }
        if (e.key.toLowerCase() !== extrudeConfig.toggleKey) return;
        if (this.activeMode) this.exit();
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
        this.baseFactor = deformer.factor; //resume from current streach
        this.startX = this.lastPointerX; //anchor the drach to where the mouse is now
        this.activeMode = true;

        this.ctx.controls.enabled = false; //orbit disabled
        this.selection.setGizmoEnabled(false); //gizmo intercepting drag disabled
        this.onModeChange?.(true); //event for UI changes
    } 

    private exit(): void {
        if (!this.activeMode) return;
        this.activeMode = false;
        this.target = null;
        this.deformer = null;
        this.ctx.controls.enabled = true;
        this.selection.setGizmoEnabled(true);
        this.onModeChange?.(false);
    }

    private onPointerMove = (e: PointerEvent): void => {
        this.lastPointerX = e.clientX; //
        if (!this.activeMode || !this.deformer || !this.target) return;

        if (this.selection.selected !== this.target) { this.exit(); return; } //selection changed -> bail

        const dx = e.clientX - this.startX;
        const steps = Math.round(dx / extrudeConfig.stepPixels);
        const factor = Math.max(
            extrudeConfig.minFactor,
            this.baseFactor + steps * extrudeConfig.stepFactor,
        );

        this.deformer.setFactor(factor);
        this.deformer.refresh();
        this.onDeform?.(this.target);
    };
}

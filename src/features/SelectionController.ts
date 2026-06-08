import * as THREE from 'three';
import { SceneContext } from '../core/SceneContext';
import { TransformControls } from 'three/examples/jsm/Addons.js';

// Handles selection and pick-ablity of the model, extrude and measurement features depend on it. Creates and handles raycasts to get 
//2D screen to 3D world interaction points

export class SelectionController {
    private selectedRoot: THREE.Object3D | null = null;
    private readonly targets: THREE.Object3D[] = [];
    private readonly ndc = new THREE.Vector2();
    private readonly ctx: SceneContext;
    private readonly raycaster = new THREE.Raycaster();
    private readonly gizmo: TransformControls;
    private dragging = false; //is drag by holding the gizmo in progress
    pickingEnabled = true; //is the model pickable? extrude/measure disable this
   
    onChange?: (selected: THREE.Object3D | null) => void;
   
    constructor(ctx: SceneContext) {
        this.ctx = ctx;

        this.gizmo = new TransformControls(ctx.camera, ctx.renderer.domElement); // while gizmo is dragging: kill orbit, and mark dragging so the pointerup doesn't deselect
        this.gizmo.size = 0.5;
        this.gizmo.addEventListener('dragging-changed', (e) => {
            ctx.controls.enabled = !e.value; // disable orbit while dragging with gizmo
            if (e.value) this.dragging = true; // remember we were dragging
        });
        ctx.scene.add(this.gizmo.getHelper());

        ctx.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    }

    addModel(object: THREE.Object3D): void {
        this.targets.push(object);
    }

    get selected(): THREE.Object3D | null {
        return this.selectedRoot;
    }

    setGizmoEnabled(enabled: boolean): void {
        this.gizmo.enabled = enabled;
    }

    removeModel(model: THREE.Object3D): void {
        const i = this.targets.indexOf(model); 
        if (i !== -1) this.targets.splice(i, 1);
        if (this.selectedRoot === model) this.deselect();
    }

    private onPointerUp = (e: PointerEvent): void => {
        if (e.button !== 0) return; //left click only 
        if (!this.pickingEnabled) return; //off during extrude/measure
 if (this.dragging) {
            this.dragging = false;
            return;                 //ignores the pointer up after drag is completed, avoids reselect/deselect
        }
        const r = this.ctx.renderer.domElement.getBoundingClientRect();
        this.ndc.set(
            ((e.clientX - r.left) / r.width) * 2 - 1, //screen to NDC x
            -((e.clientY - r.top) / r.height) * 2 + 1, //screen to NDC y flipped
        )
        this.raycaster.setFromCamera(this.ndc, this.ctx.camera);    //build the day
               const hits = this.raycaster.intersectObjects(this.targets, true); //recursive

        const root = hits.length ? this.rootOf(hits[0].object) : null; //nearest to root
        if (root) this.select(root);
        else this.deselect();
    };
    private rootOf(node: THREE.Object3D): THREE.Object3D | null {
        let current: THREE.Object3D | null = node;
        while (current) {
            if (this.targets.includes(current)) return current; //is this the registered model?
            current = current.parent; // if not, walk up to parent
        }
        return null;
    }

    private select(root: THREE.Object3D): void {
        this.selectedRoot = root;
        this.gizmo.attach(root);
        this.onChange?.(root);
    }

    private deselect(): void {
        this.selectedRoot = null;
        this.gizmo.detach();
        this.onChange?.(null);
    }
}

    

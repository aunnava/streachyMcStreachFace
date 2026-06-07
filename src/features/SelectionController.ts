import * as THREE from 'three';
import { SceneContext } from '../core/SceneContext';
import { TransformControls } from 'three/examples/jsm/Addons.js';


export class SelectionController {
    private selectedRoot: THREE.Object3D | null = null;
    private readonly targets: THREE.Object3D[] = [];
    private readonly ndc = new THREE.Vector2();
    private readonly ctx: SceneContext;
    private readonly raycaster = new THREE.Raycaster();
    private readonly gizmo: TransformControls;
    private dragging = false;
    onChange?: (selected: THREE.Object3D | null) => void;
    constructor(ctx: SceneContext) {
        this.ctx = ctx;

        this.gizmo = new TransformControls(ctx.camera, ctx.renderer.domElement);
        this.gizmo.size = 0.5;
        this.gizmo.addEventListener('dragging-changed', (e) => {
            ctx.controls.enabled = !e.value;
            if (e.value) this.dragging = true;
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
        if (e.button !== 0) return;
 if (this.dragging) {
            this.dragging = false;
            return;
        }
        const r = this.ctx.renderer.domElement.getBoundingClientRect();
        this.ndc.set(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            -((e.clientY - r.top) / r.height) * 2 + 1,
        )
        this.raycaster.setFromCamera(this.ndc, this.ctx.camera);
               const hits = this.raycaster.intersectObjects(this.targets, true);

        const root = hits.length ? this.rootOf(hits[0].object) : null;
        if (root) this.select(root);
        else this.deselect();
    };
    private rootOf(node: THREE.Object3D): THREE.Object3D | null {
        let current: THREE.Object3D | null = node;
        while (current) {
            if (this.targets.includes(current)) return current;
            current = current.parent;
        }
        return null;
    }

    private select(root: THREE.Object3D): void {
        this.selectedRoot = root;
        this.gizmo.attach(root);
        console.log('selected', root.name || root.uuid);
        this.onChange?.(root);
    }

    private deselect(): void {
        this.selectedRoot = null;
        this.gizmo.detach();
        console.log('deselected');
        this.onChange?.(null);
    }
}

    

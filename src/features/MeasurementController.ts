import * as THREE from 'three';
import { SceneContext } from '../core/SceneContext';
import { SelectionController } from './SelectionController';
import { measureConfig } from '../core/config';

//Store the triangle and its barycentric point instead of the 3D point.
interface Seed {
    mesh: THREE.Mesh;
    a: number;
    b: number;
    c: number;
    w0: number;
    w1: number;
    w2: number;
}

//Lable and its 3D anchor point
interface Anchor {
    el: HTMLDivElement;
    local: THREE.Vector3;
}

//Click on any surface to get measurements to that point on that surface. Use M to enter and exit measurement mode.
export class MeasurementController {
    private readonly ctx: SceneContext;
    private readonly selection: SelectionController;
    private readonly raycaster = new THREE.Raycaster();
    private readonly ndc = new THREE.Vector2();
    private readonly overlay: HTMLDivElement;

    private activeMode = false;
    private seed: Seed | null = null;
    private group: THREE.Group | null = null;
    private anchors: Anchor[] = [];

    onModeChange?: (active: boolean) => void;

    constructor(ctx: SceneContext, selection: SelectionController) {
        this.ctx = ctx;
        this.selection = selection;

        this.overlay = document.createElement('div');
        this.overlay.className = 'measure-overlay';
        document.body.appendChild(this.overlay);

        ctx.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('keydown', this.onKeyDown);
    }

    get active(): boolean {
        return this.activeMode;
    }

    setActive(on: boolean): void {
        if (on && !this.selection.selected) return; //Bail if no model
        this.activeMode = on;
        this.selection.pickingEnabled = !on;
        this.selection.setGizmoEnabled(!on);
        this.onModeChange?.(on);
    }

    refresh(model: THREE.Object3D): void {
        if (!this.seed) return;
        let onModel = false;
        model.traverse((o) => { if (o === this.seed!.mesh) onModel = true; });
        if (onModel) this.build();
    }

    update(): void {
        if (!this.seed || this.anchors.length === 0) return;
        const mesh = this.seed.mesh;
        mesh.updateWorldMatrix(true, false);
        const r = this.ctx.renderer.domElement.getBoundingClientRect(); //projcet 3D anchor to screen px.
        const w = new THREE.Vector3();
        for (const { el, local } of this.anchors) {
            w.copy(local).applyMatrix4(mesh.matrixWorld).project(this.ctx.camera);
            if (w.z < -1 || w.z > 1) { el.style.display = 'none'; continue; }
            el.style.display = 'block';
            el.style.left = (r.left + (w.x * 0.5 + 0.5) * r.width) + 'px';
            el.style.top = (r.top + (-w.y * 0.5 + 0.5) * r.height) + 'px';
        }
    }

    clear(): void {
        this.disposeGroup();
        for (const a of this.anchors) a.el.remove();
        this.anchors = [];
        this.seed = null;
    }

    private onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') { if (this.activeMode) this.setActive(false); return; }
        if (e.key.toLowerCase() !== measureConfig.toggleKey) return;
        this.setActive(!this.activeMode);
    };

    private onPointerUp = (e: PointerEvent): void => {
        if (!this.activeMode || e.button !== 0) return;
        const model = this.selection.selected;
        if (!model) return;

        const r = this.ctx.renderer.domElement.getBoundingClientRect();
        this.ndc.set(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            -((e.clientY - r.top) / r.height) * 2 + 1,
        );
        this.raycaster.setFromCamera(this.ndc, this.ctx.camera);
        
        const hit = this.raycaster
            .intersectObject(model, true)
            .find((h) => (h.object as THREE.Mesh).isMesh && h.face); //check if they raycast hit has a mesh and get it triangle, else bail
        if (!hit || !hit.face) return;

        const mesh = hit.object as THREE.Mesh;
        const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        const { a, b, c } = hit.face;

        const va = new THREE.Vector3().fromBufferAttribute(pos, a); // vertex position in local space.
        const vb = new THREE.Vector3().fromBufferAttribute(pos, b);
        const vc = new THREE.Vector3().fromBufferAttribute(pos, c);
        const pLocal = mesh.worldToLocal(hit.point.clone()); //hit point to mesh local
        const [w0, w1, w2] = this.barycentric(pLocal, va, vb, vc); //Get barycentric coordinates as this will survive mesh deformation 

        this.disposeGroup();
        this.seed = { mesh, a, b, c, w0, w1, w2 };
        this.build();
    };

    private build(): void {
        if (!this.seed) return;
        this.disposeGroup();

        const { mesh, a, b, c, w0, w1, w2 } = this.seed;
        const geo = mesh.geometry;
        const pos = geo.getAttribute('position') as THREE.BufferAttribute;

        const va = new THREE.Vector3().fromBufferAttribute(pos, a);
        const vb = new THREE.Vector3().fromBufferAttribute(pos, b);
        const vc = new THREE.Vector3().fromBufferAttribute(pos, c);

        const origin = new THREE.Vector3()
            .addScaledVector(va, w0)
            .addScaledVector(vb, w1)
            .addScaledVector(vc, w2);

        const e1 = new THREE.Vector3().subVectors(vb, va);
        const e2 = new THREE.Vector3().subVectors(vc, va);
        const n = new THREE.Vector3().crossVectors(e1, e2);
        if (n.lengthSq() === 0) return;
        n.normalize();

        const ref = new THREE.Vector3(1, 0, 0);
        if (Math.abs(n.x) >= Math.abs(n.y) && Math.abs(n.x) >= Math.abs(n.z)) ref.set(0, 1, 0);
        const u = ref.addScaledVector(n, -ref.dot(n)).normalize();
        const v = new THREE.Vector3().crossVectors(n, u).normalize();

        geo.computeBoundingBox();
        const bb = geo.boundingBox!;
        const maxDim = Math.max(
            bb.max.x - bb.min.x,
            bb.max.y - bb.min.y,
            bb.max.z - bb.min.z,
        ) || 1;
        const planeEps = maxDim * 1e-3;
        const planeDist = origin.dot(n);

        let uMin = 0, uMax = 0, vMin = 0, vMax = 0;
        const index = geo.index;
        const triCount = index ? index.count : pos.count;
        const t0 = new THREE.Vector3();
        const t1 = new THREE.Vector3();
        const t2 = new THREE.Vector3();
        const te1 = new THREE.Vector3();
        const te2 = new THREE.Vector3();
        const tn = new THREE.Vector3();
        const rel = new THREE.Vector3();
        const vid = (t: number, k: number) => (index ? index.getX(t + k) : t + k);

        for (let t = 0; t < triCount; t += 3) {
            t0.fromBufferAttribute(pos, vid(t, 0));
            t1.fromBufferAttribute(pos, vid(t, 1));
            t2.fromBufferAttribute(pos, vid(t, 2));
            tn.crossVectors(te1.subVectors(t1, t0), te2.subVectors(t2, t0));
            const len = tn.length();
            if (len === 0) continue;
            tn.multiplyScalar(1 / len);
            if (Math.abs(tn.dot(n)) < 1 - 1e-3) continue;
            if (Math.abs(t0.dot(n) - planeDist) > planeEps) continue;

            for (const tv of [t0, t1, t2]) {
                rel.subVectors(tv, origin);
                const du = rel.dot(u);
                const dv = rel.dot(v);
                if (du < uMin) uMin = du;
                if (du > uMax) uMax = du;
                if (dv < vMin) vMin = dv;
                if (dv > vMax) vMax = dv;
            }
        }

        const lift = n.clone().multiplyScalar(maxDim * measureConfig.liftFactor);
        const group = new THREE.Group();
        group.renderOrder = 999;

        group.add(this.makeLine([
            origin.clone().addScaledVector(u, uMin).add(lift),
            origin.clone().addScaledVector(u, uMax).add(lift),
        ]));
        group.add(this.makeLine([
            origin.clone().addScaledVector(v, vMin).add(lift),
            origin.clone().addScaledVector(v, vMax).add(lift),
        ]));
        group.add(this.makeMarker(origin.clone().add(lift), maxDim * 0.012));

        mesh.add(group);
        this.group = group;

        this.ensureLabels();
        const segments: [THREE.Vector3, number][] = [
            [origin.clone().addScaledVector(u, uMin * 0.5).add(lift), -uMin],
            [origin.clone().addScaledVector(u, uMax * 0.5).add(lift), uMax],
            [origin.clone().addScaledVector(v, vMin * 0.5).add(lift), -vMin],
            [origin.clone().addScaledVector(v, vMax * 0.5).add(lift), vMax],
        ];
        for (let i = 0; i < 4; i++) {
            this.anchors[i].local.copy(segments[i][0]);
            this.anchors[i].el.textContent = this.format(segments[i][1]);
        }
        this.update();
    }

    private ensureLabels(): void {
        if (this.anchors.length === 4) return;
        for (const a of this.anchors) a.el.remove();
        this.anchors = [];
        for (let i = 0; i < 4; i++) {
            const el = document.createElement('div');
            el.className = 'measure-label';
            this.overlay.appendChild(el);
            this.anchors.push({ el, local: new THREE.Vector3() });
        }
    }

    private format(units: number): string {
        return (Math.abs(units) * measureConfig.cmPerUnit).toFixed(measureConfig.decimals) + ' cm';
    }

    private makeLine(points: THREE.Vector3[]): THREE.Line {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: measureConfig.lineColor,
            depthTest: false,
            transparent: true,
        });
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 999;
        return line;
    }

    private makeMarker(position: THREE.Vector3, size: number): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(size, 12, 12);
        const material = new THREE.MeshBasicMaterial({
            color: measureConfig.markerColor,
            depthTest: false,
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        marker.renderOrder = 999;
        return marker;
    }

    private barycentric(
        p: THREE.Vector3, //hit point in mesh local
        //weights
        a: THREE.Vector3,
        b: THREE.Vector3,
        c: THREE.Vector3,
    ): [number, number, number] {
        const v0 = new THREE.Vector3().subVectors(b, a);
        const v1 = new THREE.Vector3().subVectors(c, a);
        const v2 = new THREE.Vector3().subVectors(p, a);
        const d00 = v0.dot(v0);
        const d01 = v0.dot(v1);
        const d11 = v1.dot(v1);
        const d20 = v2.dot(v0);
        const d21 = v2.dot(v1);
        const denom = d00 * d11 - d01 * d01;
        if (denom === 0) return [1, 0, 0];
        const vw = (d11 * d20 - d01 * d21) / denom;
        const ww = (d00 * d21 - d01 * d20) / denom;
        return [1 - vw - ww, vw, ww];
    }

    private disposeGroup(): void {
        if (!this.group) return;
        this.group.removeFromParent();
        this.group.traverse((o) => {
            const m = o as THREE.Mesh | THREE.Line;
            const geometry = (m as THREE.Mesh).geometry;
            if (geometry) geometry.dispose();
            const material = (m as THREE.Mesh).material;
            if (Array.isArray(material)) material.forEach((x) => x.dispose());
            else if (material) material.dispose();
        });
        this.group = null;
    }
}
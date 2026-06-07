import * as THREE from 'three';
import { SelectionController } from './SelectionController';

export class TextureController {
    private readonly loader = new THREE.TextureLoader();
    private readonly selection: SelectionController;
    private readonly applied = new WeakMap<THREE.Object3D, THREE.Texture>();

    constructor(selection: SelectionController) {
        this.selection = selection;
    }

    async applyTexture(file: File): Promise<void> {
        const model = this.selection.selected;
        if (!model) return;

        const url = URL.createObjectURL(file);
        let texture: THREE.Texture;
        try {
            texture = await this.loader.loadAsync(url);
        } finally {
            URL.revokeObjectURL(url);
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;

        model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;

            if (!mesh.geometry.getAttribute('uv')) {
                this.setupBoxUVs(mesh);
            }

            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of mats) {
                const m = mat as THREE.MeshStandardMaterial;
                if (!('map' in m)) continue;
                m.map = texture;
                m.color?.setRGB(1, 1, 1);
                m.needsUpdate = true;
            }
        });

        this.applied.get(model)?.dispose();
        this.applied.set(model, texture);
    }

    reproject(model: THREE.Object3D): void {
        model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            if (!mesh.userData.uvSize) return;
            this.projectUVs(mesh);
        });
    }

    private setupBoxUVs(mesh: THREE.Mesh): void {
        if (mesh.geometry.index) {
            mesh.geometry = mesh.geometry.toNonIndexed();
        }
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox!;
        mesh.userData.uvOrigin = box.min.clone();
        mesh.userData.uvSize = new THREE.Vector3(
            box.max.x - box.min.x || 1,
            box.max.y - box.min.y || 1,
            box.max.z - box.min.z || 1,
        );
        this.projectUVs(mesh);
        mesh.geometry.computeVertexNormals();
    }

    private projectUVs(mesh: THREE.Mesh): void {
        const geometry = mesh.geometry;
        const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
        const origin = mesh.userData.uvOrigin as THREE.Vector3;
        const size = mesh.userData.uvSize as THREE.Vector3;

        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();
        const ab = new THREE.Vector3();
        const ac = new THREE.Vector3();
        const n = new THREE.Vector3();

        const existing = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
        const uv = existing && existing.count === pos.count
            ? (existing.array as Float32Array)
            : new Float32Array(pos.count * 2);

        for (let t = 0; t < pos.count; t += 3) {
            a.fromBufferAttribute(pos, t);
            b.fromBufferAttribute(pos, t + 1);
            c.fromBufferAttribute(pos, t + 2);
            ab.subVectors(b, a);
            ac.subVectors(c, a);
            n.crossVectors(ab, ac);

            const nx = Math.abs(n.x), ny = Math.abs(n.y), nz = Math.abs(n.z);

            for (let k = 0; k < 3; k++) {
                const i = t + k;
                const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
                let u: number, v: number;
                if (nx >= ny && nx >= nz) {
                    u = (pz - origin.z) / size.z;
                    v = (py - origin.y) / size.y;
                } else if (ny >= nx && ny >= nz) {
                    u = (px - origin.x) / size.x;
                    v = (pz - origin.z) / size.z;
                } else {
                    u = (px - origin.x) / size.x;
                    v = (py - origin.y) / size.y;
                }
                uv[i * 2] = u;
                uv[i * 2 + 1] = v;
            }
        }

        if (uv === existing?.array) {
            existing.needsUpdate = true;
        } else {
            geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        }
    }
}

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
        //Loading the texture
        const url = URL.createObjectURL(file);
        let texture: THREE.Texture;
        try {
            texture = await this.loader.loadAsync(url);
        } finally {
            URL.revokeObjectURL(url);
        }
        // Setting up color spaces and wrapping setting. Allows for repeating textures when extruding model.
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;

        // One combined world-space box for the whole model. Every mesh projects
        // against this same box so the texture is continuous across all parts of
        // a hierarchy instead of each part getting its own local mapping.
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const origin = box.min.clone();
        const size = new THREE.Vector3(
            box.max.x - box.min.x || 1,
            box.max.y - box.min.y || 1,
            box.max.z - box.min.z || 1,
        );
        model.userData.uvWorldOrigin = origin;
        model.userData.uvWorldSize = size;

        // Calculate and project UV per mesh
        model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;

            if (mesh.geometry.index) {
                mesh.geometry = mesh.geometry.toNonIndexed();
            }
            mesh.userData.uvProjected = true;
            this.projectUVs(mesh, origin, size);
            mesh.geometry.computeVertexNormals();
            //Handle materials and assign loaded texture
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of mats) {
                const m = mat as THREE.MeshStandardMaterial;
                if (!('map' in m)) continue;
                //shader recompile needed after texture swap
                m.map = texture;
                m.color?.setRGB(1, 1, 1);
                m.needsUpdate = true; 
            }
        });

        this.applied.get(model)?.dispose(); //Free up textures GPU memory before replacing.
        this.applied.set(model, texture);
    }

    //Update UVs after deformed.
    reproject(model: THREE.Object3D): void {
        const origin = model.userData.uvWorldOrigin as THREE.Vector3 | undefined;
        const size = model.userData.uvWorldSize as THREE.Vector3 | undefined;
        if (!origin || !size) return;

        model.updateMatrixWorld(true);
        model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            if (!mesh.userData.uvProjected) return;
            this.projectUVs(mesh, origin, size);
        });
    }

    // Triplanar box projection done in world space. 
    private projectUVs(mesh: THREE.Mesh, origin: THREE.Vector3, size: THREE.Vector3): void {
        const geometry = mesh.geometry;
        const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
        const m = mesh.matrixWorld;

        const wa = new THREE.Vector3();
        const wb = new THREE.Vector3();
        const wc = new THREE.Vector3();
        const ab = new THREE.Vector3();
        const ac = new THREE.Vector3();
        const n = new THREE.Vector3();

        const existing = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
        const uv = existing && existing.count === pos.count
            ? (existing.array as Float32Array)
            : new Float32Array(pos.count * 2);

        for (let t = 0; t < pos.count; t += 3) {
            // World-space positions of the triangle's three vertices.
            wa.fromBufferAttribute(pos, t).applyMatrix4(m);
            wb.fromBufferAttribute(pos, t + 1).applyMatrix4(m);
            wc.fromBufferAttribute(pos, t + 2).applyMatrix4(m);

            ab.subVectors(wb, wa);
            ac.subVectors(wc, wa);
            n.crossVectors(ab, ac);                       // world-space face normal
            const nx = Math.abs(n.x), ny = Math.abs(n.y), nz = Math.abs(n.z);

            const tri = [wa, wb, wc];
            for (let k = 0; k < 3; k++) {
                const i = t + k;
                const p = tri[k];
                let u: number, v: number;
                if (nx >= ny && nx >= nz) {               // faces +/-X → map ZY
                    u = (p.z - origin.z) / size.z;
                    v = (p.y - origin.y) / size.y;
                } else if (ny >= nx && ny >= nz) {        // faces +/-Y → map XZ
                    u = (p.x - origin.x) / size.x;
                    v = (p.z - origin.z) / size.z;
                } else {                                   // faces +/-Z → map XY
                    u = (p.x - origin.x) / size.x;
                    v = (p.y - origin.y) / size.y;
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

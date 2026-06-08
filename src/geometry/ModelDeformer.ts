import * as THREE from 'three';

//Pure Geometry Math, no input handling. 
export class ModelDeformer{
    private readonly model: THREE.Object3D;
    
    // For each mesh: the live position buffer + a snapshot of the original local
    // positions are saved. Always deform from the snapshot, so there is no float drift.

    private readonly entries: {mesh:THREE.Mesh, attr:THREE.BufferAttribute, original:Float32Array}[]=[];
    factor=1;

    // Scratch objects
    private readonly v=new THREE.Vector3();
    private readonly inv=new THREE.Matrix4();

   constructor(model: THREE.Object3D) {
        this.model = model;
        model.updateMatrixWorld(true);
        model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;

            const attr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
            const original = new Float32Array(attr.count * 3);
            for (let i = 0; i < attr.count; i++) {
                original[i * 3]     = attr.getX(i);
                original[i * 3 + 1] = attr.getY(i);
                original[i * 3 + 2] = attr.getZ(i);
            }
            this.entries.push({ mesh, attr, original }); // both live buffer and the original are preserved.
        });
    }

    // Stretch the whole model along the world x axis by `factor`, about the models
    // combined world centre.
    setFactor(factor:number):void{
        this.factor=factor;
        this.model.updateMatrixWorld(true); // gizmo may have moved the model since last time

        // Pass 1: world-X extent of the ORIGINAL geometry -> a single shared pivot.
        let minX = Infinity, maxX = -Infinity;
        for (const { mesh, original } of this.entries) {
            const m = mesh.matrixWorld;
            for (let i = 0; i < original.length; i += 3) {
                this.v.set(original[i], original[i + 1], original[i + 2]).applyMatrix4(m);
                if (this.v.x < minX) minX = this.v.x;
                if (this.v.x > maxX) maxX = this.v.x;
            }
        }
        const pivotX = (minX + maxX) / 2;

        // Pass 2: local -> world -> scale world X about pivot -> back to local.
        for (const { mesh, attr, original } of this.entries) {
            const m = mesh.matrixWorld;
            this.inv.copy(m).invert();
            for (let i = 0; i < attr.count; i++) {
                this.v.set(original[i * 3], original[i * 3 + 1], original[i * 3 + 2]).applyMatrix4(m);
                this.v.x = pivotX + (this.v.x - pivotX) * factor;  // scale WORLD X only; recompute from original = no drift, reversible
                this.v.applyMatrix4(this.inv);
                attr.setXYZ(i, this.v.x, this.v.y, this.v.z); // all 3 local components change for rotated meshes
            }
            attr.needsUpdate = true; // re-upload this buffer to the gpu
        }
    }

    refresh():void{
        for (const { mesh } of this.entries) {
            mesh.geometry.computeVertexNormals();  // lighting
            mesh.geometry.computeBoundingBox();     // raycasting/measurement
            mesh.geometry.computeBoundingSphere();  // frustum culling + raycast early-out
        }
    }
}

import * as THREE from 'three';
 

export class ModelDeformer{
    private readonly entries: {attr:THREE.BufferAttribute,originalX:Float32Array}[]=[];
    factor=1;

   constructor(model: THREE.Object3D) {
    model.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;

        const attr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        const originalX = new Float32Array(attr.count);
        for (let i = 0; i < attr.count; i++) originalX[i] = attr.getX(i);
        this.entries.push({ attr, originalX });
    });
}


    setFactor(factor:number, pivot=0):void{
        this.factor=factor;
        for(const{attr, originalX} of this.entries){
            for(let i=0;i<attr.count;i++)
            {
                attr.setX(i,pivot+(originalX[i]-pivot)*factor);
            }
            attr.needsUpdate = true; 
        }
    }

    refresh(model:THREE.Object3D):void{
        model.traverse((obj)=>{
                const mesh=obj as THREE.Mesh;
                if(!mesh.isMesh)return;
                mesh.geometry.computeVertexNormals();
                mesh.geometry.computeBoundingBox();
                mesh.geometry.computeBoundingSphere();
            }
        )};
    }


import * as THREE from 'three';

export interface FaceHit{
    mesh:THREE.Mesh;
    triangleIndex:number;
    point:THREE.Vector3;
}

export class FacePicker{
    private readonly raycaster=new THREE.Raycaster();
    private readonly camera:THREE.Camera;
    constructor(camera:THREE.Camera){
        this.camera=camera;
    }

pick(ndc:THREE.Vector2, targets:THREE.Object3D[]):FaceHit|null{
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits=this.raycaster.intersectObjects(targets,true);
    for(const hit of hits)
    {
        if ((hit.object as THREE.Mesh).isMesh && hit.faceIndex!=null){
            return{
                mesh:hit.object as THREE.Mesh,
                triangleIndex:hit.faceIndex,
                point:hit.point,
            };
        }
    }
    return null;
}

}
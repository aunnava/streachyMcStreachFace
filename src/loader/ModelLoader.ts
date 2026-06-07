import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

export class ModelLoader{
    private readonly loader=new GLTFLoader();
    private readonly scene:THREE.Scene;
    constructor (scene:THREE.Scene){this.scene=scene}

    async loadFile(file:File):Promise<THREE.Object3D>{
        const url=URL.createObjectURL(file);
        try{
            const gltf=await this.loader.loadAsync(url);
            this.scene.add(gltf.scene);
            return gltf.scene;
        }finally{
            URL.revokeObjectURL(url);
        }
    }
}
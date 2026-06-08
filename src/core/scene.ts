import * as THREE from 'three';
import { sceneConfig } from './config';

export interface World{
    update(delta:number):void;
}
//takes the scene from scene context and populates it with BG, lights etc
export function createScene(scene:THREE.Scene):World{

    const background=sceneConfig.backgroundColor;
    const lightColor=sceneConfig.lightColor;
    scene.background=new THREE.Color(background);
    scene.fog=new THREE.Fog(background,14,34);
    scene.add(new THREE.AmbientLight(lightColor,0.8));

    const key=new THREE.DirectionalLight(lightColor,0.6);

    key.position.set(5,10,7);
    scene.add(key);
    const gridColor=sceneConfig.gridColor;
    scene.add(new THREE.GridHelper(30,30,gridColor,gridColor));
    scene.add(makeAxisLine(sceneConfig.axisXColor,'x'));
    scene.add(makeAxisLine(sceneConfig.axisZColor,'z'));
    

 return{update(_delta:number):void{}}
}

function makeAxisLine(color: number, axis: 'x'|'z'): THREE.Line{

    const half=15;
    const y=0.002;
    const a=new THREE.Vector3(axis==='x'? -half:0,y,axis==='z'? -half:0);
    const b=new THREE.Vector3(axis==='x'?  half:0,y,axis==='z'?  half:0);

    const geometry=new THREE.BufferGeometry().setFromPoints([a,b]);
    const material=new THREE.LineBasicMaterial({color})
    return new THREE.Line(geometry,material);

}

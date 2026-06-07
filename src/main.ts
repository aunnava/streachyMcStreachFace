import './style.css';
import * as THREE from 'three';
import { SceneContext } from './core/sceneContext';
import { createScene } from './scene';


const canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx=new SceneContext(canvas);
const world=createScene(ctx.scene);

const timer=new THREE.Timer();
ctx.renderer.setAnimationLoop((time)=>{
    timer.update(time);
    world.update(timer.getDelta());
    ctx.render();
});
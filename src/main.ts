import './style.css';
import * as THREE from 'three';
import { SceneContext } from './core/SceneContext';
import { ControlPanel } from './ui/ControlPanel';
import { createScene } from './scene';
import { pickFile } from './ui/filePicker';
import {  ModelLoader } from './loader/ModelLoader';


const canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx=new SceneContext(canvas);
const world=createScene(ctx.scene);
const panel=new ControlPanel();

const timer=new THREE.Timer();

const modelLoader=new ModelLoader(ctx.scene);
const importButton=panel.addButton("Import to scene",async()=>{
    const file=await pickFile('.glb,.gltf');
    if(!file) return;
    importButton.disabled=true;
    try{
        await modelLoader.loadFile(file);
    }catch(err)
    {
        console.error('failed to load model',err);
    }finally{
        importButton.disabled=false;
    }
});

ctx.renderer.setAnimationLoop((time)=>{
    timer.update(time);
    world.update(timer.getDelta());
    
    ctx.render();
});
import './style.css';
import * as THREE from 'three';
import { SceneContext } from './core/SceneContext';
import { ControlPanel } from './ui/ControlPanel';
import { createScene } from './scene';
import { pickFile } from './ui/filePicker';
import {  ModelLoader } from './loader/ModelLoader';
import { FacePicker } from './features/FacePicker';
import { SelectionController } from './features/SelectionController';


const canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx=new SceneContext(canvas);
const world=createScene(ctx.scene);
const panel=new ControlPanel();

const timer=new THREE.Timer();
const picker =new FacePicker(ctx.camera);

const selectionCont=new SelectionController(ctx,picker);
const modelLoader=new ModelLoader(ctx.scene);
const importButton=panel.addButton("Import 3D Model",async()=>{
    const file=await pickFile('.glb,.gltf');
    if(!file) return;
    importButton.disabled=true;
    try{
        const model=await modelLoader.loadFile(file);
        selectionCont.addModel(model);

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
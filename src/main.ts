import './style.css';
import * as THREE from 'three';
import { SceneContext } from './core/SceneContext';
import { ControlPanel } from './ui/ControlPanel';
import { createScene } from './core/scene';
import { pickFile } from './ui/filePicker';
import {  ModelLoader } from './loader/ModelLoader';
import { SelectionController } from './features/SelectionController';
import { ExtrudeController } from './features/ExtrudeController';
import { TextureController } from './features/TextureController';
import { MeasurementController } from './features/MeasurementController';


const canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx=new SceneContext(canvas);
const world=createScene(ctx.scene);
const panel=new ControlPanel();

const timer=new THREE.Timer();

const selectionCont=new SelectionController(ctx);
const textureCont=new TextureController(selectionCont);
const extrudeCont=new ExtrudeController(ctx,selectionCont);
const measureCont=new MeasurementController(ctx,selectionCont);
extrudeCont.onDeform=(model)=>{
    textureCont.reproject(model);
    measureCont.refresh(model);
};
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
        importButton.disabled=false;
    }
});

const deleteButton=panel.addButton("Delete Model",()=>{
    const model=selectionCont.selected;
    if(!model) return;
    measureCont.clear();
    selectionCont.removeModel(model);
    modelLoader.unload(model);
    importButton.disabled=false;
});
deleteButton.disabled=true;

const textureButton=panel.addButton("Apply Texture",async()=>{
    const file=await pickFile('image/*');
    if(!file) return;
    try{
        await textureCont.applyTexture(file);
    }catch(err){
        console.error('failed to apply texture',err);
    }
});
textureButton.disabled=true;

const measureButton=panel.addButton("Measure",()=>{
    measureCont.setActive(!measureCont.active);
});
measureButton.disabled=true;
measureCont.onModeChange=(on)=>{
    measureButton.textContent=on?"Measuring… (Esc)":"Measure";
};

selectionCont.onChange=(sel)=>{
    deleteButton.disabled=sel===null;
    textureButton.disabled=sel===null;
    measureButton.disabled=sel===null;
    if(sel===null){
        if(measureCont.active) measureCont.setActive(false);
        measureCont.clear();
    }
};

ctx.renderer.setAnimationLoop((time)=>{
    timer.update(time);
    world.update(timer.getDelta());
    measureCont.update();
    ctx.render();
});
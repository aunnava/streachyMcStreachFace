import * as THREE from 'three';
import { SceneContext } from '../core/SceneContext';
import { FacePicker } from './FacePicker';

export class SelectionController {
    private selectedMesh:THREE.Mesh|null=null;
    private readonly targets:THREE.Object3D[]=[];
    private readonly ndc = new THREE.Vector2();
private readonly ctx:SceneContext;
private readonly picker:FacePicker;
    constructor(
         ctx:SceneContext,
         picker:FacePicker,
    ){
        this.ctx=ctx;
        this.picker=picker;
        ctx.renderer.domElement.addEventListener('pointerup',this.onPointerUp);
    }

    addModel(object:THREE.Object3D):void{
        this.targets.push(object);
    }

private onPointerUp=(e:PointerEvent):void=>{
    //ignoring all  other clicks except left click
    if(e.button!==0)return;
    
    const r=this.ctx.renderer.domElement.getBoundingClientRect();
    this.ndc.set(
        ((e.clientX-r.left)/r.width)*2-1,
        -((e.clientY-r.top)/r.height)*2+1,
    )
    const hit=this.picker.pick(this.ndc, this.targets);
    if(hit) this.select(hit.mesh);
    else this.deselect();
};

private select(mesh:THREE.Mesh):void{
    this.selectedMesh=mesh;
    this.ctx.outline.selectedObjects=[mesh];
    console.log('selected',mesh.name||mesh.uuid);
}
private deselect():void{
    this.selectedMesh=null;
    this.ctx.outline.selectedObjects=[];
    console.log("deselcted");
}

}
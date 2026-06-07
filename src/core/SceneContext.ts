import * as THREE from 'three';
import { EffectComposer, OrbitControls, OutlinePass, OutputPass, RenderPass, ThreeMFLoader } from "three/examples/jsm/Addons.js";
import { outlineConfig } from '../config';

export class SceneContext {
    readonly scene = new THREE.Scene();
    readonly camera: THREE.PerspectiveCamera;
    readonly renderer: THREE.WebGLRenderer;
    readonly controls: OrbitControls;
    readonly composer: EffectComposer;
    readonly outline: OutlinePass;

    constructor(canvas: HTMLCanvasElement) {

        const { innerWidth: w, innerHeight: h } = window;
        this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
        this.camera.position.set(3, 2, 5);


        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));


        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.mouseButtons={
            LEFT:null,
            MIDDLE:THREE.MOUSE.ROTATE,
            RIGHT:THREE.MOUSE.PAN
        }

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.outline = new OutlinePass(new THREE.Vector2(w, h), this.scene, this.camera);
        this.outline.visibleEdgeColor.set(outlineConfig.visibleEdgeColor);
        this.outline.hiddenEdgeColor.set(outlineConfig.hiddenEdgecolor);
        this.outline.edgeStrength = outlineConfig.edgeStrength;
        this.outline.edgeThickness = outlineConfig.edgeThickness;
        this.outline.edgeGlow = outlineConfig.edgeGlow;

        this.composer.addPass(this.outline);

        this.composer.addPass(new OutputPass());

        window.addEventListener("resize", this.handleResize);

    }

    render(): void {
        this.controls.update();
        this.composer.render();
        this.renderer.render(this.scene, this.camera);
    }


    private handleResize = (): void => {
        const { innerWidth: w, innerHeight: h } = window;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.composer.setSize(w,h);
        this.outline.setSize(w,h);

    };
    dispose(): void {
        window.removeEventListener("resize", this.handleResize);
        this.controls.dispose();
        this.renderer.dispose();
    }

}

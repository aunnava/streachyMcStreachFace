import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/Addons.js";

export class SceneContext {
    readonly scene = new THREE.Scene();
    readonly camera: THREE.PerspectiveCamera;
    readonly renderer: THREE.WebGLRenderer;
    readonly controls: OrbitControls;

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

        window.addEventListener("resize", this.handleResize);

    }

    render(): void {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }


    private handleResize = (): void => {
        const { innerWidth: w, innerHeight: h } = window;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);

    };
    dispose(): void {
        window.removeEventListener("resize", this.handleResize);
        this.controls.dispose();
        this.renderer.dispose();
    }

}

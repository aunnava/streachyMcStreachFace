export class ControlPanel{
    private readonly root : HTMLDivElement;

    constructor (container:HTMLElement=document.body){
        this.root=document.createElement('div');
        this.root.className='control-panel';
        container.appendChild(this.root);
    }

    addButton(label:string, onClick:()=>void):HTMLButtonElement{
        const button=document.createElement('button');
        button.textContent=label;
        button.addEventListener("click",onClick);
        this.root.appendChild(button);
        return button;
    }
}
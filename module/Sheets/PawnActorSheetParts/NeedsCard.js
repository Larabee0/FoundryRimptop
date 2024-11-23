import { AddThoughtForm } from "../Forms/AddThoughtForm.js";

export class NeedsCard{

    ownerActorSheet;

    constructor(actorSheet){
        this.ownerActorSheet = actorSheet;
    }

    async _prepareContextNeedsCard(context,actor){
        if(actor.type ==="pawn"){
            if("noneNeeds" in context.system.needsCard){
                context.system.needsCard = structuredClone(actor.system.needsCard);
                await actor.updateNeeds();
            }
        }
        return context;
    }

    _onRender(context, options){
        let addThought = this.ownerActorSheet.element.getElementsByClassName("add-thought-button");
        if(addThought){
            addThought.item(0).addEventListener("click",this.openAddThoughtDialogue.bind(this));
        }
    }

    openAddThoughtDialogue(event){
        event.preventDefault();
        let addThoughtForm = new AddThoughtForm(this.ownerActorSheet.actor.system.thingID);
        addThoughtForm.closeAction = this.internalRefresh.bind(this);
        addThoughtForm.render({force:true});
    }
    
    async onRefreshNeeds(event, button){
        event.preventDefault();
        await this.internalRefresh();
    }

    async internalRefresh(){
        await this.ownerActorSheet.actor.updateNeeds();
        this.ownerActorSheet.render();
    }
}
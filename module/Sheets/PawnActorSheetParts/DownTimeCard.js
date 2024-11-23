import { EditActivity } from "../Forms/EditActivity.js";
import { InterPawnTending } from "../Forms/InterPawnTending.js";

export class DownTimeCard{
    ownerActorSheet;

    constructor(actorSheet){
        this.ownerActorSheet = actorSheet;
    }

    
    async _prepareContextDownTimeCard(context,actor){
        if(actor.type==="pawn"){
            if("noneDownTime" in context.system.downTimeCard){
                await actor.updateDownTime();
                context.system.downTimeCard = structuredClone(actor.system.downTimeCard);
            }
        }
        return context;
    }

    _onRender(context, options){
        let editButtons = this.ownerActorSheet.element.getElementsByClassName("edit-button");
        if(editButtons){
            
            for(let i= 0; i<editButtons.length;i++){
                editButtons.item(i).addEventListener("click",this.onEdit.bind(this));
            }
        }

        let extraSettings = this.ownerActorSheet.element.getElementsByClassName("misc-setting");
        if(extraSettings){
            for(let i = 0; i <extraSettings.length; i++){
                extraSettings.item(i).addEventListener("change",this.onMiscChanged.bind(this));
            }
        }

        let tendingButton = this.ownerActorSheet.element.querySelector("[id=inter-pawn-tending-button]");
        if(tendingButton){
            tendingButton.addEventListener("click",this.onInterPawnTending.bind(this));
        }
    }

    async onInterPawnTending(event){
        let interPawnTending =  new InterPawnTending();
        InterPawnTending.targetActor = this.ownerActorSheet.actor;
        interPawnTending.render({force:true});
    }

    async onMiscChanged(event){
        event.preventDefault();
        let disableDownTime = this.ownerActorSheet.element.querySelector("[id=disable-down-time]").checked;
        let restEffectiveness = this.ownerActorSheet.element.querySelector("[id=rest-effectiveness]").value;
        let alwaysRest = this.ownerActorSheet.element.querySelector("[id=always-rest]").checked;
        let virtuallySpawned = this.ownerActorSheet.element.querySelector("[id=virtually-spawned]").checked;

        await CONFIG.csInterOP.SendHttpRequest("POST","setMiscDownTime",this.ownerActorSheet.actor.system.thingID,String(disableDownTime),restEffectiveness,String(alwaysRest),String(virtuallySpawned));
        await this.internalRefresh();
    }

    async onEdit(event){
        let downTimeActivity = this.ownerActorSheet.actor.system.downTimeCard.Activities[event.currentTarget.dataset.activityType];
        let activityEditor = new EditActivity();
        if(downTimeActivity.LearnMode){
            EditActivity.selectedLearnMode = downTimeActivity.LearnMode;
        }
        activityEditor.pawnId = this.ownerActorSheet.actor.system.thingID;
        activityEditor.activityType = event.currentTarget.dataset.activityType;
        activityEditor.min = downTimeActivity.DurationMin;
        activityEditor.max = downTimeActivity.DurationMax;
        activityEditor.weight = (downTimeActivity.ActivityWeight);
        activityEditor.actor = this.ownerActorSheet.actor;
        activityEditor.closeAction = this.internalRefresh.bind(this);
        activityEditor.render({force:true});
    }

    async onRefreshDownTime(event,button){
        event.preventDefault();
        await this.internalRefresh();
    }

    
    async internalRefresh(){
        await this.ownerActorSheet.actor.updateDownTime();
        this.ownerActorSheet.render();
    }
}
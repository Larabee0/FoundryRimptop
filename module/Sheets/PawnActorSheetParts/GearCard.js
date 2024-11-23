import { SpawnThingSheet } from "../SpawnThingSheet.js";
import { GenericStatCardSheet } from "../GenericStatCardSheet.js";
import { ThingMoreMenu } from "../Forms/ThingMoreMenu.js";

export class GearCard{
    ownerActorSheet;

    constructor(actorSheet){
        this.ownerActorSheet = actorSheet;
    }

    async _prepareContextGearCard(context, actor){
        if(actor.type ==="pawn"){
            if("noneGear" in context.system.gearCard){
                await actor.updateGear();
                context.system.gearCard = structuredClone(actor.system.gearCard);
            }
        }
        return context;
    }

    _onRender(context,options){
        let ingestibles = this.ownerActorSheet.element.getElementsByClassName("thing-ingest");
        if(ingestibles){
            for(let i= 0; i<ingestibles.length;i++){
                ingestibles.item(i).addEventListener("click",this.tryIngestThing.bind(this));
            }
        }
        let droppables = this.ownerActorSheet.element.getElementsByClassName("thing-drop");
        if(droppables){
            for(let i= 0; i<droppables.length;i++){
                droppables.item(i).addEventListener("click",this.tryDropThing.bind(this));
            }
        }
        let infos = this.ownerActorSheet.element.getElementsByClassName("thing-info");
        if(infos){
            for(let i= 0; i<infos.length;i++){
                infos.item(i).addEventListener("click",this.tryOpenInfoForThing.bind(this));
            }
        }
        let wearables = this.ownerActorSheet.element.getElementsByClassName("thing-wear");
        if(wearables){
            for(let i= 0; i<wearables.length;i++){
                wearables.item(i).addEventListener("click",this.tryWearThing.bind(this));
            }
        }
        let equppables = this.ownerActorSheet.element.getElementsByClassName("thing-equip");
        if(equppables){
            for(let i= 0; i<equppables.length;i++){
                equppables.item(i).addEventListener("click",this.tryEquipThing.bind(this));
            }
        }
        let moreMenus = this.ownerActorSheet.element.getElementsByClassName("thing-multi-action");
        if(moreMenus){
            for(let i= 0; i<moreMenus.length;i++){
                moreMenus.item(i).addEventListener("click",this.openMoreMenu.bind(this));
            }
        }
    }
    
    async tryIngestThing(event){
        event.preventDefault();
        
        let thingId = event.currentTarget.dataset.thingid;
        let pawnId = this.ownerActorSheet.actor.system.thingID;

        await this.IngestThing(pawnId,thingId);
    }

    async tryDropThing(event){
        event.preventDefault();

        let thingId = event.currentTarget.dataset.thingid;
        let pawnId = this.ownerActorSheet.actor.system.thingID;

        await this.DropThingInventory(pawnId,thingId);
    }

    async tryOpenInfoForThing(event){
        event.preventDefault();
        
        let thingId = event.currentTarget.dataset.thingid;

        await this.OpenInfoCard(thingId);
    }

    async tryWearThing(event){
        event.preventDefault();
        let thingId = event.currentTarget.dataset.thingid;
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        await this.TryWearThing(pawnId,thingId);
    }

    async tryEquipThing(event){
        event.preventDefault();
        let thingId = event.currentTarget.dataset.thingid;
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        await this.TryEquipThing(pawnId,thingId);
    }
    async openMoreMenu(event){
        event.preventDefault();
        let thingId = event.currentTarget.dataset.thingid;
        let moreMenu = new ThingMoreMenu(this.ownerActorSheet.actor,thingId,this.internalRefresh.bind(this));
        moreMenu.render({force:true});
    }

    async onRefreshGear(event,button){
        event.preventDefault();
        await this.internalRefresh();
    }

    async createNewThing(event){
        event.preventDefault();

        let spawnSheet = new SpawnThingSheet();
        spawnSheet.giveToActor = this.ownerActorSheet.actor;
        spawnSheet.onSpawnAction = this.internalRefresh.bind(this);
        spawnSheet.render({force:true});
    }

    async internalRefresh(){

        await this.ownerActorSheet.actor.updateGear();
        this.ownerActorSheet.render();
    }

    async IngestThing(pawnId,thingId){
        await CONFIG.csInterOP.SendHttpRequest("POST","ingestThing",pawnId,thingId);
        await this.internalRefresh();
    }

    async DropThingInventory(pawnId, thingId){
        console.log("Drop thing",thingId);
        await CONFIG.csInterOP.SendHttpRequest("POST","dropThing",pawnId,thingId);
        await this.internalRefresh();
    }

    async OpenInfoCard(thingId){
        let thingInfo = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getThingInfoCard",thingId));

        let statSheet = new GenericStatCardSheet(thingInfo);
        statSheet.render({force:true});

        //console.log(thingInfo);
    }

    async TryWearThing(pawnId, thingId){
        await CONFIG.csInterOP.SendHttpRequest("POST","tryWearThing",pawnId,thingId);
        await this.internalRefresh();
    }

    async TryEquipThing(pawnId, thingId){
        await CONFIG.csInterOP.SendHttpRequest("POST","tryEquipThing",pawnId,thingId);
        await this.internalRefresh();
    }
}
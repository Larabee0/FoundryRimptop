const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ThingMoreMenu extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "thing-more-menu",
        tag: "form",
        window:{
            icon: "fas fa-ellipsis",
            title: "ThingMoreMenu.form.title",
            resizable:true
        },
        position: {
          width: 125,
          height: 250
        },
        actions:{
            selectPawn:ThingMoreMenu.#onSelectPawn,
            goBackFromSelectPawn:ThingMoreMenu.#onGoBackFromSelectPawn,
            pickPawn:ThingMoreMenu.#sendToPawn
        }
    }

    static PARTS = {
        form: {
          id: "moreMenu",
          template: "systems/rimtop/templates/dialogue/thing-more-menu.hbs"
        }
    }

    get title(){
        return "More options";
    }

    targetActor;
    targetThingId;

    thingSituation={};

    onCloseAction;
    selectPawn = false;

    constructor(actor,thing,closeAction){
        super();
        if(!actor || !thing){
            return;
        }
        this.targetActor = actor;
        this.targetThingId = thing;
        this.onCloseAction = closeAction;
    }

    async _prepareContext(options){
        if(Object.keys(this.thingSituation).length === 0){
            this.thingSituation = await this.GetThingSituation(this.targetThingId);
        }

        let context ={
            thingContext: this.thingSituation
        }

        if(this.selectPawn){
            context.selectAction= false;
            context.selectPawn = true;
            context.targetablePawns = this.getAllPawns();

        }
        else{
            context.selectAction= true;
        }

        console.log(context);
        return context;
    }

    _onClose(options){
        super._onClose(options);
        if(this.onCloseAction){
            this.onCloseAction();
        }
    }

    async GetThingSituation(thingId){
        return JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getThingContext",thingId));
    }

    getAllPawns(){
        let allPawns =[];
        for (let i = 0; i < game.actors.apps.length; i++){
            for(let j = 0; j < game.actors.apps[i].documents.length; j++){
                let actorType = game.actors.apps[i].documents[j].type;
                if(actorType ==="pawn"){
                    let actor = game.actors.apps[i].documents[j];
                    if(actor.system.thingID !== "uncreatedThing" && actor !==this.targetActor){
                        allPawns.push({
                            pawnId: actor.system.thingID,
                            Name:actor.name,
                            actorId:actor._id
                        });
                    }
                }
            }
        }
        return allPawns;
    }

    static #onSelectPawn(event,button){
        event.preventDefault();
        this.selectPawn = true;
        this.render();
    }

    static #onGoBackFromSelectPawn(event,button){
        event.preventDefault();
        this.selectPawn = false;
        this.render();
    }

    static async #sendToPawn(event,button){
        event.preventDefault();
        let pawnId = button.dataset.pawnId;
        let actorId = button.dataset.actorId;
        await this.SendToPawn(pawnId,this.targetThingId);
        let destinationActor = game.actors.get(actorId);
        if(destinationActor){
            destinationActor.updateGear();
        }
        this.close();
    }

    async SendToPawn(pawnId, thingId){
        await CONFIG.csInterOP.SendHttpRequest("POST","tryAddToInventory",pawnId,thingId);
    }
}
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
            pickPawn:ThingMoreMenu.#sendToPawn,
            sendToScene:ThingMoreMenu.#sendToScene,
            sendToWorld:ThingMoreMenu.#sendToWorld
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

    transferCount = 1;

    constructor(actor,thing,closeAction){
        super();
        if(!thing){
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
            thingContext: this.thingSituation,
            transferCount: this.transferCount
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

    _onRender(context,options){
        
        let transferSlider = this.element.querySelector("[id=amount-slider]");
        if(transferSlider){
            transferSlider.addEventListener("change",this.onChangeCount.bind(this));
        }
    }

    onChangeCount(event){
        
        event.preventDefault();
        this.transferCount = parseInt(event.currentTarget.value);
        this.render();
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

    static async #sendToWorld(event,button){
        event.preventDefault();
        
        if(this.thingSituation.HeldByPawn){

            var dropResult = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","dropThing",this.thingSituation.HeldByPawn,this.targetThingId));
            if(dropResult.Success){
                if(!dropResult.SentToMap && !dropResult.SentToWorld){
                    dropResult = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","dropThing",this.thingSituation.HeldByPawn,this.targetThingId));
                }
                var thingActor = await CONFIG.csInterOP.handleDroppedThing(dropResult,false);
                if(dropResult.SentToMap){
                    await this.transferSceneToWorld(thingActor);
                }
                this.close();
                return;
            }
            console.error("failed to drop thing",this.targetThingId,"from pawn",this.thingSituation.HeldByPawn);
            
        }
        else if(this.thingSituation.HeldByMap){
            await this.transferSceneToWorld();
        }
        this.close();
    }

    static async #sendToScene(event,button){
        event.preventDefault();
        if(this.thingSituation.HeldByPawn){
            var dropResult = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","dropThing",this.thingSituation.HeldByPawn,this.targetThingId));
            if(dropResult.Success){
                if(!dropResult.SentToMap && !dropResult.SentToWorld){
                    dropResult = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","dropThing",this.thingSituation.HeldByPawn,this.targetThingId));
                }
                var thingActor = await CONFIG.csInterOP.handleDroppedThing(dropResult);
                if(dropResult.SentToWorld){
                    await this.transferWorldToScene(thingActor);
                }
                this.close();
                return;
            }
            console.error("failed to drop thing",this.targetThingId,"from pawn",this.thingSituation.HeldByPawn);
        }
        else if(this.thingSituation.HeldByWorld){
            await this.transferWorldToScene();
        }
        this.close();
    }

    async transferSceneToWorld(thingActor){
        // transfer map to world
        await CONFIG.csInterOP.SendHttpRequest("POST","sendToWorldDirect",this.targetThingId);
        var folder = CONFIG.csInterOP.GetWorldInventoryFolder();
        if(thingActor){
            thingActor = await thingActor.update({folder: folder});
        }
        else{
            var thingData = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getThingData",this.targetThingId));
            thingActor = await CONFIG.csInterOP.createActorThingRaw(thingData,"icons/svg/item-bag.svg",folder);
        }
    }

    
    async transferWorldToScene(thingActor){
        // transfer world to map
        var activeScene = game.scenes.current;
        if(!activeScene){
            return;
        }
        var folderId = activeScene.getFlag("rimtop","sceneFolder");

        await CONFIG.csInterOP.SendHttpRequest("POST","sendMapToDirect",this.targetThingId,this.activeScene.id);

        var folder = CONFIG.csInterOP.GetActorFolderById(folderId);
        if(thingActor){
            thingActor = await thingActor.update({folder: folder});
        }
        else{
            var thingData = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getThingData",this.targetThingId));
            await CONFIG.csInterOP.createActorThingRaw(thingData,"icons/svg/item-bag.svg",folder);
        }
    }

}
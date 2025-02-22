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
          width: 210,
          height: 300
        },
        actions:{
            selectPawn:ThingMoreMenu.#onSelectPawn,
            goBackFromSelectPawn:ThingMoreMenu.#onGoBackFromSelectPawn,
            pickPawn:ThingMoreMenu.#sendToPawn,
            sendToScene:ThingMoreMenu.#sendToScene,
            sendToWorld:ThingMoreMenu.#sendToWorld,
            destroy:ThingMoreMenu.#destroy,
            despawn:ThingMoreMenu.#despawn
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

    async _onClose(options){
        super._onClose(options);
        if(this.onCloseAction){
            await this.onCloseAction();
        }
    }

    async GetThingSituation(thingId){
        return JSON.parse(await CONFIG.HttpRequest.GetThingContext(thingId));
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
        await this.SendToPawn(pawnId,this.targetThingId,this.transferCount);
        let destinationActor = game.actors.get(actorId);
        if(destinationActor){
            await destinationActor.updateGear();
        }
        this.close();
    }

    async SendToPawn(pawnId, thingId,count){
        //var data = await CONFIG.HttpRequest.TryAddToPawnInventory(pawnId,thingId,count)
        var thingData = JSON.parse(await CONFIG.HttpRequest.TryAddToPawnInventory(pawnId,thingId,count));
        var thindActorId = CONFIG.csInterOP.GetActorByThingId(thingId);
        if(thindActorId){
            var thingActor = game.actors.get(thindActorId);
            if(thingData.ThingId === thingId){
                // if the thingId is the same, a new thing was not made for the pawn inv,
                // so if there is an actor associated with this thingId the actor needs deleting
                this.onCloseAction = null;
                await thingActor.setThingId("InventoryActorDelete");
                await thingActor.delete();
            }
            else{
                // else refresh the actor name
                await thingActor.updateDisplayedName();
            }
        }
    }
    
    static async #despawn(event, button){
        if(!this.thingSituation.HeldByPawn){
            var thingActor =game.actors.get(CONFIG.csInterOP.GetActorByThingId(this.targetThingId));
            if(thingActor){
                await thingActor.clearSpawnedTokens();
            }
        }
        this.close();
    }

    static async #destroy(event, button){
        event.preventDefault();

        var destroyResult = JSON.parse(await CONFIG.HttpRequest.DestroyThingsCount(JSON.stringify([this.targetThingId]),JSON.stringify([this.transferCount])));
        for(var i = 0; i < destroyResult.length; i++){
            var res = destroyResult[i];

            if(res.Success && res.Destroyed){
                
                if(this.thingSituation.HeldByPawn){
                    var pawnActor =game.actors.get(CONFIG.csInterOP.GetActorByThingId(this.thingSituation.HeldByPawn));
                    if(pawnActor){
                        await pawnActor.updateGear();
                    }
                }
                else{
                    var thingActor =game.actors.get(CONFIG.csInterOP.GetActorByThingId(this.targetThingId));
                    if (!res.Merged){
                        // delete corrisponding actor
                        await thingActor.delete();
                    }
                    else{
                        // update actor name
                        await thingActor.updateDisplayedName();
                    }
                }
            }
        }
        this.onCloseAction = null;
        this.close();
    }

    static async #sendToWorld(event,button){
        event.preventDefault();
        
        if(this.thingSituation.HeldByPawn){

            var dropResult = JSON.parse(await CONFIG.HttpRequest.DropThing(this.thingSituation.HeldByPawn,this.targetThingId,this.transferCount));
            if(dropResult.Success){
                if(!dropResult.SentToMap && !dropResult.SentToWorld){
                    dropResult = JSON.parse(await CONFIG.HttpRequest.DropThing(this.thingSituation.HeldByPawn, dropResult.ThingData.ThingId));
                }
                var thingActor = await CONFIG.csInterOP.handleDroppedThing(dropResult,false);
                if(dropResult.SentToMap){
                    await this.transferSceneToWorld(thingActor, this.transferCount);
                }
                else{
                    await thingActor.updateDisplayedName();
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
            var dropResult = JSON.parse(await CONFIG.HttpRequest.DropThing(this.thingSituation.HeldByPawn,this.targetThingId,this.transferCount));
            if(dropResult.Success){
                if(!dropResult.SentToMap && !dropResult.SentToWorld){
                    dropResult = JSON.parse(await CONFIG.HttpRequest.DropThing(this.thingSituation.HeldByPawn, dropResult.ThingData.ThingId));
                }
                var thingActor = await CONFIG.csInterOP.handleDroppedThing(dropResult);
                if(dropResult.SentToWorld){
                    await this.transferWorldToScene(thingActor, this.transferCount);
                }
                this.close();
                return;
            }
            console.error("failed to drop thing",this.targetThingId,"from pawn",this.thingSituation.HeldByPawn);
        }
        else if(this.thingSituation.HeldByWorld){
            
            var thingActor =game.actors.get( CONFIG.csInterOP.GetActorByThingId(this.targetThingId));
            await this.transferWorldToScene(thingActor,this.transferCount);
        }
        this.close();
    }

    async transferSceneToWorld(thingActor, stackCount){
        // transfer map to world
        var result = JSON.parse(await CONFIG.HttpRequest.SendThingToWorldDirect(thingActor.system.thingID,stackCount));
        var thingId = result.ResultThingId;
        if(result.Merged){
            if(thingActor){
                this.onCloseAction = null;
                await thingActor.delete();
            }
            thingActor =game.actors.get( CONFIG.csInterOP.GetActorByThingId(thingId));
            await thingActor.updateDisplayedName();
        }

        var folder = CONFIG.csInterOP.GetWorldInventoryFolder();
        if(thingActor){
            thingActor = await thingActor.update({folder: folder});
        }
        else{
            var thingData = JSON.parse(await CONFIG.HttpRequest.GetThingData(thingId));
            thingActor = await CONFIG.csInterOP.createActorThingRaw(thingData,"icons/svg/item-bag.svg",folder);
            
        }
    }

    
    async transferWorldToScene(thingActor, count){
        // transfer world to map
        var activeScene = game.scenes.current;
        if(activeScene == null){
            return;
        }

        var folderId = activeScene.getFlag("rimtop","sceneFolder");

        var spawnResult = JSON.parse(await CONFIG.HttpRequest.SendThingToMapDirect(thingActor.system.thingID,activeScene.id,count));
        if(thingActor.system.thingID !==spawnResult.ThingId){
            
            thingActor = null;
        }

        var folder = CONFIG.csInterOP.GetActorFolderById(folderId);
        if(thingActor){
            thingActor = await thingActor.update({folder: folder});
        }
        else{
            var thingData = JSON.parse(await CONFIG.HttpRequest.GetThingData(spawnResult.ThingId));
            thingActor = await CONFIG.csInterOP.createActorThingRaw(thingData,"icons/svg/item-bag.svg",folder);
        }

        var dimensions = activeScene.dimensions;
        var x = dimensions.width / 2;
        var y = dimensions.height / 2;
        
        await CONFIG.csInterOP.createToken(thingActor,activeScene,x,y);
    }

}
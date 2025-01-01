import {SpawnThingSheet} from "./SpawnThingSheet.js";
import { StatCard } from "./StatCard.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const {ActorSheetV2} = foundry.applications.sheets;

export class BaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2){

    statCardTabController;

    static DEFAULT_OPTIONS = {
        //id: "base-actor",
        window:{
            icon: "fas fa-suitcase",
            title: "BaseActorSheet.form.title",
            resizable:true,            
            contentClasses: ["standard-form"]
        },
        form:{
          submitOnChange: false,
          closeOnSubmit: false
        },
        position: {
          width: 600,
          height: 600
        },
        actions:{
            // triggers the rerender of the window when the user selects a thing
            selectThing:BaseActorSheet.#onMakeThing,
            refreshStats:BaseActorSheet.#onRefreshStats
        }
    }

    get title(){
        return this.actor.name
    }

    static PARTS={
        tabs:{
            template:"templates/generic/tab-navigation.hbs"
        },
        statCard:{
            template:"systems/rimtop/templates/sheets/base-actor-sheet.hbs"
        }
    }

    tabGroups = {
        sheet: "statCard"
    }

    #getTabs() {
        const tabs = {
            statCard: {id: "statCard", group: "sheet", icon: "fa-solid fa-chart-simple", label: "Stats"}
        };
        for ( const v of Object.values(tabs) ) {
          v.active = this.tabGroups[v.group] === v.id;
          v.cssClass = v.active ? "active" : "";
        }
        return tabs;
    }

    async _superPrepareContext(options){
        return await super._prepareContext(options);
    }
    
    async _prepareContext(options){
        let context = await super._prepareContext(options);
        context.tabs = this.#getTabs();
        let actor = this.actor;
        context.system = structuredClone(actor.system);

        if(actor.type === "thing"){
            context.thingExists = context.system.thingID !=="uncreatedThing" 
        }

        return this._prepareContextStatCard(context, actor);
    }

    async _prepareContextStatCard(context, actor){
        if(!this.statCardTabController){
            this.statCardTabController = new StatCard(this,actor,null);
        }
        
        return this.statCardTabController._prepareContextStatCard(context)
    }

    // opens the thing creator window automatically if this sheet represents an uncreated thing.
    _onFirstRender(context,options){
        super._onFirstRender(context,options);
        
        let sheetClass = this.actor.getFlag("core","sheetClass");

        if(this.actor.type === "thing"){

            if(sheetClass !== "rimtop.BaseActorSheet"){
                this.actor.setFlag("core","sheetClass","rimtop.BaseActorSheet");
            }

            if(this.actor.folder == null){
                var worldInvFolder = CONFIG.csInterOP.GetWorldInventoryFolder();
                if(worldInvFolder != null){
                    game.folders._expanded[worldInvFolder.uuid] = true;
                    this.actor.update({folder: worldInvFolder});
                }

            }
        }
        else if(this.actor.type === "pawn"){
            
            if(sheetClass !== "rimtop.PawnActorSheet"){
                this.actor.setFlag("core","sheetClass","rimtop.PawnActorSheet");
            }
            
            if(this.actor.folder == null){
                var pawnFolder = CONFIG.csInterOP.GetPawnsFolder();
                if(pawnFolder != null){
                    game.folders._expanded[pawnFolder.uuid] = true;
                    this.actor.update({folder: pawnFolder});
                }
            }
        }
        if(this.actor.type === "thing" && this.actor.system.thingID ==="uncreatedThing"){
            this.actor.openCreateItemDialogue();
            
        }
    }

    _onRender(context,options){
        super._onRender(context,options);
        this.statCardTabController?.statCardOnRender();
    }

    _onClose(){
        this.statCardTabController?._onClose();
    }

    static #onMakeThing(event,button){
        event.preventDefault();
        let spawnSheet = new SpawnThingSheet();
        spawnSheet.targetActor = this.actor;
        spawnSheet.render({ force: true });
    }

    static async #onRefreshStats(event, button){
        this.statCardTabController?.onRefreshStats(event);
    }
    
    testUpdate(){
        const updates={
            "system.tingID":"testUpdate"
        };
        this.actor.update(updates);
    }
}
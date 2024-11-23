import { BaseActorSheet } from "../BaseActorSheet.js";
import { BioTab } from "./BioTab.js";
import { GearCard } from "./GearCard.js";
import { HealthCard } from "./HealthCard.js";
import { NeedsCard } from "./NeedsCard.js";
import { DownTimeCard } from "./DownTimeCard.js";
import { CombatCard } from "./CombatCard.js";

export class PawnActorSheet extends BaseActorSheet{

    static DEFAULT_OPTIONS={
        //id:"pawn-actor",
        window:{
            icon:"fas fa-user"
        },
        position: {
          height: 665
        },
        actions:{
            "createPawnAction":PawnActorSheet.#createPawn,
            "refreshBio":PawnActorSheet.#onRefreshBio,
            "editBioToggle":PawnActorSheet.#onEditBioToggle,
            "editPassion":PawnActorSheet.#onEditPassion,
            "addTrait":PawnActorSheet.#onAddTrait,
            "editBackstory":PawnActorSheet.#onEditBackstory,
            "refreshGear":PawnActorSheet.#onRefreshGear,
            "createNewThing":PawnActorSheet.#onCreateNewThing,
            "refreshHealth":PawnActorSheet.#onRefreshHealth,
            "toggleOperationsTab":PawnActorSheet.#onToggleOperationsTab,
            "toggleSelfTend":PawnActorSheet.#onToggleSelfTend,
            "editHediffsToggle":PawnActorSheet.#onToggleEditHediffs,
            "addHediff":PawnActorSheet.#onAddHediff,
            "addDamage":PawnActorSheet.#onAddDamge,
            "resurrectPawn":PawnActorSheet.#onResurrectPawn,
            "refreshNeeds":PawnActorSheet.#onRefreshNeeds,
            "refreshDownTime":PawnActorSheet.#onRefreshDownTime,
            "combatRefresh":PawnActorSheet.#onRefreshCombat
        }
    }

    static PARTS={
        tabs:{
            template:"systems/rimtop/templates/generic/tab-navigation.hbs"
        },
        pawnCreator:{
            template:"systems/rimtop/templates/sheets/pawn-creator-button.hbs"
        },
        bioCard:{
            template:"systems/rimtop/templates/sheets/pawn-bio-card.hbs"
        },
        statCard:{
            template:"systems/rimtop/templates/sheets/base-actor-sheet.hbs"
        },
        gearCard:{
            template:"systems/rimtop/templates/sheets/pawn-gear-card.hbs"
        },
        healthCard:{
            template:"systems/rimtop/templates/sheets/pawn-health-card.hbs"
        },
        needsCard:{
            template:"systems/rimtop/templates/sheets/pawn-needs-card.hbs"
        },
        downTimeCard:{
            template:"systems/rimtop/templates/sheets/pawn-down-time-card.hbs"
        },
        combatCard:{
            template:"systems/rimtop/templates/sheets/pawn-combat-card.hbs"
        }
    }
    tabGroups = {
        sheet: "bioCard"
    }

    bioTabController;

    gearTabController;

    healthTabController;

    needsTabController;

    downTimeTabController;

    combatTabController;
    
    #getTabs() {
        let tabs;
        if(!this.actor.IsAlive())
        {
            // dead
            tabs = {
                //combatCard:{id:"combatCard",group:"sheet",icon:"fa-solid fa-swords",tooltip:"Combat"},
                bioCard: {id: "bioCard", group: "sheet", icon: "fa-solid fa-user", tooltip: "Bio"},
                gearCard: {id: "gearCard", group: "sheet", icon: "fa-solid fa-shelves", tooltip: "Gear"},
                //needsCard: {id: "needsCard", group: "sheet", icon: "fa-solid fa-masks-theater", tooltip: "Needs"},
                //downTimeCard: {id: "downTimeCard", group: "sheet", icon: "fa-solid fa-bed", tooltip: "Down time"},
                healthCard: {id: "healthCard", group: "sheet", icon: "fa-solid fa-kit-medical", tooltip: "Health"},
                statCard: {id: "statCard", group: "sheet", icon: "fa-solid fa-chart-simple", tooltip: "Stats"}
            };
        }
        else
        {
            // treat as alive
            tabs = {
                combatCard:{id:"combatCard",group:"sheet",icon:"fa-solid fa-swords",tooltip:"Combat"},
                bioCard: {id: "bioCard", group: "sheet", icon: "fa-solid fa-user", tooltip: "Bio"},
                gearCard: {id: "gearCard", group: "sheet", icon: "fa-solid fa-shelves", tooltip: "Gear"},
                needsCard: {id: "needsCard", group: "sheet", icon: "fa-solid fa-masks-theater", tooltip: "Needs"},
                downTimeCard: {id: "downTimeCard", group: "sheet", icon: "fa-solid fa-bed", tooltip: "Down time"},
                healthCard: {id: "healthCard", group: "sheet", icon: "fa-solid fa-kit-medical", tooltip: "Health"},
                statCard: {id: "statCard", group: "sheet", icon: "fa-solid fa-chart-simple", tooltip: "Stats"}
            };
        }
        for ( const v of Object.values(tabs) ) {
          v.active = this.tabGroups[v.group] === v.id;
          v.cssClass = v.active ? "active" : "";
        }
        return tabs;
    }

    async changeTab(tab,group,options){
        if(tab !=="bioCard"){
            await this.bioTabController.changeTabBio();
        }
        super.changeTab(tab,group,options);
        this.render();
    }

    async _prepareContext(options){
        let context = await super._superPrepareContext(options);
        let actor = this.actor;
        context.system = structuredClone(actor.system);

        if(actor.type ==="pawn"){
            context.pawnExists = context.system.thingID !=="uncreatedThing" 
        }

        if(context?.pawnExists){    
            context.tabs = this.#getTabs();
            context.isGM = game.user.isGM;
            if(this.tabGroups.sheet==="statCard"){
                context = await this._prepareContextStatCard(context,actor);    
            }
            
            if(this.tabGroups.sheet==="bioCard"){
                if(!this.bioTabController){
                    this.bioTabController = new BioTab(this);
                }
                context = await this.bioTabController._prepareContextBioCard(context,actor);
            }

            if(this.tabGroups.sheet==="gearCard"){
                if(!this.gearTabController){
                    this.gearTabController = new GearCard(this);
                }
                context=await this.gearTabController._prepareContextGearCard(context,actor);
            }

            if(this.tabGroups.sheet==="healthCard"){
                if(!this.healthTabController){
                    this.healthTabController = new HealthCard(this);
                }
                context = await this.healthTabController._prepareContextHealthCard(context,actor);
            }

            if(this.tabGroups.sheet ==="needsCard"){
                if(!this.needsTabController){
                    this.needsTabController = new NeedsCard(this);
                }
                context = await this.needsTabController._prepareContextNeedsCard(context,actor);
            }

            if(this.tabGroups.sheet ==="downTimeCard"){
                if(!this.downTimeTabController){
                    this.downTimeTabController = new DownTimeCard(this);
                }
                context = await this.downTimeTabController._prepareContextDownTimeCard(context,actor);
            }

            if(this.tabGroups.sheet ==="combatCard"){
                if(!this.combatTabController){
                    this.combatTabController = new CombatCard(this);
                }
                context = await this.combatTabController._prepareContextCombatCard(context,actor);
            }
        }
        else{
        }

        console.log(context);
        return context;
        
    }

    async _preClose(){
        await this.bioTabController?._preClose();
        return super._preClose();
    }



    async _onFirstRender(context,options){
        super._onFirstRender(context,options);
        if(this.actor.type === "pawn" && this.actor.system.thingID ==="uncreatedThing"){
            this.actor.openCreatePawnDialogue();
        }
    }

    _onRender(context,options){
        super._onRender(context,options);
        
        if(!(context?.pawnExists)){
            
            let createButton = this.element.querySelector("[class=stat-list]");
            if(createButton){
                createButton.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
            }
        }

        this.bioTabController?._onRender(context,options);
        this.gearTabController?._onRender(context,options);
        this.healthTabController?._onRender(context,options);
        this.needsTabController?._onRender(context,options);
        this.downTimeTabController?._onRender(context,options);
        this.combatTabController?._onRender(context,options);
    }

    // general callbacks
    static #createPawn(event,button){
        event.preventDefault();
        this.actor.openCreatePawnDialogue();
    }

    // bio card editor callbacks
    static async #onRefreshBio(event,button){
        await this.bioTabController?.onRefreshBio(event,button);
    }

    static async #onRefreshGear(event, button){
        await this.gearTabController?.onRefreshGear(event,button);
    }

    static async #onRefreshHealth(event,button){
        await this.healthTabController?.onRefreshHealth(event,button);
    }

    static #onToggleOperationsTab(event,button){
        event.preventDefault();
        this.healthTabController?.onToggleOperationsTab();
    }

    static async #onToggleSelfTend(event,button){
        event.preventDefault();
        await this.healthTabController?.onToggleSelfTend();
    }

    static async #onToggleEditHediffs(event, button){
        event.preventDefault();
        await this.healthTabController?.onToggleEditHediffs(event,button);
    }

    static async #onCreateNewThing(event,button){
        await this.gearTabController?.createNewThing(event);
    }

    static async #onEditBioToggle(event, button){
        await this.bioTabController?.onEditBioToggle(event,button);
    }

    static async #onEditPassion(event,button){
        await this.bioTabController?.onEditPassion(event,button);
    }

    static #onAddTrait(event,button){
        this.bioTabController?.onAddTrait(event,button);
    }

    static #onEditBackstory(event,button){
        this.bioTabController?.onEditBackstory(event,button);
    }

    static #onAddHediff(event,button){
        this.healthTabController?.onAddHediff(event,button);
    }
    static #onAddDamge(event,button){
        this.healthTabController?.onAddDamage(event,button);
    }

    static async #onResurrectPawn(event,button){
        await this.healthTabController?.onResurrectPawn(event,button);
    }

    static async #onRefreshNeeds(event,button){
        await this.needsTabController?.onRefreshNeeds(event,button);
    }
    static async #onRefreshDownTime(event,button){
        await this.downTimeTabController?.onRefreshDownTime(event,button);
    }
    static async #onRefreshCombat(event,button){
        await this.combatTabController?.onRefreshCombat(event,button);
    }
    
}
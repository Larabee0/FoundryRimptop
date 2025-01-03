

import { GenericStatCardSheet } from "../GenericStatCardSheet.js";
import { ConfigureMeleeAttacks } from "../Forms/ConfigureMeleeAttacks.js";

export class CombatCard{
    ownerActorSheet;

    constructor(actorSheet){
        this.ownerActorSheet = actorSheet;
    }

    async _prepareContextCombatCard(context,actor){
        if(actor.type==="pawn"){
            if("noneCombat" in context.system.combatCard){
                await actor.updateCombat();
                context.system.combatCard = structuredClone(actor.system.combatCard);
            }
            context.system.combatCard.inCombat = actor.inCombat;
            context.system.combatCard.endTurnAllowed = this.isCurrentTurn();
        }
        return context;
    }

    _onRender(context, options){
        let meleeAttackOptions = this.ownerActorSheet.element.querySelector("[id=melee-attack-options]")
        if(meleeAttackOptions){
            meleeAttackOptions.addEventListener("click",this.configureMeleeAttacks.bind(this));
        }
        let initiative = this.ownerActorSheet.element.querySelector("[id=roll-inititative]");
        if(initiative){
            initiative.addEventListener("click",this.rollInit.bind(this));
        }
        let wait30 = this.ownerActorSheet.element.querySelector("[id=wait-action]");
        if(wait30){
            wait30.addEventListener("click",this.wait30Ticks.bind(this));
        }
        
        let waitX = this.ownerActorSheet.element.querySelector("[id=wait-action-custom]");
        if(waitX){
            waitX.addEventListener("click",this.waitCustomTicks.bind(this));
        }

        let waitXInput = this.ownerActorSheet.element.querySelector("[id=custom-ticks-input]")
        if(waitXInput){
            waitXInput.addEventListener("focusout",this.updateCustomTickDuration.bind(this));
        }

        let waitRestOfTurn = this.ownerActorSheet.element.querySelector("[id=wait-whole-turn]");
        if(waitRestOfTurn){
            waitRestOfTurn.addEventListener("click",this.waitRestOfTurnTicks.bind(this));
        }
        let endTurn = this.ownerActorSheet.element.querySelector("[id=end-turn]");
        if(endTurn){
            endTurn.addEventListener("click",this.endTurn.bind(this));
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
        let equppables = this.ownerActorSheet.element.getElementsByClassName("thing-equip");
        if(equppables){
            for(let i= 0; i<equppables.length;i++){
                equppables.item(i).addEventListener("click",this.tryEquipThing.bind(this));
            }
        }


        let actions = this.ownerActorSheet.element.getElementsByClassName("action-column");
        if(actions){
            for(let i= 0; i<actions.length;i++){
                actions.item(i).addEventListener("click",this.tryDoAction.bind(this));
            }
        }
        let combatActions = this.ownerActorSheet.element.getElementsByClassName("combat-action");
        if(combatActions){
            for(let i= 0; i<combatActions.length;i++){
                combatActions.item(i).addEventListener("click",this.tryRefundTime.bind(this));
            }
        }
        let completeStance = this.ownerActorSheet.element.querySelector("[id=complete-stance]");
        if(completeStance){
            completeStance.addEventListener("click",this.completeBusyStance.bind(this));
        }
    }

    isCurrentTurn(){
        if(this.ownerActorSheet.actor.inCombat){
            return game.combat.combatant.actor._id == this.ownerActorSheet.actor._id;
        }
        return false;
    }

    async endTurn(event){
        event.preventDefault();
        await game.combat.refreshCombatantInitativeByActorId(this.ownerActorSheet.actor._id);
        if(this.isCurrentTurn()){
            let combatant = game.combat.combatant;
            if(combatant.testUserPermission(game.user,"LIMITED")){
                await game.combat.nextTurn();
            }
            else{
                console.warn(game.user,"has insufficient permissions to end this turn");
            }
        }
    }

    async wait30Ticks(event){
        event.preventDefault();
        await this.ownerActorSheet.actor.wait30Ticks();
        await this.internalRefresh();
    }

    async waitRestOfTurnTicks(event){
        event.preventDefault();
        await this.ownerActorSheet.actor.waitRestOfTurnTicks();
        await this.internalRefresh();
    }

    async updateCustomTickDuration(event){
        event.preventDefault();
        let customTickInput = this.ownerActorSheet.element.querySelector("[id=custom-ticks-input]");
        if(!customTickInput){
            return;
        }
        if(isNaN(customTickInput.value)){
            customTickInput.value = 60;
            return;
        }
        let ticks =Number(customTickInput.value);
        ticks = Math.floor(ticks);
        ticks = ticks.clamp(1,360);
        await this.ownerActorSheet.actor.update({"system.customTickDuration":parseInt(ticks)});
    }

    async waitCustomTicks(event){
        event.preventDefault();
        await this.ownerActorSheet.actor.customWait();
        await this.internalRefresh();
    }

    async configureMeleeAttacks(event){
        event.preventDefault();
        
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        let configMeleeVerbs = new ConfigureMeleeAttacks(pawnId);
        configMeleeVerbs.render({force:true});
    }

    async completeBusyStance(event){
        event.preventDefault();
        await CONFIG.HttpRequest.TryCompletePawnBusyStance(this.ownerActorSheet.actor.system.thingID);
        await this.internalRefresh();
    }

    async tryRefundTime(event){
        event.preventDefault();
        let index = parseInt(event.currentTarget.dataset.index);
        if(isNaN(index)){
            return;
        }
        await CONFIG.HttpRequest.RefundActionPoints(this.ownerActorSheet.actor.system.thingID,JSON.stringify(index));
        await this.internalRefresh();
        await game.combat.refreshCombatantInitativeByActorId(this.ownerActorSheet.actor._id);
    }

    async rollInit(event){
        event.preventDefault();
        let rollResult = JSON.parse(await CONFIG.HttpRequest.RollStat(this.ownerActorSheet.actor.system.thingID,"Initiative"));
        CONFIG.csInterOP.processChatMessage(rollResult,this.ownerActorSheet.actor,"stat-roll");
    }

    async tryDoAction(event){
        event.preventDefault();

        let thingId = event.currentTarget.dataset.thingid;
        let pawnId = this.ownerActorSheet.actor.system.thingID;

        let combatCardData =  this.ownerActorSheet.actor.system.combatCard;
        let equipped = combatCardData.Equipped.includes(thingId);
        let inventory = combatCardData.Inventory.includes(thingId);
        let unarmed = combatCardData.Unarmed === thingId;

        if(unarmed){
            // need to drop all equippment that isn't apparel to do a proper unarmed attack.
            for(let i = 0; i < combatCardData.Equipped.length; i++){
                let ownerVerb = combatCardData.VerbOwners[combatCardData.Equipped[i]];
                if(!ownerVerb.Apparel){
                    await this.DropThingInventory(pawnId,combatCardData.Equipped[i]);
                }
            }
            // start melee attack
            await  this.makeAttackCard(thingId,true,false,false);
        }
        else if(inventory){
            // if the thing we are attacking with is not equipped, we need to equip it. We will only equip it.
            await this.TryEquipThing(pawnId, thingId);
        }
        else if(equipped){
            // start attack
            
            let ability = event.currentTarget.classList.contains("ability-cast");
            let rangedAttack = event.currentTarget.classList.contains("ranged-attack");
            let meleeAttack = event.currentTarget.classList.contains("melee-attack");
            await this.makeAttackCard(thingId,meleeAttack,rangedAttack,ability);
        }
        else{
            console.error("unknown action state",thingId,pawnId,combatCardData);
        }

    }

    async makeAttackCard(thingId,melee,ranged,ability){
        //console.log("make attack chat message",thingId,melee,ranged,ability);
        let combatCardData =  this.ownerActorSheet.actor.system.combatCard;
        if(melee){
        }
        else if(ranged){
        }
    }

    
    async tryDropThing(event){
        event.preventDefault();

        let thingId = event.currentTarget.dataset.thingid;
        let pawnId = this.ownerActorSheet.actor.system.thingID;

        await this.DropThingInventory(pawnId,thingId);
    }

    async DropThingInventory(pawnId, thingId){
        await CONFIG.csInterOP.handleDroppedThing(JSON.parse(await CONFIG.HttpRequest.DropThing(pawnId,thingId)));
        await this.internalRefresh();
    }

    async tryOpenInfoForThing(event){
        event.preventDefault();
        
        let thingId = event.currentTarget.dataset.thingid;

        await this.OpenInfoCard(thingId);
    }
    
    async OpenInfoCard(thingId){
        let thingInfo = JSON.parse(await CONFIG.HttpRequest.GetThingInfoCard(thingId));

        let statSheet = new GenericStatCardSheet(thingInfo);
        statSheet.render({force:true});

        //console.log(thingInfo);
    }


    async tryEquipThing(event){
        event.preventDefault();
        let thingId = event.currentTarget.dataset.thingid;
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        await this.TryEquipThing(pawnId,thingId);
    }

    async TryEquipThing(pawnId, thingId){
        await CONFIG.HttpRequest.TryEquipThing(pawnId,thingId);
        await this.internalRefresh();
    }

    async onRefreshCombat(event, button){
        event.preventDefault();
        await this.internalRefresh();
    }

    async internalRefresh(){
        await this.ownerActorSheet.actor.updateCombat();
        this.ownerActorSheet.render();
    }

}
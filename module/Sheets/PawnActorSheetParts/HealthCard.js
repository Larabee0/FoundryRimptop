import { SetHediffSeverity } from "../Forms/SetHediffSeverity.js";
import { AddHediffSheet } from "../Forms/AddHediffSheet.js";
import { GenericStatCardSheet } from "../GenericStatCardSheet.js";
import { MedicalBillPicker } from "../Forms/MedicalBillPicker.js";
import { BillPartialController } from "../PartialControllers/BillPartialController.js";
import { AddDamage } from "../Forms/AddDamage.js";

export class HealthCard{
    ownerActorSheet;
    operationsTabActive= false;
    
    editHediffs;

    medicalBillsController;

    constructor(actorSheet){
        this.ownerActorSheet = actorSheet;
    }

    async _prepareContextHealthCard(context,actor){
        if(actor.type === "pawn"){
            if("noneHeatlh" in context.system.healthSummary){
                await actor.updateHealthSummary();
                context.system.healthSummary = structuredClone(actor.system.healthSummary);
            }
            if("noneHediff" in context.system.hediffList){
                await actor.updateHediffList();
                context.system.hediffList = structuredClone(actor.system.hediffList);
            }
            context.system.hediffList.editHediffs = this.editHediffs;
            if(this.operationsTabActive){
                context.system.healthSummary.operationsActive="summary-tab-active";
                if("noneOperations" in context.system.operationBills){
                    await actor.updateOperationsBills();
                    context.system.operationBills = structuredClone(actor.system.operationBills);
                }
                if(!this.medicalBillsController){
                    this.medicalBillsController = new BillPartialController(actor,this.internalRefresh.bind(this));
                }
            }
            else{
                context.system.healthSummary.summaryActive="summary-tab-active";
            }
        }
        return context;
    }

    _onRender(context, options){
        let infos = this.ownerActorSheet.element.getElementsByClassName("hediff-info");
        if(infos){
            for(let i= 0; i<infos.length;i++){
                infos.item(i).addEventListener("click",this.openInfoSheet.bind(this));
            }
        }
        let addBills = this.ownerActorSheet.element.getElementsByClassName("add-bill-button");
        if(addBills && addBills.length > 0){
            addBills[0].addEventListener("click",this.addBill.bind(this));
        }
        if(this.editHediffs){
            let removables = this.ownerActorSheet.element.getElementsByClassName("hediff-remove");
            if(removables){
                for(let i= 0; i<removables.length;i++){
                    removables.item(i).addEventListener("click",this.removeHediff.bind(this));
                }
            }
            let harmables = this.ownerActorSheet.element.getElementsByClassName("hediff-harm");
            if(harmables){
                for(let i= 0; i<harmables.length;i++){
                    harmables.item(i).addEventListener("click",this.openHarmMenu.bind(this));
                }
            }
            let healables = this.ownerActorSheet.element.getElementsByClassName("hediff-heal");
            if(healables){
                for(let i= 0; i<healables.length;i++){
                    healables.item(i).addEventListener("click",this.openHealMenu.bind(this));
                }
            }
        }
        if(this.medicalBillsController){
            this.medicalBillsController.render(this.ownerActorSheet.element);
        }
    }

    async removeHediff(event){
        event.preventDefault();
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        let hediffId = event.currentTarget.dataset.hediffId;
        await CONFIG.HttpRequest.RemoveHediff(pawnId,hediffId);
        await this.internalRefresh();
    }

    async openHarmMenu(event){
        event.preventDefault();
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        let hediffId = event.currentTarget.dataset.hediffId;
        let severity = parseFloat(event.currentTarget.dataset.severity);
        let setSeverity = new SetHediffSeverity(pawnId,hediffId,severity,false);
        setSeverity.closeAction = this.internalRefresh.bind(this);
        setSeverity.titleText = "Increase modifier severity";
        setSeverity.render({force:true});


    }

    openHealMenu(event){
        event.preventDefault();
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        let hediffId = event.currentTarget.dataset.hediffId;
        let severity = parseFloat(event.currentTarget.dataset.severity);
        let setSeverity = new SetHediffSeverity(pawnId,hediffId,severity,true);
        setSeverity.closeAction = this.internalRefresh.bind(this);
        setSeverity.titleText = "Heal modifier severity";
        setSeverity.render({force:true});
    }

    async openInfoSheet(event){
        event.preventDefault();
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        let hediffId = event.currentTarget.dataset.hediffId;
        await this.OpenHediffInfoCard(pawnId,hediffId);
    }

    async onRefreshHealth(event, button){
        event.preventDefault();
        await this.internalRefresh();
    }

    async internalRefresh(){
        await this.ownerActorSheet.actor.updateHealthSummary();
        await this.ownerActorSheet.actor.updateHediffList();
        await this.ownerActorSheet.actor.updateOperationsBills();
        this.ownerActorSheet.render();
    }

    onToggleOperationsTab(){
        this.operationsTabActive =!this.operationsTabActive;
        this.ownerActorSheet.render();
    }

    async onToggleSelfTend(){
        let newValue = !this.ownerActorSheet.actor.system.healthSummary.SelfTend;
        //console.log(JSON.stringify(newValue));
        await CONFIG.HttpRequest.SetSelfTend(this.ownerActorSheet.actor.system.thingID, JSON.stringify(newValue));
        await this.ownerActorSheet.actor.updateHealthSummary();
        this.ownerActorSheet.render();
    }

    async onToggleEditHediffs(event,button){
        this.editHediffs = button.checked;
        await this.internalRefresh();
    }

    onAddHediff(event,button){
        event.preventDefault();
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        let addHediff = new AddHediffSheet(pawnId);
        addHediff.closeAction = this.internalRefresh.bind(this);
        addHediff.render({force:true});
    }

    async OpenHediffInfoCard(pawnId,hediffId){
        let hediffInfo = JSON.parse(await CONFIG.HttpRequest.GetHediffInfoCard(pawnId,hediffId));

        //console.log(hediffInfo);
        let statSheet = new GenericStatCardSheet(hediffInfo);
        statSheet.render({force:true});

    }

    async addBill(event){
        event.preventDefault();
        let billPicker = new MedicalBillPicker(this.ownerActorSheet.actor,this.internalRefresh.bind(this))
        billPicker.render({force:true});
    }

    onAddDamage(event,button){
        event.preventDefault();
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        let addDamage = new AddDamage(pawnId);
        addDamage.closeAction = this.internalRefresh.bind(this);
        addDamage.render({force:true});
    }

    async onResurrectPawn(event,button){
        event.preventDefault();
        let pawnId = this.ownerActorSheet.actor.system.thingID;
        await CONFIG.HttpRequest.GMResurrectPawn(pawnId);
        await this.internalRefresh();
    }
}
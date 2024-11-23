import { GenericStatCardSheet } from "../GenericStatCardSheet.js";
import { BillConfigForm } from "../Forms/BillConfigForm.js";

export class BillPartialController{
    ownerActor;
    activityAction;

    static repeatModes = ["Do X times","Do until you have X","Do forever"];

    constructor(actor,activityAction){
        this.ownerActor = actor;
        this.activityAction = activityAction;
    }
    
    _prepareContext(context){
        if(context.workBills.Bills){
            let bills = context.workBills.Bills;
            context.workBills.repeatModes = BillPartialController.repeatModes;
            for(let i = 0; i < bills.length; i++){
                bills[i].curRepeatMode=BillPartialController.repeatModes.indexOf(bills[i].RepeatMode);
            }
        }
        return context;
    }

    render(element){
        
        let infos = element.getElementsByClassName("info-icon");
        if(infos){
            for(let i= 0; i<infos.length;i++){
                infos.item(i).addEventListener("click",this.info.bind(this));
            }
        }
        let deletes = element.getElementsByClassName("delete-icon");
        if(deletes){
            for(let i= 0; i<deletes.length;i++){
                deletes.item(i).addEventListener("click",this.delete.bind(this));
            }
        }
        let upDowns = element.getElementsByClassName("up-down-icon");
        if(upDowns){
            for(let i= 0; i<upDowns.length;i++){
                upDowns.item(i).addEventListener("click",this.verticalChange.bind(this));
            }
        }
        let suspends = element.getElementsByClassName("suspend-icon");
        if(suspends){
            for(let i= 0; i<suspends.length;i++){
                suspends.item(i).addEventListener("click",this.suspendToggle.bind(this));
            }
        }

        let plusMinus = element.getElementsByClassName("plus-minus-icon");
        if(plusMinus){
            for(let i= 0; i<plusMinus.length;i++){
                plusMinus.item(i).addEventListener("click",this.onOffsetAmount.bind(this));
            }
        }
        let repeatModes = element.getElementsByClassName("repeat-mode-input");
        if(repeatModes){
            for(let i= 0; i<repeatModes.length;i++){
                repeatModes.item(i).addEventListener("change",this.onSetRepeatMode.bind(this));
            }
        }
        let details = element.getElementsByClassName("bill-details-button");
        if(details){
            for(let i= 0; i<details.length;i++){
                details.item(i).addEventListener("click",this.onClickDetails.bind(this));
            }
        }

    }

    async onOffsetAmount(event){
        event.preventDefault();
        let billContainer = event.currentTarget.closest(".bill-element-container");
        let offset = parseInt(event.currentTarget.dataset.offset);
        await this.SendMinorConfig(billContainer,{TargetCountOffset: offset});
    }

    async onSetRepeatMode(event){
        event.preventDefault();
        let billContainer = event.currentTarget.closest(".bill-element-container");
        let newRepeatMode = BillPartialController.repeatModes[parseInt(event.currentTarget.value)];
        await this.SendMinorConfig(billContainer,{NewRepeatMode:newRepeatMode});
    }

    async onClickDetails(event){
        event.preventDefault();
        let billContainer = event.currentTarget.closest(".bill-element-container");
        let configMenu = new BillConfigForm(billContainer.dataset.billId,billContainer.dataset.mapId,this.ownerActor.system.thingID);
        configMenu.render({force:true});
    }

    async info(event){
        event.preventDefault();
        let recipeDefName = event.currentTarget.dataset.recipeDef;
        let recipeData =  JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getRecipeStatCard",recipeDefName));
        let statCard = new GenericStatCardSheet(recipeData);
        statCard.render({force:true});
    }

    async delete(event){
        event.preventDefault();
        let billContainer = event.currentTarget.closest(".bill-element-container");
        await this.SendMinorConfig(billContainer,{Delete:true});
    }

    async suspendToggle(event){
        event.preventDefault();
        let billContainer = event.currentTarget.closest(".bill-element-container");
        await this.SendMinorConfig(billContainer,{SuspendToggle:true});
    }

    async verticalChange(event){
        event.preventDefault();
        let billContainer = event.currentTarget.closest(".bill-element-container");
        let down = event.currentTarget.dataset.down;
        if(down === "true"){
            await this.SendMinorConfig(billContainer,{ReorderOffset:1});
        }
        else{
            await this.SendMinorConfig(billContainer,{ReorderOffset:-1});
        }
    }

    async SendMinorConfig(billContainer,minorConfig){
        
        minorConfig.LoadId = billContainer.dataset.billId;
        minorConfig.MapLoadId = billContainer.dataset.mapId;
        minorConfig.PawnId = this.ownerActor.system.thingID;
        console.log(minorConfig);
        await CONFIG.csInterOP.SendHttpRequest("POST","minorBillConfig",JSON.stringify(minorConfig));
        if(this.activityAction){
            this.activityAction();
        }
    }
}
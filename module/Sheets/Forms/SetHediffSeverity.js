const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SetHediffSeverity extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "set-hediff-severity",
        tag: "form",
        window:{
            title: "SetHediffSeverity.form.title",
            resizable:true
        },
        position: {
          width: 150,
          height: 250
        },
        actions:{
            submit:SetHediffSeverity.#onSubmit
        }
    }

    static PARTS = {
        form: {
          id: "set-hediff-severity",
          template: "systems/rimtop/templates/dialogue/set-hediff-severity.hbs"
        }
    }

    get title(){
        return this.titleText;
    }

    titleText = "Set severity";

    pawnId;
    hediffId;
    currentSeverity;

    healMode = false;

    closeAction;

    constructor(pawnId, hediffId, currentSeverity,healMode = false){
        super();
        this.pawnId = pawnId;
        this.hediffId = hediffId;
        this.currentSeverity = currentSeverity;
        this.healMode = healMode;
    }

    _prepareContext(options){
        let context ={
            healMode:this.healMode,
            currentSeverity:this.currentSeverity
        }
        console.log(context);
        return context;
    }

    _onRender(context,options){

    }

    static async #onSubmit(event,button){
        event.preventDefault();
        let input = this.element.querySelector("[id=serverity-input]");
        console.log(input);
        if(input){
            let newSeverity = parseFloat(input.value);
            if(!isNaN(newSeverity)){

                if(newSeverity < 0){
                    newSeverity = 0;
                }
                if(this.healMode){
                    if(newSeverity > this.currentSeverity){
                        newSeverity = this.currentSeverity
                    }
                    CONFIG.HttpRequest.HealHediff(this.pawnId,this.hediffId,newSeverity);
                }
                else{
                    newSeverity += this.currentSeverity
                    CONFIG.HttpRequest.HarmHediff(this.pawnId,this.hediffId,newSeverity);
                }
                if(this.closeAction){
                    this.closeAction();
                }
            }
        }

        this.close();
    }
}
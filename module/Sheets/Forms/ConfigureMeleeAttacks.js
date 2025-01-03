
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ConfigureMeleeAttacks extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "configure-melee-verbs",
        tag: "form",
        window:{
            title: "ConfigureMeleeAttacks.form.title",
            resizable:true
        },
        position: {
          width: 400,
          height: 450
        },
        actions:{
            submit:ConfigureMeleeAttacks.#Submit
        }
    }

    static PARTS = {
        form: {
          id: "configure-melee-verbs",
          template: "systems/rimtop/templates/dialogue/configure-melee-verbs.hbs"
        }
    }

    get title(){
        return "Configure melee attacks";
    }

    pawnId;
    closeAction;

    verbOptions = {};

    constructor(pawnId){
        super();
        this.pawnId = pawnId;
    }

    async _prepareContext(options){
        let context = this.verbOptions = JSON.parse(await CONFIG.HttpRequest.GetMeleeAttackMode(this.pawnId));

        console.log(context);
        return context;
    }
    
    static async #Submit(event,button)
    {
        event.preventDefault();
        this.verbOptions.Natural =  this.element.querySelector("[id=natural-verbs]").checked;
        this.verbOptions.Equipment =  this.element.querySelector("[id=equipment-verbs]").checked;
        this.verbOptions.Apparel =  this.element.querySelector("[id=apparel-verbs]").checked;
        this.verbOptions.Hediff = this.element.querySelector("[id=hediff-verbs]").checked;

        await CONFIG.HttpRequest.SetMeleeAttackMode(this.pawnId,JSON.stringify(this.verbOptions));
        
        if(this.closeAction){
            this.closeAction();
        }
        this.close();
    }
}
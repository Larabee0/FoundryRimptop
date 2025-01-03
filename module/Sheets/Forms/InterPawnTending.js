
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class InterPawnTending extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "inter-pawn-tending",
        tag: "form",
        window:{
            title: "InterPawnTending.form.title",
            resizable:true
        },
        position: {
          width: 400,
          height: 450
        },
        actions:{
            
        }
    }

    static PARTS = {
        form: {
          id: "inter-pawn-tending",
          template: "systems/rimtop/templates/dialogue/inter-pawn-tending.hbs"
        }
    }

    get title(){
        return "Configure inter-pawn tending";
    }

    static targetActor;
    targetPawnsBeingTended=[];

    allowedPawns={};

    async _prepareContext(options){

        let context={};
        if(Object.keys(this.allowedPawns).length === 0){
            this.allowedPawns = this.getAllAllowedPawns();
        }
        

        if(this.targetPawnsBeingTended.length === 0){
            let rawTending =  JSON.parse(await CONFIG.HttpRequest.GetInterPawnTending(InterPawnTending.targetActor.system.thingID));
            for(let i = 0; i < rawTending.length; i++){
                if((rawTending[i] in this.allowedPawns)){
                    this.targetPawnsBeingTended.push(rawTending[i]);
                    this.allowedPawns[rawTending[i]].tending = true;
                }
            }
        }
        
        context.tendablePawns = this.allowedPawns;

        console.log(context);
        return context;
    }

    _onRender(context,options){

        let tenablePawns = this.element.getElementsByClassName("tendable-pawn");
        if(tenablePawns){
            for(let i = 0; i <tenablePawns.length; i++){
                tenablePawns.item(i).addEventListener("change",this.onTendingChanged.bind(this));
            }
        }
    }

    async _preClose(){

        let tendingPawns = [];
        let keys = Object.keys(this.allowedPawns);
        for(let i = 0; i < keys.length; i++){
            if(this.allowedPawns[keys[i]].tending){
                tendingPawns.push(keys[i]);
            }
        }

        console.log(tendingPawns);
        await CONFIG.HttpRequest.SetInterPawnTending(InterPawnTending.targetActor.system.thingID,JSON.stringify(tendingPawns));

        return super._preClose();
    }

    onTendingChanged(event){
        event.preventDefault();
        let id = event.currentTarget.dataset.actorId;
        this.allowedPawns[id].tending = event.currentTarget.checked;
        this.render();
    }

    getAllAllowedPawns(){
        let allPawns ={};
        for (let i = 0; i < game.actors.apps.length; i++){
            for(let j = 0; j < game.actors.apps[i].documents.length; j++){
                let actor = game.actors.apps[i].documents[j];
                //console.log(CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED);
                let hasPermission = actor.testUserPermission(game.user,CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED);
                //console.log(hasPermission);
                if(hasPermission && actor.type ==="pawn"){
                    if(actor.system.thingID !== "uncreatedThing" && actor !==InterPawnTending.targetActor){
                        allPawns[actor.system.thingID] = {Name:actor.name,Id:actor.system.thingID};
                    }
                }
            }
        }
        return allPawns;
    }
}
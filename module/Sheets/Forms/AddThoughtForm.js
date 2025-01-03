const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AddThoughtForm extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "add-thought-form",
        window:{
            title: "AddThoughtForm.form.title",
            resizable:true
        },
        position: {
          width: 400,
          height: 450
        },
        actions:{
            submit:AddThoughtForm.#submit,
            submitPreMade:AddThoughtForm.#submitPreMade
        }
    }

    static PARTS = {
        tabs:{
            template:"systems/rimtop/templates/generic/tab-navigation.hbs"
        },
        customThought: {
          id: "add-thought-form",
          template: "systems/rimtop/templates/dialogue/add-thought-form.hbs"
        },
        premadeThoughts:{
            id: "add-existing-thought",
            template:"systems/rimtop/templates/dialogue/add-existing-thought-form.hbs"
        }
    }
    tabGroups = {
        sheet: "premadeThoughts"
    }

    get title(){
        return "Create a new custom thought or add an existing one";
    }

    pawnId;
    selectedOtherPawn = 0;

    selectedThought;
    selectedStage;
    selectedDuration;

    closeAction;
    scrollTop = 0;
    scrollLeft = 0;

    static cachedThoughts={};

    constructor(pawnId){
        super();
        this.pawnId = pawnId;
    }

    #getTabs() {
        const tabs = {
            customThought: {id: "customThought", group: "sheet", label:"Custom thought", tooltip: "Create a custom thought"},
            premadeThoughts: {id: "premadeThoughts", group: "sheet", label: "Pre-made thoughts", tooltip: "Pick from pre-made thoughts"}
        };
        for ( const v of Object.values(tabs) ) {
          v.active = this.tabGroups[v.group] === v.id;
          v.cssClass = v.active ? "active" : "";
        }
        return tabs;
    }

    async _prepareContext(options){

        if(Object.keys(AddThoughtForm.cachedThoughts).length === 0){
            AddThoughtForm.cachedThoughts = JSON.parse(await CONFIG.HttpRequest.GetAllThoughts());
        }

        let context={
            tabs: this.#getTabs(),
            otherPawns: this.getAllPawns(),
            selectedPawn: this.selectedOtherPawn,
            selectedMultiplier: this.selectedStatMulitplier,
            thoughts: AddThoughtForm.cachedThoughts
        };

        if(this.tabGroups.sheet==="premadeThoughts"){
            if(this.selectedThought && !isNaN(this.selectedStage)){
                this.selectedDuration = String(AddThoughtForm.cachedThoughts[this.selectedThought].Duration);
            }
            context.selectedDuration = this.selectedDuration;
            context.selectedThought = this.selectedThought;
            context.selectedStage = this.selectedStage;
        }

        //console.log(context);
        return context;
    }
    
    _onRender(context,options){
        let scrollContainer = this.element.querySelector("[id=existing_thoughts_list]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }
        let thoughtLabels = this.element.getElementsByClassName("thought-label");
        if(thoughtLabels){
            for(let i = 0; i < thoughtLabels.length; i++){
                thoughtLabels.item(i).addEventListener("click",this.selectThought.bind(this));
            }
        }
    }

    getAllPawns(){
        let allPawns =["None"];
        for (let i = 0; i < game.actors.apps.length; i++){
            for(let j = 0; j < game.actors.apps[i].documents.length; j++){
                let actorType = game.actors.apps[i].documents[j].type;
                if(actorType ==="pawn"){
                    let actor = game.actors.apps[i].documents[j];
                    if(actor.system.thingID !== "uncreatedThing" && actor.system.thingID !==this.pawnId){
                        allPawns.push(actor.name);
                    }
                }
            }
        }
        return allPawns;
    }

    getAllPawnsId(){
        let allPawns =[];
        for (let i = 0; i < game.actors.apps.length; i++){
            for(let j = 0; j < game.actors.apps[i].documents.length; j++){
                let actorType = game.actors.apps[i].documents[j].type;
                if(actorType ==="pawn"){
                    let actor = game.actors.apps[i].documents[j];
                    if(actor.system.thingID !== "uncreatedThing" && actor.system.thingID !==this.pawnId){
                        allPawns.push(actor.system.thingID);
                    }
                }
            }
        }
        return allPawns;
    }

    static async #submit(event,button){
        let labelElement = this.element.querySelector("[name=label-input]");
        let descElement = this.element.querySelector("[name=desc-input]");
        let moodValue = parseFloat(this.element.querySelector("[name=mood-input]").value);
        let durationValue = parseFloat(this.element.querySelector("[name=duration-input]").value);
        let otherPawnElement = this.element.querySelector("[name=other-pawn]");
        if(!labelElement.value || !descElement.value|| isNaN(moodValue)|| isNaN(durationValue)){
            return;
        }
        if(!labelElement.value.isSafe() || !descElement.value.isSafe){
            return;
        }
        let customThoughtRequest = {
            PawnId: this.pawnId,
            Label:labelElement.value,
            Desc:descElement.value,
            Mood: moodValue.scientificToDecimal(),
            Duration:durationValue.scientificToDecimal()
        };

        if(otherPawnElement && otherPawnElement.value != 0){
            let index = otherPawnElement.value - 1;
            customThoughtRequest.OtherPawn = this.getAllPawnsId()[index];
        }

        await CONFIG.HttpRequest.AddCustomThought(JSON.stringify(customThoughtRequest));

        if(this.closeAction){
            this.closeAction();
        }

        this.close();
    }

    selectThought(event){
        event.preventDefault();
        this.selectedThought=event.currentTarget.dataset.def;
        this.selectedStage = parseInt(event.currentTarget.dataset.stage);
        let scrollContainer = this.element.querySelector("[id=existing_thoughts_list]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;
        this.render();
    }

    static async #submitPreMade(event,button){
        let otherPawnElement = this.element.querySelector("[name=other-pawn-b]");
        let durationValue = parseFloat(this.element.querySelector("[name=duration-input-b]").value);
        //console.log(this.element.querySelector("[name=duration-input-b]").value);
        //console.log(otherPawnElement, otherPawnElement.value ===0, isNaN(durationValue));
        if(otherPawnElement && otherPawnElement.value === 0 || isNaN(durationValue)){
            this.render();
            return;
        }
        
        let thoughtRequest ={
            PawnId: this.pawnId,
            DefName: this.selectedThought,
            Stage: this.selectedStage,
        }

        if(otherPawnElement && otherPawnElement.value != 0){
            let index = otherPawnElement.value - 1;
            thoughtRequest.OtherPawn = this.getAllPawnsId()[index];
        }

        await CONFIG.HttpRequest.AddThought(JSON.stringify(thoughtRequest));

        if(this.closeAction){
            this.closeAction();
        }

        this.close();
    }
}
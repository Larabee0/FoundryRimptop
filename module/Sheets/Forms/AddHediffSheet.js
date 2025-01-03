const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AddHediffSheet extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "add-hediff-sheet",
        tag: "form",
        window:{
            title: "AddHediffSheet.form.title",
            resizable:true
        },
        position: {
          width: 150,
          height: 250
        },
        actions:{
            backToDefPick:AddHediffSheet.#onBackToHediffDefPick
        }
    }

    static PARTS = {
        form: {
          id: "add-hediff-sheet",
          template: "systems/rimtop/templates/dialogue/add-hediff-sheet.hbs"
        }
    }

    get title(){
        return "Add new health modifier";
    }

    static cachedHediffs = {};
    
    targetableParts = {};

    pawnId;
    closeAction;

    selectedCategory = "Hediff";
    selectedHediffDef;

    scrollTop = 0;
    scrollLeft = 0;

    constructor(pawnId){
        super();
        this.pawnId = pawnId;
    }

    async _prepareContext(options){

        if(Object.keys(AddHediffSheet.cachedHediffs).length ===0){
            AddHediffSheet.cachedHediffs =  JSON.parse( await CONFIG.HttpRequest.GetAllHediffs());
        }

        let context ={
            hediffs:AddHediffSheet.cachedHediffs,
            activeCategory:this.selectedCategory,
        }
        if(Object.keys(this.targetableParts).length > 0){
            
            context.targetableParts=this.targetableParts;
        }
        //console.log(context);
        return context;
    }

    _onRender(context,options){
        let scrollContainer = this.element.querySelector("[class=hediff-list]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }

        let foldoutMain = this.element.getElementsByClassName("hediff-category-container");
        if(foldoutMain){
            for(let i= 0; i<foldoutMain.length;i++){
                foldoutMain.item(i).addEventListener("click",this.categorySelect.bind(this));
            }
        }

        let hediffDefLabel = this.element.getElementsByClassName("hediff-label");
        if(hediffDefLabel){
            for(let i= 0; i<hediffDefLabel.length;i++){
                hediffDefLabel.item(i).addEventListener("click",this.hediffSelect.bind(this));
            }
        }

        let partLabels = this.element.getElementsByClassName("body-part-label");
        if(partLabels){
            for(let i= 0; i<partLabels.length;i++){
                partLabels.item(i).addEventListener("click",this.addHediff.bind(this));
            }
        }
    }

    categorySelect(event){
        event.preventDefault();
        let newItem = event.currentTarget.dataset.hediffCategory;
        if(this.selectedCategory === newItem){
            this.selectedCategory = "";
        }
        else{
            this.selectedCategory = newItem;
        }
        let scrollContainer = this.element.querySelector("[class=hediff-list]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;
        this.render();
    }

    async hediffSelect(event){
        event.preventDefault();
        this.selectedHediffDef = event.currentTarget.dataset.hediffDef;

        this.targetableParts = JSON.parse(await CONFIG.HttpRequest.GetPartsForHediff(this.pawnId,this.selectedHediffDef));

        this.scrollTop = 0;
        this.scrollLeft = 0;
        this.render();
    }

    async addHediff(event){

        let partIndex = event.currentTarget.dataset.index;
        await CONFIG.HttpRequest.AddHediff(this.pawnId,this.selectedHediffDef,partIndex);
        if(this.closeAction){
            this.closeAction();
        }
        this.close();
    }

    static #onBackToHediffDefPick(event,button){
        this.targetableParts={};
        this.render();
    }
}
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;


export class TraitPicker extends HandlebarsApplicationMixin(ApplicationV2){
    
    static DEFAULT_OPTIONS = {
        id: "trait-picker",
        tag: "form",
        window:{
            icon: "fas fa-book",
            title: "TraitPicker.form.title",
            resizable:true
        },
        position: {
          width: 750,
          height: 550
        },
        actions:{
            // triggers the rerender of the window when the user selects a thing
            selectTrait:TraitPicker.#onSelectTrait,
            submit:TraitPicker.#onSubmit
        }
    }

    static PARTS = {
        form: {
          id: "pickBackstory",
          template: "systems/rimtop/templates/dialogue/trait-picker.hbs"
        }
    }
    
    scrollTop = 0;
    scrollLeft = 0;
    searchValue;

    static ownerSheet;
    static targetActor;

    static traitRefresh;
    static traitCache ={};

    static selectedTrait;
    static selectedDegree;

    get title(){
        return "Pick a trait";
    }

    constructor(actor){
        super();
        if(!actor){
            return;
        }
        
        if(Object.keys(TraitPicker.traitCache).length === 0 || TraitPicker.targetActor!==actor){
            TraitPicker.traitRefresh = true;
        }
        TraitPicker.targetActor = actor;
    }


    async _prepareContext(options){
        if(TraitPicker.traitRefresh){
            await TraitPicker.updateTraitCache(TraitPicker.targetActor);
            TraitPicker.traitRefresh = false;
        }

        let actorTraits =  TraitPicker.targetActor.system.bio.Traits;
        let actorSkills =  TraitPicker.targetActor.system.bio.Skills;
        //console.log(actorSkills);
        let traitKeys = Object.keys(TraitPicker.traitCache);

        for(let i = 0; i< traitKeys.length; i++){
            let traitInternal = TraitPicker.traitCache[traitKeys[i]];
            if(traitInternal.ConSkillPass){
                let conflict = false;
                for(let j = 0; j < traitInternal.ConSkillPass.length; j++){
                    let skillName = traitInternal.ConSkillPass[j];
                    if(skillName){
                        let conflictingPassion = actorSkills.find((element)=>element.DefName===skillName && element.Passion!=="None");
                        if(conflictingPassion){
                            conflict =  true;
                        }
                    }
                }
                traitInternal.disallowed = conflict;
            }
            else{
                traitInternal.disallowed = false;

            }
            traitInternal.hide=false;
            TraitPicker.traitCache[traitKeys[i]] = traitInternal;
        }

        for(let i = 0; i < actorTraits.length; i++){
            let defName = actorTraits[i].DefName;
            if(!defName){
                continue;
            }
            let traitInternal = TraitPicker.traitCache[defName];
            traitInternal.hide=true;
            if(traitInternal.Con){
                for(let j = 0; j < traitInternal.Con.length; j++){
                    let trait = TraitPicker.traitCache[traitInternal.Con[j]];
                    if(trait && "disallowed" in trait){
                        trait.disallowed = true;
                    }
                    
                }
            }
            TraitPicker.traitCache[traitKeys[i]] = traitInternal;
        }

        if(TraitPicker.selectedTrait){
            if(TraitPicker.traitCache[TraitPicker.selectedTrait].disallowed){
                TraitPicker.selectedTrait = null;
                TraitPicker.selectedDegree = null;
            }
        }

        let context = {
            traits:TraitPicker.traitCache,
            selectedTrait: TraitPicker.selectedTrait,
            selectedDegree: TraitPicker.selectedDegree
        };

        //console.log(context);
        return context;
    }

    static async updateTraitCache(actor){

        TraitPicker.traitCache = JSON.parse(await(CONFIG.HttpRequest.GetAllTraitsForPawn(actor.system.thingID)));
        TraitPicker.targetActor = actor;
    }

    _onRender(context,options){
        let scrollContainer = this.element.querySelector("[class=trait-list]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }

        this.element.querySelector("input[name=filter_field]").addEventListener("keyup",this.filterFn.bind(this));
        if(typeof this.searchValue != "undefined"){
            this.element.querySelector("input[name=filter_field]").value = this.searchValue;
            this.filterFn(); // call filterFn to actually filter the elements.
        }
    }

    static #onSelectTrait(event,button){
        event.preventDefault();
        let traitDef = button.dataset.def;
        let traitDegree = parseInt(button.dataset.degree);
        if(traitDef && !isNaN(traitDegree)){
            TraitPicker.selectedTrait = traitDef;
            TraitPicker.selectedDegree = traitDegree;
            //console.log(traitDef,traitDegree);
            this.setScrollPos();
            this.render();
        }
    }

    static async #onSubmit(event,button){
        event.preventDefault();

        //console.log(TraitPicker.selectedTrait);
        //console.log(TraitPicker.selectedDegree);
        if(TraitPicker.selectedTrait && !isNaN(TraitPicker.selectedDegree)){
            let actorTraits = structuredClone( TraitPicker.targetActor.system.bio.Traits);
            
            actorTraits.push({
                DefName: TraitPicker.selectedTrait,
                Degree: TraitPicker.selectedDegree
            });
            //console.log(actorTraits);
            await TraitPicker.ownerSheet.updateTraits(actorTraits);
            await TraitPicker.ownerSheet.recacheSkills();
            await TraitPicker.ownerSheet.recacheEdit();
            this.close();
        }
    }

    setScrollPos(){
        let scrollContainer = this.element.querySelector("[class=trait-list]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;
    }

    filterFn(event) {
        const input = document.getElementById("filter_field"); // get search input
        this.searchValue = input.value; // cache search value for when render() is called.
        const filter = input.value.toLowerCase(); // set search value to lower case for string comparison.
        const table = document.getElementById("list-table"); // get element table
        let tr = table.getElementsByTagName("tr"); // get all rows in table
    
        // Loop through all table rows, and hide those who don't match the search query
        for (let i = 0; i < tr.length; i++) {
            const td = tr[i].getElementsByTagName("td")[0]; // column to search
            if (td) {
                const txtValue = td.textContent || td.innerText;
                if (txtValue.toLowerCase().indexOf(filter) > -1) {
                    tr[i].style.display = "";
                } else {
                    tr[i].style.display = "none";
                }
            }
        }
    }
}
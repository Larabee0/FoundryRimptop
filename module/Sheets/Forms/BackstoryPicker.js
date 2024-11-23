import { TraitPicker } from "./TraitPicker.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;


export class BackstoryPicker extends HandlebarsApplicationMixin(ApplicationV2){
    
    static DEFAULT_OPTIONS = {
        id: "backstory-picker",
        tag: "form",
        window:{
            icon: "fas fa-book",
            title: "BackstoryPicker.form.title",
            resizable:true
        },
        position: {
          width: 750,
          height: 550
        },
        actions:{
            // triggers the rerender of the window when the user selects a thing
            selectBackstory:BackstoryPicker.#onSelectBackstory,
            submit:BackstoryPicker.#onSubmit
        }
    }

    static PARTS = {
        form: {
          id: "pickBackstory",
          template: "systems/rimtop/templates/dialogue/backstory-picker.hbs"
        }
    }

    static backstoryCache={};
    static targetActor;
    static backstorySlot;

    static currentBackstory;
    static backstoryRefresh = false;

    scrollTop = 0;
    scrollLeft = 0;
    searchValue;

    static ownerSheet;

    get title(){
        return "Pick " + String(BackstoryPicker.backstorySlot).toLowerCase()+" backstory";
    }

    constructor(actor,slot,currentBackstory){
        super();
        //console.log(actor);
        //console.log(slot);
        //console.log(currentBackstory);
        if(Object.keys(BackstoryPicker.backstoryCache).length === 0
        ||BackstoryPicker.targetActor!==actor
        ||BackstoryPicker.backstorySlot!==slot
        ||BackstoryPicker.currentBackstory!==currentBackstory){
            BackstoryPicker.backstoryRefresh = true;
        }
        BackstoryPicker.targetActor = actor;
        BackstoryPicker.backstorySlot = slot; 
        BackstoryPicker.currentBackstory = currentBackstory;
    }

    async GetAllBackstoriesFor(backstoryRequest){
        return await CONFIG.csInterOP.SendHttpRequest("GET","getBackstories",backstoryRequest);
    }


    async _prepareContext(options){
        if(BackstoryPicker.backstoryRefresh){
            BackstoryPicker.backstoryCache = JSON.parse(await(this.GetAllBackstoriesFor(JSON.stringify({PawnId:BackstoryPicker.targetActor.system.thingID,Backstory:BackstoryPicker.backstorySlot}))));
            BackstoryPicker.backstoryRefresh = false;
        }

        if(BackstoryPicker.backstoryCache[BackstoryPicker.currentBackstory]){
            BackstoryPicker.backstoryCache[BackstoryPicker.currentBackstory].checked=true;
        }

        let context = {
            backstories: BackstoryPicker.backstoryCache,
            selected: BackstoryPicker.backstoryCache[BackstoryPicker.currentBackstory]
        };

        if(context.selected.FTraits){

            if(Object.keys(TraitPicker.traitCache).length === 0||TraitPicker.targetActor!==BackstoryPicker.targetActor){
                await TraitPicker.updateTraitCache(BackstoryPicker.targetActor)
            }
            let traitData=[];
            for(let i = 0; i < context.selected.FTraits.length; i++){
                let traitDef = context.selected.FTraits[i];
                let traitDeg = context.selected.FTraitDeg[i];
                
                let selectedTrait = TraitPicker.traitCache[traitDef].DegreeDatas[traitDeg];
                let trait={
                    Name: selectedTrait.Name,
                    Desc: selectedTrait.Desc
                }

                traitData.push(trait);

            }

            context.selected.forcedTraitData = traitData;
        }

        
        if(context.selected.DisTraits){

            if(Object.keys(TraitPicker.traitCache).length === 0||TraitPicker.targetActor!==BackstoryPicker.targetActor){
                await TraitPicker.updateTraitCache(BackstoryPicker.targetActor)
            }
            let traitData=[];
            for(let i = 0; i < context.selected.DisTraits.length; i++){
                let traitDef = context.selected.DisTraits[i];
                let traitDeg = context.selected.DisTraitsDeg[i];
                
                let selectedTrait = TraitPicker.traitCache[traitDef].DegreeDatas[traitDeg];
                let trait={
                    Name: selectedTrait.Name,
                    Desc: selectedTrait.Desc
                }

                traitData.push(trait);

            }

            context.selected.disallowedTraitData = traitData;
        }

        //console.log(context);

        return context;
    }

    _onRender(context,options){

        let scrollContainer = this.element.querySelector("[class=backstory-list]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }

        this.element.querySelector("input[name=backstroy_filter_field]").addEventListener("keyup",this.filterFn.bind(this));
        if(typeof this.searchValue != "undefined"){
            this.element.querySelector("input[name=backstroy_filter_field]").value = this.searchValue;
            this.filterFn(); // call filterFn to actually filter the elements.
        }
    }

    static #onSelectBackstory(event,button){
        event.preventDefault();
        BackstoryPicker.backstoryCache[BackstoryPicker.currentBackstory].checked=false;
        BackstoryPicker.currentBackstory = button.dataset.def;
        BackstoryPicker.backstoryCache[BackstoryPicker.currentBackstory].checked=true;
        this.setScrollPos();
        this.render();
    }

    static async #onSubmit(event,button){
        event.preventDefault();


        await BackstoryPicker.ownerSheet.updateBackstory(BackstoryPicker.currentBackstory,BackstoryPicker.backstorySlot);
        await BackstoryPicker.ownerSheet.recacheSkills();
        await BackstoryPicker.ownerSheet.recacheEdit();
        this.close();

    }

    setScrollPos(){
        let scrollContainer = this.element.querySelector("[class=backstory-list]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;
    }

    filterFn(event) {
        const input = this.element.querySelector("input[name=backstroy_filter_field]"); // get search input
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
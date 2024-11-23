const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class MedicalBillPicker extends HandlebarsApplicationMixin(ApplicationV2){
    
    static DEFAULT_OPTIONS = {
        id: "medical-bill-picker",
        tag: "form",
        window:{
            icon: "fas fa-book",
            title: "MedicalBillPicker.form.title",
            resizable:true
        },
        position: {
          width: 400,
          height: 550
        },
        actions:{
            // triggers the rerender of the window when the user selects a thing
            selectBill:MedicalBillPicker.#onSelectBill,
            submit:MedicalBillPicker.#onSubmit
        }
    }

    static PARTS = {
        form: {
          id: "medical-bill-picker",
          template: "systems/rimtop/templates/dialogue/medical-bill-picker.hbs"
        }
    }

    get title(){
        return "Medical bills";
    }

    scrollTop = 0;
    scrollLeft = 0;
    searchValue;

    static targetActor;
    static recipeCache ={};

    static selectedRecipe;

    closeAction

    constructor(actor,closeAction){
        super();
        if(!actor){
            return;
        }
        
        MedicalBillPicker.targetActor = actor;
        MedicalBillPicker.recipeCache ={};
        MedicalBillPicker.selectedRecipe =null  ;
        this.closeAction = closeAction
    }

    async _prepareContext(options){
        if(Object.keys(MedicalBillPicker.recipeCache).length === 0){
            this.recipeCache = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","medOpRecipiesFor",MedicalBillPicker.targetActor.system.thingID));
        }
        let context= {
            recipes:this.recipeCache,
            selectedRecipe:MedicalBillPicker.selectedRecipe
        };
        console.log(context);
        return context;
    }
    
    _onRender(context,options){
    }

    static #onSelectBill(event,button){
        event.preventDefault();
        MedicalBillPicker.selectedRecipe=button.dataset.index
        this.render();
    }

    static #onSubmit(event,button){
        event.preventDefault();
        console.log(this.recipeCache);
        let recipe = this.recipeCache.Options[parseInt(MedicalBillPicker.selectedRecipe)];
        let thingForMedBills =recipe.ThingForMedBills;
        let defName = recipe.RecipeDefName;
        let bodypartIndex = recipe.BodyPart;
        console.log(thingForMedBills,defName,bodypartIndex);

        CONFIG.csInterOP.SendHttpRequest("POST","addOperationBill",thingForMedBills,defName,bodypartIndex);
        this.closeAction();
        this.close();
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
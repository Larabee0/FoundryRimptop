import { BillPartialController } from "../PartialControllers/BillPartialController.js";

export class WorkBillsController{
    ownerSheet;
    static actor;

    static cachedWorkBills = {};
    static cachedRecipes = {};
    billsController;
    showAddBill = false;
    searchValue;

    
    scrollTop = 0;
    scrollLeft = 0;

    constructor(actor,ownerSheet){
        WorkBillsController.actor = actor;
        WorkBillsController.cachedWorkBills = {};
        this.ownerSheet = ownerSheet;
        this.billsController = new BillPartialController(actor,this.internalRefreshWithBills.bind(this));
    }


    async _prepareContext(context){
        if(Object.keys(WorkBillsController.cachedWorkBills).length === 0){
            WorkBillsController.cachedWorkBills = JSON.parse(await CONFIG.HttpRequest.GetWorkBillsForPawn(WorkBillsController.actor.system.thingID));
        }
        context.workBills = WorkBillsController.cachedWorkBills;
        context.showBills = !this.showAddBill;
        if(this.showAddBill){
            if(Object.keys(WorkBillsController.cachedRecipes).length === 0){
                WorkBillsController.cachedRecipes = JSON.parse(await CONFIG.HttpRequest.GetAllRecipieUserDefData());
                let categoryKeys = Object.keys(WorkBillsController.cachedRecipes.Categories);
                for(let i = 0; i < categoryKeys.length; i++){
                    WorkBillsController.cachedRecipes.Categories[categoryKeys[i]].On = true;
                }
                let recipeKeys = Object.keys(WorkBillsController.cachedRecipes.Recipies);
                for(let i = 0; i < recipeKeys.length; i++){
                    WorkBillsController.cachedRecipes.Recipies[recipeKeys[i]].On = true;
                }
            }
            
            context.cachedRecipes = WorkBillsController.cachedRecipes;
        }
        return this.billsController._prepareContext(context);
    }

    _onRender(context,options){
        let element = this.ownerSheet.element.querySelector("[id=work-bills-container]");
        if(!element) {
            console.error("work bills container could not find root element!");
            return;
        }

        let scrollContainer = element.querySelector("[id=sub-scroll-container]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }

        if(this.showAddBill){
            element.querySelector("input[name=filter_field]").addEventListener("keyup",this.filterFn.bind(this));
            if(this.searchValue){
                element.querySelector("input[name=filter_field]").value = this.searchValue;
                this.filterFn(); // call filterFn to actually filter the elements.
            }
            let categoryFilters = element.getElementsByClassName("category-toggle");
            if(categoryFilters){
                for(let i = 0; i < categoryFilters.length; i++){
                    categoryFilters.item(i).addEventListener("change",this.onToggleCategory.bind(this));
                }
            }
            let recipies = element.getElementsByClassName("recipe-item");
            if(recipies){
                for(let i = 0; i < recipies.length; i++){
                    recipies.item(i).addEventListener("click",this.onClickRecipie.bind(this));
                }
            }
        }


        this.billsController.render(element);
        let addBillButton= element.querySelector("[id=add-bill-button]");
        if(addBillButton){
            addBillButton.addEventListener("click",this.onAddBillButton.bind(this));
        }
        let backAddBillButton= element.querySelector("[id=back-from-add-button]");
        if(backAddBillButton){
            backAddBillButton.addEventListener("click",this.onBackAddBillButton.bind(this));
        }
    }

    onAddBillButton(event){
        event.preventDefault();
        this.showAddBill = true;
        this.internalRefresh();
    }

    onBackAddBillButton(event){
        event.preventDefault();
        this.showAddBill = false;
        this.internalRefresh();
    }

    onToggleCategory(event){
        event.preventDefault();
        let categoryDefName = event.currentTarget.dataset.def

        let enable = event.currentTarget.checked;
        WorkBillsController.cachedRecipes.Categories[categoryDefName].On =enable;

        let recipeKeys = Object.keys(WorkBillsController.cachedRecipes.Recipies);

        for(let i = 0; i < recipeKeys.length; i++){
            let element = WorkBillsController.cachedRecipes.Recipies[recipeKeys[i]];
            if(element.BelongsTo.length === 1 && element.BelongsTo[0] === categoryDefName){
                element.On = enable;
            }
            else if(element.BelongsTo.length > 1){
                let anyCategoryEnabled = false;
                for(let j = 0; j < element.BelongsTo.length; j++){
                    if(WorkBillsController.cachedRecipes.Categories[element.BelongsTo[j]].On){
                        anyCategoryEnabled = true;
                        break;
                    }
                }
                if(!anyCategoryEnabled){
                    element.On = enable;
                }
                else{
                    element.On = true;
                }
            }
        }


        let scrollContainer = this.ownerSheet.element.querySelector("[id=sub-scroll-container]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;

        this.internalRefresh();
    }

    async onClickRecipie(event){
        event.preventDefault();
        let recipeDef = event.currentTarget.dataset.def;
        let bench = WorkBillsController.cachedRecipes.Recipies[recipeDef].BelongsTo[Math.floor(Math.random() * WorkBillsController.cachedRecipes.Recipies[recipeDef].BelongsTo.length)];
        await CONFIG.HttpRequest.AddNewRecipe(WorkBillsController.actor.system.thingID,recipeDef,bench);
        this.showAddBill = false;
        this.internalRefreshWithBills();
    }
    internalRefreshWithBills(){
        WorkBillsController.cachedWorkBills = {};
        this.internalRefresh();
    }
    internalRefresh(){
        this.ownerSheet.render();
    }

    filterFn(event) {
        let scrollContainer = this.ownerSheet.element.querySelector("[id=sub-scroll-container]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;

        const input = this.ownerSheet.element.querySelector("[id=filter_field]"); // get search input
        this.searchValue = input.value; // cache search value for when render() is called.
        const filter = input.value.toLowerCase(); // set search value to lower case for string comparison.
        const table = this.ownerSheet.element.querySelector("[id=sub-scroll-container]"); // get element table
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
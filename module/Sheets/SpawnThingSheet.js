const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// extending from HandlebarsApplicationMixin(ApplicationV2) to create a generic application v2 window.
export class SpawnThingSheet extends HandlebarsApplicationMixin(ApplicationV2) {
    
    static dataJson = {};

    giveToActor;

    createActor;

    onSpawnAction;

    selectThingDef;
    searchValue;

    lastQualitySelect = "Normal";
    lastStuffSelect;

    
    scrollTop = 0;
    scrollLeft = 0;

    static DEFAULT_OPTIONS = {
        id: "spawn-thing",
        tag: "form",
        form: {
          handler: SpawnThingSheet.#onSubmit,
          submitOnChange: false,
          closeOnSubmit: true
        },
        window:{
            icon: "fas fa-gear",
            title: "SpawnThingSheet.form.title"
        },
        actions:{
            // triggers the rerender of the window when the user selects a thing
            
            selectThing:SpawnThingSheet.#onSelectThing,
            spawnThing:SpawnThingSheet.#onSpawnThing
        }
    }

    // set the handle bars template to be rendered
    static PARTS = {
        form: {
          id: "spawnThings",
          template: "systems/rimtop/templates/dialogue/spawn-thing.hbs"
        }
    }

    // some how this links to the window title thing above, its just the window name.
    get title(){
        return "Spawn thing"
    }


    // main logical block, prepares the date for hbs to render.
    async _prepareContext(options){
        let actorContext = this.giveToActor?.system;
        console.log(actorContext);
        // cache the data from rimworld if we lack it.
        if(Object.keys(SpawnThingSheet.dataJson).length === 0 ){
            let res = await CONFIG.csInterOP.GetAllThingDefs();
            SpawnThingSheet.dataJson = JSON.parse(res);
        }
        
        
        // generate quality dictionary for the quality drop down.
        // this is constant, even if no thing is seleted or a selected thing has no quality.
        // this is just for simplicity.
        let qualities = {};
        for (let i = 0; i < SpawnThingSheet.dataJson.Qualties.length; i++) {
            qualities[SpawnThingSheet.dataJson.Qualties[i]] = SpawnThingSheet.dataJson.Qualties[i];
        }

        // default context
        let context = { thingDefs: SpawnThingSheet.dataJson.ThingDefs,
            qualities:qualities,
            selectedQuality:"Normal",
            selectedThingDef:"Nothing",
            selectThingValue: "-",
            spawnPossible:false,
            spawnButtonText:"Spawn",
            defaultPawnInventory:this.giveToActor? true: false,
            defaultGlobalInventory:this.giveToActor? false: true
        };

        if(this.createActor){
            context.disableSpawnOptions = true;            
            context.spawnButtonText="Create";
        }
        
        let actorType = this.giveToActor?.type;
        if(actorType === "thing"){
            context.allowSpawnToActor = false;
            if(actorContext?.spawned){
                context.allowWorldSpawn = true;
            }
        }
        else if(actorType && (actorType === "pawn")){
            context.allowSpawnToActor = true;
            if(actorContext?.spawned){
                context.allowWorldSpawn = true;
            }
        }
        else{
            context.allowSpawnToActor = false;
        }


        // when an item is selected
        if(typeof this.selectThingDef != "undefined"){
            // step 1, get the selected thingDef from dataJson.
            let thingDef = SpawnThingSheet.dataJson.ThingDefs[this.selectThingDef];

            // step 2, option stuff check for stuff drop down.
            // if the thing has no valid stuff, then stuff is left undefined and hbs does not render the dropdown.
            // in this case lastStuffSelected is set to null.
            let stuff;
            if(thingDef.ValidStuff != null){
                
                stuff={}; // declare stuff as existing.

                // add to stuff all the valid Stuffs the selected thing can be made out of.
                // the key is the DefName directly from the ValidStuff list the value is the DisplayName.
                for (let i = 0; i < thingDef.ValidStuff.length; i++) {
                    stuff[thingDef.ValidStuff[i]] = SpawnThingSheet.dataJson.ThingDefs[thingDef.ValidStuff[i]].DisplayName;
                }

                // check if the lastStuff selected is contained by the stuff dict.
                if(!(this.lastStuffSelect in stuff)){
                    // if it does not contain it, set it to the first element of ValidStuff.
                    this.lastStuffSelect = stuff[thingDef.ValidStuff[0]]
                }
            }
            else{
                // ensure last stuff selected is null if the thing has no stuff.
                this.lastStuffSelect =  null;
            }

            
            // step 3, generate the thing's value through the below logic matrix.
            // some combination of the thingdef name, and where applicable, stuffdefname and quality are parsed to the C# server and a result is returned.
            // the result will be formatted like so "$2.45"
            let itemValue;

            if(thingDef.HasQuality && thingDef.ValidStuff != null){
                // quality & stuff
                itemValue = await CONFIG.csInterOP.GetValueFor(this.selectThingDef,this.lastStuffSelect,this.lastQualitySelect);
            }
            else if(thingDef.HasQuality){
                // just quality
                itemValue = await CONFIG.csInterOP.GetValueFor(this.selectThingDef,null,this.lastQualitySelect);
            }
            else if(thingDef.ValidStuff != null){
                // just stuff
                itemValue = await CONFIG.csInterOP.GetValueFor(this.selectThingDef,this.lastStuffSelect,null);
            }
            else{
                // neither quality or stuff
                itemValue = await CONFIG.csInterOP.GetValueFor(this.selectThingDef,null,null);
            }

            // in order to have the dropdown values display correctly we much cache them into this scope.
            let selectedQuality = String(this.lastQualitySelect);
            let selectedStuff = String(this.lastStuffSelect) ;

            // we now set all the data for hbs and return.
            
            context.thingDefs= SpawnThingSheet.dataJson.ThingDefs,
            context.qualities=qualities,
            context.selectedQuality=selectedQuality,
            context.selectedThingDef= thingDef.DisplayName,
            context.stuffForThing=stuff,
            context.selectedStuff=selectedStuff,
            context.selectThingValue= itemValue,
            context.spawnPossible=true
            
        }
        return context;
    }

    // when any item for the thing list is clicked, this is called.
    static #onSelectThing(event,button){
        event.preventDefault();


        let scrollContainer = this.element.querySelector("[class=spawnThings-list]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;

        const li = button.closest(".item-row"); // get the containing item row element
        const thingDefName = li.dataset.thingDef; // get the thing def name from the dataset of that element        
        this.selectThingDef = thingDefName; // set the selectedThingDef to that defName.
        this.render(); // call render to rerender the window and update the context.
    }

    static async #onSpawnThing(event,button){
        event.preventDefault();
        console.log(this.selectThingDef)

        

        let context = await this._prepareContext();



        let defName = this.selectThingDef;

        let SpawnReq = {
            "Def": defName,
            "Stuff":context.selectedStuff,
            "Q": context.selectedQuality
        } 



        let giveToActorType = this.giveToActor?.type;
        if(!context.disableSpawnOptions){
            let spawnChoice = this.element.querySelector('input[name="choice"]:checked').value;
            if(spawnChoice === "one"){
                SpawnReq.MapId = game.user.viewedScene;
                SpawnReq.LocX = 0;
                SpawnReq.LocY = 0;
            }
            else if(spawnChoice !== "two"&& (giveToActorType === "pawn" || giveToActorType === "player" || npc==="npc")){
                SpawnReq.PnId = this.giveToActor.system.thingID;
                if(spawnChoice ==="three"){
                    SpawnReq.PnTar = "Inv"
                }
                else if(spawnChoice === "four"){
                    SpawnReq.PnTar = "Eq"
                }
                else if(spawnChoice === "five"){
                    SpawnReq.PnTar = "App"
                }
                else{
                    SpawnReq.WrldInv = true;
                }
            }
            else{
                SpawnReq.WrldInv = true;
            }
        }
        else{
            SpawnReq.WrldInv = true;
        }
    

        let spawnResult = JSON.parse( await CONFIG.csInterOP.MakeThing(SpawnReq));
        console.log(spawnResult);

        if(!context.disableSpawnOptions){
            if("ThingId" in spawnResult){
                if(giveToActorType ==="thing"){
                    this.giveToActor.setThingId(spawnResult.ThingId);
                    this.createActor.setThingDef(defName);
                }
            }
            if("Spawned" in spawnResult){
                this.giveToActor.setSpawned(spawnResult.Spawned);
            }
        }
        else{
            if("ThingId" in spawnResult){
                this.createActor.setThingId(spawnResult.ThingId);
                this.createActor.setThingDef(defName);
            }
        }

        
        if(this.onSpawnAction){
            this.onSpawnAction();
            this.close();
        }
    }

    static async #onSubmit(event, form, formData) {
        //console.log("form handler fired");

        console.log(formData);
        SpawnThingSheet.#onSpawnThing(event,form.formData);
    }

    // initial on render event called when this.render is called.
    _onRender(context,options){
        // search event binding
        this.element.querySelector("input[name=thing-search-field]").addEventListener("keyup",this.filterFn.bind(this));
        
        
        let scrollContainer = this.element.querySelector("[class=spawnThings-list]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }

        // fill in the search if it had a value last time we rendered, cached in this.searchValue.

        if(typeof this.searchValue != "undefined"){
            this.element.querySelector("input[name=thing-search-field]").value = this.searchValue;
            this.filterFn(); // call filterFn to actually filter the elements.
        }

        // get the div containing the quality drop down, initially set it to display=none.
        let qualitySelector = this.element.querySelector("div[name=quality-selector]")
        
        qualitySelector.style.display = "none"

        // if we have a selectedThingDef
        if(typeof this.selectThingDef != "undefined"){
            // get get the thing def from dataJson
            let thingDef = SpawnThingSheet.dataJson.ThingDefs[this.selectThingDef];
            // if it has quality, enable the quality dropdown & bind the change event.
            if(thingDef.HasQuality){
                qualitySelector.style.display = ""
                this.element.querySelector("select[name=qualities]").addEventListener("change",this.qualityChanged.bind(this));
            }
            else{
                // if no quality, reset the quality dropdown to the default, "Normal"
                this.lastQualitySelect = "Normal";
            }

            // if the selected thing is made from stuff, bind the change event to it.
            if(thingDef.ValidStuff){
                this.element.querySelector("select[name=stuff]").addEventListener("change",this.stuffChanged.bind(this));
            }
            else{ // else reset lastStuffSelect to null.
                this.lastStuffSelect = null;
            }
        }
    }

    // called when the value of the quality dropdown chagnes.
    // sets the instanced lastQualitySelect value, then calls render.
    // this recacualtes the thing value.
    qualityChanged(event){
        this.lastQualitySelect = event.currentTarget.value;
        this.render();
    }

    // called when the value of the stuff dropdown chagnes.
    // sets the instanced lastStuffSelect value, then calls render.
    // this recacualtes the thing value.
    stuffChanged(event){
        this.lastStuffSelect = event.currentTarget.value;
        this.render();
    }

    // search filter function
    filterFn(event) {
        const input = document.getElementById("thing-search-field"); // get search input
        this.searchValue = input.value; // cache search value for when render() is called.
        const filter = input.value.toLowerCase(); // set search value to lower case for string comparison.
        const table = document.getElementById("spawn-thing-list-table"); // get element table
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
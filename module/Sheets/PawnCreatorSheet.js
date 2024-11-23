const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class PawnCreatorSheet extends HandlebarsApplicationMixin(ApplicationV2){

    targetActor;

    static kindDefCache={};
    selectKindDef;
    scrollTop = 0;
    scrollLeft = 0;

    searchValue;
    genderMode="0";
    ageMode="0";

    fixedLastName;
    bioMin;
    bioMax;
    fixedBio;
    chronoAllowed;
    fixedChrono;
    addictions;
    cryptosleep;
    gay = true;
    downed;
    dead;

    static DEFAULT_OPTIONS = {
        id: "pawn-creator",
        tag: "form",
        window:{
            icon: "fas fa-gear",
            title: "PawnCreatorSheet.form.title",
            resizable:true
        },
        position: {
          width: 750,
          height: 550
        },
        actions:{
            // triggers the rerender of the window when the user selects a thing
            selectKind:PawnCreatorSheet.#onSelectKind,
            submit:PawnCreatorSheet.#onSubmit
        }
    }

    static PARTS = {
        form: {
          id: "spawnThings",
          template: "systems/rimtop/templates/dialogue/pawn-creator.hbs"
        }
    }

    get title(){
        return "Create pawn"
    }

    async _prepareContext(options){
        console.log(this.targetActor);

        if(Object.keys(PawnCreatorSheet.kindDefCache).length === 0 ){
            let res = await CONFIG.csInterOP.GetAllPawnKindDefs();
            PawnCreatorSheet.kindDefCache = JSON.parse(res);
        }


        let context ={
            isGM: game.user.isGM,
            kindDefs: PawnCreatorSheet.kindDefCache,
            genderOptions:[
                "Random",
                "Male",
                "Female",
                "None"
            ],
            genderMode:this.genderMode,
            ageOptions:[
                "Random",
                "Range",
                "Fixed"
            ],
            ageMode:this.ageMode,

            fixedLastName:this.fixedLastName,
            bioMin:this.bioMin,
            bioMax:this.bioMax,
            fixedBio:this.fixedBio,
            chronoAllowed:this.chronoAllowed,
            fixedChrono:this.fixedChrono,
            addictions:this.addictions,
            cryptosleep:this.cryptosleep,
            gay:this.gay,
            downed:this.downed,
            dead:this.dead
        };

        if(this.selectKindDef){
            context.selectKindDef = this.selectKindDef;
        }

        return context;
    }

    render(options,_options){

        const element = this.element;
        if(element){
            let fixedNameElement =element.querySelector("input[id=fixed-last-name");
            if(fixedNameElement){
                this.fixedLastName = fixedNameElement.value;
            }            
            let bioMinElement = element.querySelector("input[id=bio-age-range-min]");
            if(bioMinElement){
                this.bioMin = bioMinElement.value;
            }
            let bioMaxElement = element.querySelector("input[id=bio-age-range-max]");
            if(bioMaxElement){
                this.bioMax = bioMaxElement.value;
            }
            let fixedBioElement = element.querySelector("input[id=fixed-bio-age]");
            if(fixedBioElement){
                this.fixedBio = fixedBioElement.value;
            }
            let allowChrono = element.querySelector("input[id=allow-fixed-chron-age]");
            if(allowChrono){
                this.chronoAllowed = allowChrono.checked;
            }
            let fixedChronoElement = element.querySelector("input[id=fixed-chron-age]");
            if(fixedChronoElement){
                this.fixedChrono = fixedChronoElement.value;
            }            
            let addictionsElement =element.querySelector("input[id=allow-addictions");
            if(addictionsElement){
                this.addictions=addictionsElement.checked;
            }
            let cryptosleepElement =element.querySelector("input[id=cryptosleep");
            if(cryptosleepElement){
                this.cryptosleep = cryptosleepElement.checked;
            }
            let gayElement = element.querySelector("input[id=allow-gay");
            if(gayElement){
                this.gay = gayElement.checked;
            }
            let downedElement = element.querySelector("input[id=allow-downed");
            if(downedElement){
                this.downed = downedElement.checked;
            }
            let deadElement = element.querySelector("input[id=force-dead");
            if(deadElement){
                this.dead = deadElement.checked;
            }
        }
        
        return super.render(options,_options);
    }

    _onRender(context,options){
        let scrollContainer = this.element.querySelector("[class=pawn-kinds-list]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }
        this.element.querySelector("input[name=filter_field]").addEventListener("keyup",this.filterFn.bind(this));
        if(typeof this.searchValue != "undefined"){
            this.element.querySelector("input[name=filter_field]").value = this.searchValue;
            this.filterFn(); // call filterFn to actually filter the elements.
        }

        let ageDropDown = this.element.querySelector("select[name=age_options]");
        if(ageDropDown){ageDropDown.addEventListener("change",this.ageModeChange.bind(this));}
        let genderDropDown = this.element.querySelector("select[name=gender-options]");
        if(genderDropDown){genderDropDown.addEventListener("change",this.genderModeChanged.bind(this));}
    }

    static async #onSubmit(event,button) {
        event.preventDefault();
        if(!this.selectKindDef){
            return;
        }
        let element = this.element;

        let pawnGenerationRequest ={
            KindDefName:this.selectKindDef

        }

        let fixedLastName = element.querySelector("input[id=fixed-last-name").value;
        if(String(fixedLastName)){
            console.log(fixedLastName);
            pawnGenerationRequest.FixedLastName = fixedLastName;
        }

        if(this.genderMode!=="0"){
            let optionValue = this.genderMode;
            if(optionValue==="1"){
                pawnGenerationRequest.FixedGender = 1;
            }
            else if(optionValue ==="2"){
                pawnGenerationRequest.FixedGender = 2;
            }
            else{
                pawnGenerationRequest.FixedGender = 0;
            }
        }

        if(this.ageMode!=="0"){
            let optionValue = this.ageMode;
            if(optionValue==="1"){
                let minRaw =parseFloat(element.querySelector("input[id=bio-age-range-min]").value);
                let maxRaw =parseFloat(element.querySelector("input[id=bio-age-range-max]").value);

                if(minRaw <= maxRaw && minRaw > 0 && maxRaw > 0){
                    pawnGenerationRequest.BioMinAge = minRaw;
                    pawnGenerationRequest.BioMaxAge = maxRaw;
                }

            }
            else if(optionValue ==="2"){
                let fixedRaw =parseFloat(element.querySelector("input[id=fixed-bio-age]").value);
                if(fixedRaw > 0){
                    pawnGenerationRequest.FixedBioAge = fixedRaw;
                }
            }
        }

        if(element.querySelector("input[id=allow-fixed-chron-age").checked){
            let fixedRaw =parseFloat(element.querySelector("input[id=fixed-chron-age]").value);
            if(fixedRaw > 0){

                if("BioMaxAge" in pawnGenerationRequest){
                    if(fixedRaw < pawnGenerationRequest.BioMaxAge){
                        fixedRaw = pawnGenerationRequest.BioMaxAge;
                    }
                }

                if("FixedBioAge" in pawnGenerationRequest){
                    if(fixedRaw < pawnGenerationRequest.FixedBioAge){
                        fixedRaw = pawnGenerationRequest.FixedBioAge;
                    }
                }

                pawnGenerationRequest.FixedChronologicalAge = fixedRaw;
            }
        }

        if(element.querySelector("input[id=allow-addictions]").checked){
            pawnGenerationRequest.AllowAddictions = true;
        }
        if(element.querySelector("input[id=cryptosleep]").checked){
            pawnGenerationRequest.Cryptosleep = true;
        }
        if(element.querySelector("input[id=allow-gay]").checked){
            pawnGenerationRequest.AllowGay = true;            
        }
        if(element.querySelector("input[id=allow-downed]")?.checked){
            pawnGenerationRequest.AllowDowned = true;            
        }
        if(element.querySelector("input[id=force-dead]")?.checked){
            pawnGenerationRequest.ForceDead = true;            
        }
        console.log(pawnGenerationRequest);
        let response = JSON.parse(await CONFIG.csInterOP.MakePawnGeneratioRequest(JSON.stringify(pawnGenerationRequest)));
        if(response.Success===true){
            this.targetActor.setThingId(response.PawnId);
            this.targetActor.setThingDef(response.PawnDef);
            this.close();
        }
        else{
            console.log(success.FailureReason);
        }
    }

    static #onSelectKind(event,button){
        event.preventDefault();
        
        this.setScrollPos();

        const li = button.closest(".item-row"); // get the containing item row element
        const kindDefName = li.dataset.kindDef; // get the thing def name from the dataset of that element        
        this.selectKindDef = kindDefName; // set the selectedThingDef to that defName.
        this.render(); // call render to rerender the window and update the context.
    }

    setScrollPos(){
        let scrollContainer = this.element.querySelector("[class=pawn-kinds-list]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;
    }
    ageModeChange(event){
        this.ageMode = event.currentTarget.value;
        this.render();
    }

    genderModeChanged(event){
        this.genderMode = event.currentTarget.value;
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
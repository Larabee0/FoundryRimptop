import { BackstoryPicker } from "../Forms/BackstoryPicker.js";
import { TraitPicker } from "../Forms/TraitPicker.js";

export class BioTab{
    
    ownerActorSheet;
    
    editBio = false;

    cachedTraits={};
    cachedBackstories={};
    cachedSkills={};
    cachedBasic={};

    static genderOptions = ["Male", "Female", "None"];
    static passionLoop = ["None","Minor","Major"];

    constructor(actorSheet){
        this.ownerActorSheet = actorSheet;
    }

    async _prepareContextBioCard(context, actor){

        if(actor.type ==="pawn"){
            if("noneBio" in context.system.bio){
                await actor.updateBio();
                context.system.bio = structuredClone(actor.system.bio);
            }

            context.system.bio.editBio = this.editBio;
            
            if(this.editBio === true){
                context = await this._prepareContextBioEditor(context,actor);
            }
        }
        return context;
    }

    async _prepareContextBioEditor(context, actor){
        if(actor.type ==="pawn"){
            if(Object.keys(this.cachedSkills).length === 0){
                this.recacheSkills();
            }
            if(Object.keys(this.cachedBasic).length ===0){
                this.cachedBasic = JSON.parse(await BioTab.GetPawnBasicEditData(actor.system.thingID));
            }
            
            
            context.system.bio.editor={
                isGM: game.user.isGM,
                skills: this.cachedSkills,
                basic:this.cachedBasic,
                genderOptions:BioTab.genderOptions,
                curGender:BioTab.genderOptions.indexOf(this.cachedBasic.Gender)
            };
        }
        return context;
    }

    async changeTabBio(){
        if(this.editBio){
            //console.log("disabling bio editing");
            await this.updateBioBasic();
            await this.updateAllSkills();
            await this.ownerActorSheet.actor.updateStats();
            this.editBio = false;

        }
    }

    async _preClose(){
        if(this.editBio){
            await this.updateBioBasic();
            await this.updateAllSkills();
            await this.ownerActorSheet.actor.updateStats();
            this.editBio = false;
        }
    }

    _onRender(context, options){
        if(context.system.bio.editBio===true){
            let inputs = this.ownerActorSheet.element.getElementsByClassName("skill-value-editor");
            if(inputs){        
                for(let i= 0; i<inputs.length;i++){
                    inputs.item(i).addEventListener("focusout",this.skillValueEdit.bind(this));
                }
            }
            let traits = this.ownerActorSheet.element.getElementsByClassName("trait-label");
            if(traits){
                for(let i= 0; i<traits.length;i++){
                    traits.item(i).addEventListener("mouseup",this.deleteTrait.bind(this));
                }
            }
            
            let nameRandomise = this.ownerActorSheet.element.querySelector("[id=randomise-name");
            if(nameRandomise){
                nameRandomise.addEventListener("click",this.onRandomiseName.bind(this));
            }

            let backstoryRandomise = this.ownerActorSheet.element.querySelector("[id=randomise-backstory");
            if(backstoryRandomise){
                backstoryRandomise.addEventListener("click",this.onRandomiseBackstory.bind(this));
            }
            
            let traitRandomise = this.ownerActorSheet.element.querySelector("[id=randomise-traits");
            if(traitRandomise){
                traitRandomise.addEventListener("click",this.onRandomiseTrait.bind(this));
            }

            let bioYears = this.ownerActorSheet.element.querySelector("[id=bio-years]");
            let bioDays = this.ownerActorSheet.element.querySelector("[id=bio-days]");
            let chronoYears = this.ownerActorSheet.element.querySelector("[id=chrono-years]");
            let chronoDays = this.ownerActorSheet.element.querySelector("[id=chrono-days]");
            if(bioYears && bioDays && chronoYears && chronoDays){
                bioYears.addEventListener("focusout",this.validAgeInputs.bind(this));
                bioDays.addEventListener("focusout",this.validAgeInputs.bind(this));
                chronoYears.addEventListener("focusout",this.validAgeInputs.bind(this));
                chronoDays.addEventListener("focusout",this.validAgeInputs.bind(this));
            }

            
            let bodySizeOffset = this.ownerActorSheet.element.querySelector("[id=body-size-offset]");
            let healthScaleOffset = this.ownerActorSheet.element.querySelector("[id=health-scale-offset]");
            if(bodySizeOffset && healthScaleOffset){
                bodySizeOffset.addEventListener("focusout", this.validateBodySizeInputs.bind(this));
                healthScaleOffset.addEventListener("focusout", this.validateBodySizeInputs.bind(this));
            }

            let nameFields = this.ownerActorSheet.element.getElementsByClassName("pawn-name-field");
            if(nameFields){
                for(let i= 0; i<nameFields.length;i++){
                    nameFields.item(i).addEventListener("focusout",this.updateBioBasic.bind(this));
                }
            }
            let genderDropDown = this.ownerActorSheet.element.querySelector("select[name=gender-options]");
            if(genderDropDown){genderDropDown.addEventListener("change",this.updateBioBasic.bind(this));}

        }
    }

    async skillValueEdit(event){
        event.preventDefault();
        let button = event.currentTarget;
        let newValue = parseInt(button.value).clamp(0,20);
        if(!isNaN(newValue) && newValue !== this.cachedSkills[button.dataset.skillDef].Val){
            this.cachedSkills[button.dataset.skillDef].Val = newValue;
            if(newValue< this.cachedSkills[button.dataset.skillDef].Min){
                this.cachedSkills[button.dataset.skillDef].Val = Math.max(this.cachedSkills[button.dataset.skillDef].Min,newValue).scientificToDecimal();
            }
            await this.updateSkill(button.dataset.skillDef);
            await this.recacheEdit();
        }
    }

    async deleteTrait(event){
        event.preventDefault();
        if(event.which===3){
            if(event.detail===2){
                let traitDef = event.currentTarget.dataset.def;
                if(!traitDef){
                    return;
                }
                let traitDegree= parseInt(event.currentTarget.dataset.degree);
                let currentTraits = this.ownerActorSheet.actor.system.bio.Traits;
                let traitElement = currentTraits.find((element)=>element.DefName ===traitDef && element.Degree===traitDegree);
                let remainingTraits = [];
                if(traitElement){
                    for(let i = 0; i < currentTraits.length; i++){
                        if(currentTraits[i]!==traitElement){
                            remainingTraits.push(currentTraits[i]);
                        }
                    }
                }
                //console.log(remainingTraits);
                await this.updateTraits(remainingTraits);                
                await this.recacheSkills();
                await this.recacheEdit();
            }
        }
    }

    async validateBodySizeInputs(event){
        event.preventDefault();
        let bodySizeElement = this.ownerActorSheet.element.querySelector("[id=body-size-offset]");
        let healthScaleElement = this.ownerActorSheet.element.querySelector("[id=health-scale-offset]");
        if(bodySizeElement && healthScaleElement){
            let bodySizeOffset = parseInt(bodySizeElement.value);
            let healthScaleOffset = parseInt(healthScaleElement.value);
            
            if(!isNaN(bodySizeOffset) && !isNaN(healthScaleOffset)){
                if(healthScaleOffset === this.cachedBasic.HealthScaleOffset && bodySizeOffset===this.cachedBasic.BodySizeOffset){
                    
                    //console.log("no body size change");
                    return;
                }
                this.cachedBasic.BodySizeOffset = bodySizeOffset.scientificToDecimal();
                this.cachedBasic.HealthScaleOffset = healthScaleOffset.scientificToDecimal();
                await this.updateBioBasic();
                await this.recacheEdit();
            }
            else{
                bodySizeElement.value =  this.cachedBasic.BodySizeOffset;
                healthScaleElement.value =  this.cachedBasic.HealthScaleOffset;
            }
        }
    }

    async validAgeInputs(event){
        event.preventDefault();
        let elementBioYears = this.ownerActorSheet.element.querySelector("[id=bio-years]");
        let elementBioDays = this.ownerActorSheet.element.querySelector("[id=bio-days]");
        let elementChronoYears = this.ownerActorSheet.element.querySelector("[id=chrono-years]");
        let elementChronoDays = this.ownerActorSheet.element.querySelector("[id=chrono-days]");
        if(elementBioYears && elementBioDays && elementChronoYears && elementChronoDays){
            let bioYears = parseInt(elementBioYears.value).clamp(0,1000000000);
            let bioDays = parseInt(elementBioDays.value).clamp(0,59);
            let chronoYears = parseInt(elementChronoYears.value).clamp(0,1000000000);
            let chronoDays = parseInt(elementChronoDays.value).clamp(0,59);
            if(!isNaN(bioYears) && !isNaN(bioDays) && !isNaN(chronoYears) && !isNaN(chronoDays)){
                if(bioYears === this.cachedBasic.BioAgeYears && bioDays===this.cachedBasic.BioAgeDays && chronoYears===this.cachedBasic.ChronoAgeYears && chronoDays ===this.cachedBasic.ChronoAgeDays){
                    return;
                }
                if(chronoYears < bioYears|| bioYears > chronoYears){
                    if(event.currentTarget === elementBioYears){ 
                        elementChronoYears.value = bioYears;
                        chronoYears = bioYears;
                    }
                    else if(event.currentTarget === elementChronoYears){
                        elementBioYears.value = chronoYears;
                        bioYears = chronoYears;
                    }

                }
                if((chronoDays < bioDays || bioYears > chronoYears) && chronoYears === bioYears){

                    if(event.currentTarget === elementBioDays){ 
                        elementChronoDays.value = bioDays;
                        chronoDays = bioDays;
                    }
                    else if(event.currentTarget === elementChronoDays){
                        elementBioDays.value = chronoDays;
                        bioDays = chronoDays;
                    }
                }
                this.cachedBasic.BioAgeYears = bioYears.scientificToDecimal();
                this.cachedBasic.BioAgeDays = bioDays.scientificToDecimal();
                this.cachedBasic.ChronoAgeYears = chronoYears.scientificToDecimal();
                this.cachedBasic.ChronoAgeDays = chronoDays.scientificToDecimal();
                await this.updateBioBasic();
                await this.recacheEdit();
            }
            else{
                elementBioYears.value =  this.cachedBasic.BioAgeYears;
                elementBioDays.value =  this.cachedBasic.BioAgeDays;
                elementChronoYears.value = this.cachedBasic.ChronoAgeYears;
                elementChronoDays.value  =this.cachedBasic.ChronoAgeDays;
            }
        }
    }

    async updateBioBasic(event){

        let basicEdit ={
            PawnId: this.ownerActorSheet.actor.system.thingID,
            BioAgeYears:this.cachedBasic.BioAgeYears,
            BioAgeDays:this.cachedBasic.BioAgeDays,
            ChronoAgeYears:this.cachedBasic.ChronoAgeYears,
            ChronoAgeDays:this.cachedBasic.ChronoAgeDays,
            HealthScaleOffset:this.cachedBasic.HealthScaleOffset,
            BodySizeOffset:this.cachedBasic.BodySizeOffset,
            Gender: BioTab.genderOptions[this.ownerActorSheet.element.querySelector("select[name=gender-options]").value],
        }
        let nickName = this.ownerActorSheet.element.querySelector("[id=name-nick-name]").value
        let firstName = this.ownerActorSheet.element.querySelector("[id=name-first-name]");
        let lastName = this.ownerActorSheet.element.querySelector("[id=name-last-name]");
        


        if(!nickName.isSafe()){
            nickName = this.cachedBasic.NickName;
            await this.render();
        }
        
        basicEdit.NickName = nickName;
        if(firstName){
            
            if(!firstName.value.isSafe()){
                firstName.value = this.cachedBasic.FirstName ;
                await this.render();
            }
            basicEdit.FirstName = firstName.value;
        }
        if(lastName){
            if(!lastName.value.isSafe()){
                lastName.value = this.cachedBasic.LastName ;
                await this.render();
            }
            basicEdit.LastName = lastName.value;
        }

        await BioTab.SetPawnBasicBioEdit(JSON.stringify(basicEdit));
        if(event){
            await this.recacheEdit();
        }
    }

    async onRandomiseName(event, button){
        event.preventDefault();
        await BioTab.RandomisePawnName(this.ownerActorSheet.actor.system.thingID);
        await this.recacheEdit();
    }

    async updateSkill(skillDef){
        //console.log("Updating skills on rw client");
        let skillDataJson={
            PawnId: this.ownerActorSheet.actor.system.thingID,
            SkillDefNames:[skillDef],
            SkillValues:[this.cachedSkills[skillDef].Val],
            Passions:[this.cachedSkills[skillDef].Passion]
        }

        await BioTab.SetPawnBioSkills(JSON.stringify(skillDataJson));
    }

    async updateAllSkills(){
        let skillDataJson={
            PawnId: this.ownerActorSheet.actor.system.thingID,
            SkillDefNames:[],
            SkillValues:[],
            Passions:[]
        }

        let keys = Object.keys(this.cachedSkills);

        for(let i= 0; i<keys.length;i++){
            let skillElement= this.cachedSkills[keys[i]];
            skillDataJson.SkillDefNames.push(keys[i]);
            skillDataJson.SkillValues.push(skillElement.Val);
            skillDataJson.Passions.push(skillElement.Passion);
        }
        await BioTab.SetPawnBioSkills(JSON.stringify(skillDataJson));
    }

    async recacheSkills(){
        this.cachedSkills = JSON.parse(await(BioTab.GetSkillEditData(this.ownerActorSheet.actor.system.thingID)));
    }

    async updateBackstory(def,slot){
        let backstoryChange={
            PawnId: this.ownerActorSheet.actor.system.thingID,
            BackstoryDef: def,
            BackstorySlot: slot
        }
        await BioTab.SetPawnBioBackstories(JSON.stringify(backstoryChange))
        //console.log();
    }

    async updateTraits(traits){
        if(traits){
            let traitDataJson = {
                PawnId: this.ownerActorSheet.actor.system.thingID,
                TraitDefNames:[],
                TraitDegrees:[]
            };

            for(let i= 0; i<traits.length;i++){
                traitDataJson.TraitDefNames.push(traits[i].DefName);
                traitDataJson.TraitDegrees.push(traits[i].Degree);
            } 
            await BioTab.SetPawnBioTraits(JSON.stringify(traitDataJson));
            this.cachedSkills = JSON.parse(await(BioTab.GetSkillEditData(this.ownerActorSheet.actor.system.thingID)));
        }
    }

    async recacheEdit(){
        this.cachedBasic={};
        await this.ownerActorSheet.actor.updateBio();
        this.cachedBasic = JSON.parse(await BioTab.GetPawnBasicEditData(this.ownerActorSheet.actor.system.thingID));
        //await this.render();
    }

    async onRefreshBio(event,button){
        event.preventDefault();        
        await this.ownerActorSheet.actor.updateBio();
        this.ownerActorSheet.render();
    }

    async onEditBioToggle(event, button){
        //console.log("switched to edit mode ",button.checked);
        this.editBio = button.checked;
        if(!this.editBio){
            await this.updateBioBasic();
            await this.updateAllSkills();
            await this.recacheEdit();
            await this.ownerActorSheet.actor.updateStats();
        }
        else{
            this.ownerActorSheet.render();
        }
        
    }

    async onEditPassion(event,button){
        event.preventDefault();
        let skillDef =button.dataset.skillDef;

        let index = BioTab.passionLoop.indexOf(this.cachedSkills[skillDef].Passion);
        index = ((index + 1)% BioTab.passionLoop.length + BioTab.passionLoop.length) % BioTab.passionLoop.length;
        this.cachedSkills[skillDef].Passion = BioTab.passionLoop[index];
        await this.updateSkill(skillDef);        
        await this.recacheEdit();
    }

    onAddTrait(event,button){
        event.preventDefault();
        let picker = new TraitPicker(this.ownerActorSheet.actor);
        TraitPicker.ownerSheet= this;
        picker.render({force:true});
        
    }
    async onRandomiseTrait(event,button){
        event.preventDefault();
        await BioTab.RandomisePawnTraits(this.ownerActorSheet.actor.system.thingID);
        
        await this.recacheSkills();
        await this.recacheEdit();
    }
    onEditBackstory(event,button){
        event.preventDefault();
        let curDef = button.dataset.def;
        let slot = button.dataset.slot;
        let picker = new BackstoryPicker(this.ownerActorSheet.actor,slot,curDef);
        BackstoryPicker.ownerSheet = this;
        picker.render({ force: true });
    }

    async onRandomiseBackstory(event,button){
        
        event.preventDefault();
        await BioTab.RandomisePawnBackstories(this.ownerActorSheet.actor.system.thingID);
        
        await this.recacheSkills();
        await this.recacheEdit();
    }


    static async GetSkillEditData(pawnId){
        return await CONFIG.csInterOP.SendHttpRequest("GET","getSkillEditData",pawnId);
    }
    static async GetPawnBasicEditData(pawnId){
        return await CONFIG.csInterOP.SendHttpRequest("GET","getPawnBasicEdit",pawnId);
    }

    static async SetPawnBasicBioEdit(basicBioData){
        return await CONFIG.csInterOP.SendHttpRequest("POST","setBioBasic",basicBioData);
    }

    static async SetPawnBioSkills(skills){
        return await CONFIG.csInterOP.SendHttpRequest("POST","setBioSkills",skills);
    }

    static async SetPawnBioBackstories(backstories){
        return await CONFIG.csInterOP.SendHttpRequest("POST","setBioBackstories",backstories);
    }

    static async SetPawnBioTraits(traits){
        return await CONFIG.csInterOP.SendHttpRequest("POST","setBioTraits",traits)
    }

    static async RandomisePawnBio(pawnId){
        await CONFIG.csInterOP.SendHttpRequest("POST","randomiseAll",pawnId);
    }

    static async RandomisePawnName(pawnId){
        await CONFIG.csInterOP.SendHttpRequest("POST","randomiseName",pawnId);
    }
    
    static async RandomisePawnBackstories(pawnId){
        await CONFIG.csInterOP.SendHttpRequest("POST","randomiseBackstories",pawnId);
    }
    
    static async RandomisePawnTraits(pawnId){
        await CONFIG.csInterOP.SendHttpRequest("POST","randomiseTraits",pawnId);
    }
}
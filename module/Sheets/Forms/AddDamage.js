const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AddDamage extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "add-damage",
        tag: "form",
        window:{
            title: "AddDamage.form.title",
            resizable:true
        },
        position: {
          width: 400,
          height: 450
        },
        actions:{
            pickBodyPart:AddDamage.#pickBodyPart,
            backToDamageDef:AddDamage.#backToDamageDef,
            backToBodyParts:AddDamage.#backToBodyParts,
            applyDamage:AddDamage.#applyDamage
        }
    }

    static PARTS = {
        form: {
          id: "add-damage",
          template: "systems/rimtop/templates/dialogue/add-damage-sheet.hbs"
        }
    }

    get title(){
        return "Apply manual damage to the pawn";
    }

    static cachedDamgeDefs = {};
    
    targetableParts = {};

    pawnId;
    closeAction;

    //selectedCategory = "Hediff";
    selectedDamageDef = "Cut";
    selectedBodypart;
    selectedInstigator = 0;
    selectedWeaponDef = 0;

    pickBodyPart;
    finalSettings;
    damageCache = 1;
    armorPenCache = 0;
    selectedInstigatorPawn;
    cachedWeaponDefs;

    scrollTop = 0;
    scrollLeft = 0;
    
    constructor(pawnId){
        super();
        this.pawnId = pawnId;
    }

    async _prepareContext(options){
        
        if(Object.keys(AddDamage.cachedDamgeDefs).length ===0){
            AddDamage.cachedDamgeDefs = JSON.parse( await AddDamage.GetDamageDefs());
        }
        
        let context={
            selectedDamageDef:this.selectedDamageDef
        };

        if(!this.pickBodyPart && !this.finalSettings){
            context.damageDefs=AddDamage.cachedDamgeDefs;
        }
        if(this.pickBodyPart){
            context.targetableParts=this.targetableParts;
        }
        if(this.finalSettings){
            context.finalSettings=true;
            let damageDef = AddDamage.cachedDamgeDefs[this.selectedDamageDef];
            let bodyPart = this.targetableParts[this.selectedBodypart];
            context.applicationLabel = damageDef.DisplayName + " to " + bodyPart.Label;
            if(damageDef.HarmsHealth){
                context.HarmsHealth = true;
            }
            context.damageCache = this.damageCache;
            context.armorPenCache = this.armorPenCache;
            context.instigators = this.getAllPawns();
            context.selectedInstigator = this.selectedInstigator;
            if(this.selectedInstigator !== 0){
                let local=this.getAllPawnsId()[this.selectedInstigator];
                if(local !== this.selectedInstigatorPawn|| !this.cachedWeaponDefs){
                    this.selectedInstigatorPawn = local;
                    this.cachedWeaponDefs = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","weaponDefsFromPawn",this.selectedInstigatorPawn));
                }
                //console.log(this.selectedInstigatorPawn);
                //console.log(this.cachedWeaponDefs);
                if(this.cachedWeaponDefs){
                    // TODO get weapon defs from actor need pawn id & weapon thing def name
                    context.weaponDefs = ["None"];
                    let keys = Object.keys(this.cachedWeaponDefs)
                    for(let i = 0; i < keys.length; i++){
                        context.weaponDefs.push(this.cachedWeaponDefs[keys[i]]);
                    }

                    context.selectedWeaponDef = this.selectedWeaponDef;
                }
            }
        }

        //console.log(context);
        return context;
    }

    _onRender(context,options){
        let scrollContainer = this.element.querySelector("[id=damage-def-list]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }

        let damageDefs = this.element.getElementsByClassName("damage-def-item");
        if(damageDefs){
            
            for(let i= 0; i<damageDefs.length;i++){
                damageDefs.item(i).addEventListener("click",this.damageDefSelect.bind(this));
            }
        }
        let parts = this.element.getElementsByClassName("part-item");
        if(parts){
            for(let i= 0; i<parts.length;i++){
                parts.item(i).addEventListener("click",this.bodyPartPicked.bind(this));
            }
        }

        let instigator = this.element.querySelector("[name=instigator-options");
        if(instigator){
            instigator.addEventListener("change",this.onInstigatorChanged.bind(this));
        }
    }
    
    getAllPawns(){
        let allPawns =["None"];
        for (let i = 0; i < game.actors.apps.length; i++){
            for(let j = 0; j < game.actors.apps[i].documents.length; j++){
                let actorType = game.actors.apps[i].documents[j].type;
                if(actorType ==="pawn"){
                    let actor = game.actors.apps[i].documents[j];
                    if(actor.system.thingID !== "uncreatedThing" && actor !==this.targetActor){
                        allPawns.push(actor.name);
                    }
                }
            }
        }
        return allPawns;
    }

    getAllPawnsId(){
        let allPawns =["None"];
        for (let i = 0; i < game.actors.apps.length; i++){
            for(let j = 0; j < game.actors.apps[i].documents.length; j++){
                let actorType = game.actors.apps[i].documents[j].type;
                if(actorType ==="pawn"){
                    let actor = game.actors.apps[i].documents[j];
                    if(actor.system.thingID !== "uncreatedThing" && actor !==this.targetActor){
                        allPawns.push(actor.system.thingID);
                    }
                }
            }
        }
        return allPawns;
    }

    onInstigatorChanged(event){

        this.damageCache =  this.element.querySelector("[name=damage-input]").value.scientificToDecimal();
        this.armorPenCache = this.element.querySelector("[name=armor-input]").value.scientificToDecimal();

        this.selectedInstigator=parseInt(event.currentTarget.value);
        this.render();
    }

    async damageDefSelect(event){
        event.preventDefault();
        let scrollContainer = this.element.querySelector("[id=damage-def-list]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;
        this.selectedDamageDef = event.currentTarget.dataset.def;
        this.render();
    }

    async bodyPartPicked(event){
        event.preventDefault();
        this.selectedBodypart = event.currentTarget.dataset.bodyPart;
        this.finalSettings = true;
        this.pickBodyPart = false;
        this.render();
    }
    
    static async GetDamageDefs(){
        return await CONFIG.csInterOP.SendHttpRequest("GET","getDamageDefs");
    }

    static async #pickBodyPart(event,button){
        this.pickBodyPart = true;
        let selectedHediffDef = AddDamage.cachedDamgeDefs[this.selectedDamageDef].HediffDef;
        this.targetableParts = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getPartsForHediff",this.pawnId,selectedHediffDef));
        this.render();
    }

    static #backToDamageDef(event,button){
        this.pickBodyPart = false;
        this.render();
    }
    static #backToBodyParts(event,button){
        this.pickBodyPart = true;
        this.finalSettings = false;
        this.render();
    }
    static async #applyDamage(event,button){
        this.pawnId
        let damageDef = this.selectedDamageDef;
        let bodyPart = this.targetableParts[this.selectedBodypart].Index;
        let dmgAmount = parseFloat(this.element.querySelector("[name=damage-input]").value);
        if(isNaN(dmgAmount)){
            dmgAmount = 0.5;
        }
        let armorPen = parseFloat(this.element.querySelector("[name=armor-input]").value);
        if(isNaN(armorPen)){
            armorPen = 0;
        }
        let instigatorElement = this.element.querySelector("[name=instigator-options]");
        let intigatorLoadId = "";
        if(instigatorElement && instigatorElement.value !=0){

            intigatorLoadId = this.selectedInstigatorPawn;
        }
        


        let weaponElement = this.element.querySelector("[name=weapon-options]");
        let instigatorWeaponId = "";
        if(weaponElement && weaponElement.value !=0){
            let index = weaponElement.value - 1;
            let keys = Object.keys(this.cachedWeaponDefs);
            instigatorWeaponId=keys[index];
        }
        //console.log(this.pawnId);
        //console.log(damageDef);
        await CONFIG.csInterOP.SendHttpRequest("POST","addDamage",this.pawnId,damageDef,bodyPart,dmgAmount,armorPen,intigatorLoadId,instigatorWeaponId);
        if(this.closeAction){
            this.closeAction();
        }
        this.close();
    }
}
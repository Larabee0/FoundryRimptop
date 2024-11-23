import { DoubleSliderController } from "../PartialControllers/DoubleSliderController.js";
import {GenericStatCardSheet} from "../GenericStatCardSheet.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class BillConfigForm extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "bill-config",
        tag: "form",
        window:{
            title: "BillConfigForm.form.title"
        },
        position: {
          width: 800,
          height: 600
        },
        actions:{
            suspend:BillConfigForm.#onSuspended,
            clearAll:BillConfigForm.#onClearAll,
            allowAll:BillConfigForm.#onAllowAll,
            countEquip:BillConfigForm.#onCountEquipped,
            countTaint:BillConfigForm.#onCountTainted,
            onlyAllowIngredients:BillConfigForm.#onOnlyAllowIngredients,
            pauseWhenStatisfied:BillConfigForm.#onPauseWhenStatisfied,
            showThingInfo:BillConfigForm.#onICard
        }
    }

    static PARTS = {
        form: {
          id: "bill-config",
          template: "systems/rimtop/templates/dialogue/bill-config-form.hbs"
        }
    }

    get title(){
        return "Configure Bill";
    }
    
    constructor(billId, billMapId, pawnId){
        super();
        if(billId && billId !== this.billId){
            BillConfigForm.billConfigData = {};
        }
        this.billId = billId;
        this.billMapId = billMapId;
        this.pawnId = pawnId;
    }


    static repeatModes = ["Do X times","Do until you have X","Do forever"];
    static billConfigData={};
    billId;
    billMapId;
    pawnId;

    scrollTop;
    scrollLeft;


    async _prepareContext(options){

        
        if(Object.keys(BillConfigForm.billConfigData).length ===0){
            BillConfigForm.billConfigData = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","billConfigData",this.pawnId,this.billId,this.billMapId));

            BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter = JSON.parse(BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter);
        }
        let context = {
            configData:BillConfigForm.billConfigData
            
        };

        context.configData.countLabels={
            small: context.configData.IntEntryMul,
            big:  context.configData.IntEntryMul * 10
        }

        context.configData.SuspendedString = context.configData.Suspended ? "Suspended" : "Not suspended";

        context.configData.repeatModes = BillConfigForm.repeatModes;
        context.configData.curMode = BillConfigForm.repeatModes.indexOf(context.configData.RepeatMode);
        console.log(context);

        if(!this.productHpSlider){
            this.productHpSlider = new DoubleSliderController();
            this.productHpSlider.onInstant = this.onChangeProductHp.bind(this);
        }
        if(!this.productQualitySlider){
            this.productQualitySlider = new DoubleSliderController();
            this.productQualitySlider.onInstant = this.onChangeProductQuality.bind(this);
        }
        if(!this.ingredientHpSlider){
            this.ingredientHpSlider = new DoubleSliderController();
            this.ingredientHpSlider.onInstant = this.onChangeIngredientHp.bind(this);
        }
        if(!this.ingredientQualitySlider){
            this.ingredientQualitySlider = new DoubleSliderController();
            this.ingredientQualitySlider.onInstant = this.onChangeIngredientQuality.bind(this);
        }


        return context;
    }

    _onRender(context,options){

        this.element.querySelector("[name=repeat-mode]").addEventListener("change",this.onRepeatModeChange.bind(this));

        
        let countAdjusters = this.element.getElementsByClassName("count-adjust-button");
        if(countAdjusters){
            for(let i = 0; i < countAdjusters.length; i++){
                countAdjusters.item(i).addEventListener("click",this.onAdjustCount.bind(this));
            }
        }
        
        let mode = context.configData.curMode;
        if(mode === 1 && context.configData.MinHp !== -1 && context.configData.maxHp !== -1){
            this.productHpSlider?._onRender(this.element.querySelector("[id=product-hp-container]"));
            this.onChangeProductHp();
        }
        if(mode === 1 && context.configData.QualityMin !== -1 && context.configData.QualityMax !== -1){
            this.productQualitySlider?._onRender(this.element.querySelector("[id=product-quality-container]"));
            this.onChangeProductQuality();
        }
        if(context.configData.IngredientsConfig.MinHp !== -1 && context.configData.IngredientsConfig.MaxHp !== -1){
            this.ingredientHpSlider?._onRender(this.element.querySelector("[id=ingredient-hp-container]"));
            this.onChangeIngredientHp();
        }
        if(context.configData.IngredientsConfig.QualityMin !== -1 && context.configData.IngredientsConfig.QualityMax !== -1){
            this.ingredientQualitySlider?._onRender(this.element.querySelector("[id=ingredient-quality-container]"));
            this.onChangeIngredientQuality();
        }
        
        this.ingredientsOnRender();
    }

    async _preClose(options){
        await this.setBillConfig();
        BillConfigForm.billConfigData={};
        return super._preClose(options);
    }

    async setBillConfig(){
        let billConfig={
            Suspended:BillConfigForm.billConfigData.Suspended,

            RepeatMode:BillConfigForm.billConfigData.RepeatMode,
            RepeatTargetCount:BillConfigForm.billConfigData.RepeatTargetCount.scientificToDecimal(),

            CountEquipped:BillConfigForm.billConfigData.CountEquipped,
            CountTainted:BillConfigForm.billConfigData.CountTainted,

            MinHp:BillConfigForm.billConfigData.MinHp.scientificToDecimal(),
            MaxHp:BillConfigForm.billConfigData.MaxHp.scientificToDecimal(),

            QualityMin:BillConfigForm.billConfigData.QualityMin.scientificToDecimal(),
            QualityMax:BillConfigForm.billConfigData.QualityMax.scientificToDecimal(),

            OnlyAllowedIngredients:BillConfigForm.billConfigData.OnlyAllowedIngredients,

            
            PauseWhenStatisified:BillConfigForm.billConfigData.PauseWhenStatisified,
            UnpauseAmount:BillConfigForm.billConfigData.UnpauseAmount.scientificToDecimal()
        }

        let filter = this.GetFilter();
        if(filter){
            billConfig.ThingFilters = filter;
        }
        console.log(billConfig);
        await CONFIG.csInterOP.SendHttpRequest("POST","sendBillConfig",this.pawnId,this.billId,this.billMapId,JSON.stringify(billConfig));
    }
    
    async recacheRepeatCurrentCountCached(){
        await this.setBillConfig();
        BillConfigForm.billConfigData.RepeatCurrentCount=parseInt(await CONFIG.csInterOP.SendHttpRequest("GET","billProductCountFromPawn",this.pawnId,this.billId,this.billMapId)).scientificToDecimal();
    }

    async onRepeatModeChange(event){
        event.preventDefault();
        let newRepeatMode = parseInt(event.currentTarget.value);
        BillConfigForm.billConfigData.RepeatMode = BillConfigForm.repeatModes[newRepeatMode];
        
        if(newRepeatMode === 1){
            await this.recacheRepeatCurrentCountCached();
        }

        this.render();
    }

    onAdjustCount(event){
        event.preventDefault();
        let amount = parseInt(event.currentTarget.innerHTML);
        
        if(event.currentTarget.dataset.pause)
        {
            if(isNaN(amount )){
               amount =  BillConfigForm.billConfigData.UnpauseAmount;
            }
            BillConfigForm.billConfigData.UnpauseAmount +=amount;
            BillConfigForm.billConfigData.UnpauseAmount = Math.max(BillConfigForm.billConfigData.UnpauseAmount,0);
        }
        else{
            if(isNaN(amount )){
               amount =  BillConfigForm.billConfigData.RepeatTargetCount;
            }
            BillConfigForm.billConfigData.RepeatTargetCount +=amount
            BillConfigForm.billConfigData.RepeatTargetCount = Math.max(BillConfigForm.billConfigData.RepeatTargetCount,0);
        }
        
        this.render();
    }

    static #onSuspended(event, button){
        event.preventDefault();
        BillConfigForm.billConfigData.Suspended = !BillConfigForm.billConfigData.Suspended;
        this.render();
    }

    static async #onClearAll(event,button){
        event.preventDefault();
        let root = BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter.CategoryJson;
        this.recursiveCategorySet(root,false);
        
        if(BillConfigForm.billConfigData.OnlyAllowedIngredients && BillConfigForm.billConfigData.OnlyAllowedIngredients){
            await this.recacheRepeatCurrentCountCached();
        }
        this.render();
    }

    static async #onAllowAll(event,button){
        event.preventDefault();
        let root = BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter.CategoryJson;
        this.recursiveCategorySet(root,true);
        
        if(BillConfigForm.billConfigData.OnlyAllowedIngredients){
            await this.recacheRepeatCurrentCountCached();
        }
        this.render();
    }

    static async #onCountEquipped(event,button){
        event.preventDefault();
        BillConfigForm.billConfigData.CountEquipped = button.checked;
        if(BillConfigForm.billConfigData.curMode === 1 && BillConfigForm.billConfigData.CountEquipped){
            await this.recacheRepeatCurrentCountCached();
        }
        this.render();
    }

    static async #onCountTainted(event,button){
        event.preventDefault();
        BillConfigForm.billConfigData.CountTainted = button.checked;
        if(BillConfigForm.billConfigData.curMode === 1 && BillConfigForm.billConfigData.CountTainted){
            await this.recacheRepeatCurrentCountCached();
        }
        this.render();
    }

    static async #onOnlyAllowIngredients(event,button){
        event.preventDefault();
        BillConfigForm.billConfigData.OnlyAllowedIngredients = button.checked;
        if(BillConfigForm.billConfigData.curMode === 1 && BillConfigForm.billConfigData.OnlyAllowedIngredients){
            await this.recacheRepeatCurrentCountCached();
        }
        this.render();
    }

    static #onPauseWhenStatisfied(event,button){
        event.preventDefault();
        BillConfigForm.billConfigData.PauseWhenStatisified = button.checked;
        this.render();
    }

    onChangeProductHp(){
        this.productHpSlider;
        let min = this.ToStringDecimalIfSmall(this.productHpSlider.lowerValue*100) + "%";
        let max = this.ToStringDecimalIfSmall(this.productHpSlider.upperValue*100) + "%";
        let toDisplay = min + " - " + max + " hit points";
        this.element.querySelector("[id=product-hp-label]").innerHTML = toDisplay;
        BillConfigForm.billConfigData.MinHp = this.productHpSlider.lowerValue;
        BillConfigForm.billConfigData.MaxHp = this.productHpSlider.upperValue;
    }

    async onChangeProductQuality(){
        let min=parseInt(this.productQualitySlider.lowerValue);
        let max = parseInt(this.productQualitySlider.upperValue);
        let toDisplay = this.ToQualityString(min,max);
        this.element.querySelector("[id=product-quality-label]").innerHTML = toDisplay;
        BillConfigForm.billConfigData.QualityMin = this.productQualitySlider.lowerValue.scientificToDecimal();
        BillConfigForm.billConfigData.QualityMax = this.productQualitySlider.upperValue.scientificToDecimal();

        if(BillConfigForm.billConfigData.curMode === 1 && BillConfigForm.billConfigData.QualityMin != -1 && BillConfigForm.billConfigData.QualityMax != -1){
            await this.recacheRepeatCurrentCountCached();
        }
    }

    async onChangeIngredientHp(){
        this.ingredientHpSlider;
        let min = this.ToStringDecimalIfSmall(this.ingredientHpSlider.lowerValue*100) + "%";
        let max = this.ToStringDecimalIfSmall(this.ingredientHpSlider.upperValue*100) + "%";
        let toDisplay = min + " - " + max + " hit points";
        this.element.querySelector("[id=ingredient-hp-label]").innerHTML = toDisplay;
        BillConfigForm.billConfigData.IngredientsConfig.MinHp = this.ingredientHpSlider.lowerValue;
        BillConfigForm.billConfigData.IngredientsConfig.MaxHp = this.ingredientHpSlider.upperValue;

        if(BillConfigForm.billConfigData.curMode === 1 && BillConfigForm.billConfigData.OnlyAllowedIngredients && BillConfigForm.billConfigData.IngredientsConfig){
            await this.recacheRepeatCurrentCountCached();
        }
    }

    async onChangeIngredientQuality(){
        let min=parseInt(this.ingredientQualitySlider.lowerValue);
        let max = parseInt(this.ingredientQualitySlider.upperValue);
        let toDisplay = this.ToQualityString(min,max);
        this.element.querySelector("[id=ingredient-quality-label]").innerHTML  = toDisplay;
        BillConfigForm.billConfigData.IngredientsConfig.QualityMin = this.ingredientQualitySlider.lowerValue.scientificToDecimal();
        BillConfigForm.billConfigData.IngredientsConfig.QualityMax = this.ingredientQualitySlider.upperValue.scientificToDecimal();

        if(BillConfigForm.billConfigData.curMode === 1 && BillConfigForm.billConfigData.OnlyAllowedIngredients && BillConfigForm.billConfigData.IngredientsConfig){
            await this.recacheRepeatCurrentCountCached();
        }
    }

    ToStringDecimalIfSmall(f){
        if(Math.abs(f) < 1){
            return (Math.round(f * 100) / 100).toFixed(2);
        }
        if(Math.abs(f) < 10){
            return (Math.round(f * 10) / 10).toFixed(1);
        }
        return Math.round(f).toFixed(0);
    }

    static qualities =["awful","poor","normal","good","excellent","masterwork","legendary"];

    ToQualityString(min,max){
        if(min === 0 && max === 6){
            return "Any quality"
        }
        else if(min === max){
            return BillConfigForm.qualities[min] + " only";
        }
        else{
            return BillConfigForm.qualities[min] + " - "+ BillConfigForm.qualities[max];
        }
    }

    ingredientsOnRender(){
        
        let scrollContainer = this.element.querySelector("[id=ingredients-list]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }

        let ingredientToggles = this.element.getElementsByClassName("ingredient-icon");
        if(ingredientToggles){
            for(let i = 0; i < ingredientToggles.length; i++){
                ingredientToggles.item(i).addEventListener("click",this.onIngredientToggle.bind(this));
            }
        }

        let foldouts = this.element.getElementsByClassName("fold-out-icon");
        if(foldouts){
            for(let i = 0; i < foldouts.length; i++){
                foldouts.item(i).addEventListener("click",this.toggleFoldout.bind(this));
            }
        }
    }
    _preRender(context,options){
        this.cacheScrollPos();
        return super._preRender(context,options);
    }

    cacheScrollPos(){
        if(this.element){
            let scrollContainer = this.element.querySelector("[id=ingredients-list]");
            this.scrollTop = scrollContainer.scrollTop;
            this.scrollLeft = scrollContainer.scrollLeft;
        }
    }

    getIngredientTargetFromEvent(event){
        return event.currentTarget.closest(".ingredient-toggle");
    }

    onIngredientToggle(event){
        event.preventDefault();
        let ingredientTarget = this.getIngredientTargetFromEvent(event);
        let defName = ingredientTarget.dataset.def;
        let isCategory = ingredientTarget.dataset.category ? true : false;

        if(defName && isCategory){
            // toggle all things off if partally on
            let rootCategory = BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter.CategoryJson;
            let category = this.recursiveCategorySearch(defName,rootCategory);
            if(category){
                let allows = category.Allows;
                if(allows === 0){
                    category.Allows = 1;
                }
                else if(allows === 1){
                    category.Allows = 0;
                }
                else{
                    category.Allows = 1;
                }
                this.recursiveCategorySet(category,category.Allows == 0);
                this.render({force:true});
            }
        }
        else{
            let isFilter = ingredientTarget.dataset.filter ? true: false;
            let categoryDef = ingredientTarget.dataset.categoryDef;
            if(categoryDef){
                // search for category
                let rootCategory = BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter.CategoryJson;
                let category = this.recursiveCategorySearch(categoryDef,rootCategory);
                if(category){
                    if(isFilter){
                        let filterDef = category.SpecialFilterJsons.find((element)=>element.DefName == defName);
                        if(filterDef){
                            filterDef.Allows = !filterDef.Allows;
                            this.render({force:true});
                        }
                    }
                    else{
                        let thingDef = category.ThingJson.find((element)=>element.DefName == defName);
                        if(thingDef){
                            thingDef.Allows = !thingDef.Allows;
                            if(category.Allows == 1 && thingDef.Allows){
                                category.Allows = 2;
                            }
                            this.render({force:true});
                        }
                    }
                }
            }
            else{
                // in root
                if(isFilter){
                    let filterDef = BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter.SpecialFilterJsons.find((element)=>element.DefName == defName);
                    if(filterDef){
                        filterDef.Allows = !filterDef.Allows;
                        this.render({force:true});
                    }
                }
                else{
                    let category = BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter.CategoryJson;
                    let thingDef = category.ThingJson.find((element)=>element.DefName == defName);
                    if(thingDef){
                        thingDef.Allows = !thingDef.Allows;
                        this.render({force:true});
                    }
                }
            }
        }
    }

    toggleFoldout(event){
        event.preventDefault();
        let ingredientTarget = this.getIngredientTargetFromEvent(event);
        let categoryDefName = ingredientTarget.dataset.def;
        if(categoryDefName){
            // search for category
            let rootCategory = BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter.CategoryJson;
            let category = this.recursiveCategorySearch(categoryDefName,rootCategory);
            if(category){
                category.expanded = category.expanded ? false : true;
                this.render({force:true});
            }
        }
    }

    recursiveCategorySet(categoryParent,allowed){
        categoryParent.Allows = allowed ? 0 : 1;
        let things = categoryParent.ThingJson;
        if(things){
            for(let i = 0; i < things.length; i++){
                things[i].Allows = allowed;
            }
        }

        if(categoryParent.CategoryJson){
            for(let i = 0; i < categoryParent.CategoryJson.length; i++){
                if(categoryParent.CategoryJson[i].CategoryJson){
                    this.recursiveCategorySet(categoryParent.CategoryJson[i],allowed);
                }
            }
        }

    }

    recursiveCategorySearch(defName, categoryParent){
        let category = categoryParent.CategoryJson.find((element)=>element.DefName == defName);
        if(!category){
            for(let i = 0; i < categoryParent.CategoryJson.length; i++){
                if(categoryParent.CategoryJson[i]){
                    category = this.recursiveCategorySearch(defName,categoryParent.CategoryJson[i]);
                    if(category){
                        break;
                    }
                }
            }
        }
        return category;
    }

    GetFilter(){
        let ingredientsFilterRoot = BillConfigForm.billConfigData.IngredientsConfig.IngredientsFilter;
        let specialFilters= ingredientsFilterRoot.SpecialFilterJsons;
        let categories = ingredientsFilterRoot.CategoryJson;
        let filter = [];
        for(let i = 0; i < specialFilters.length; i++){
            let specialFilter = specialFilters[i];
            filter.push({DefName:specialFilter.DefName, Enabled:specialFilter.Allows, ThingDefOrSpecialFilter:true});
        }
        filter.push(...this.GetFilterFromCategories(categories));
        return filter;
    }

    GetFilterFromCategories(category){
        let filters = category.SpecialFilterJsons;
        let things = category.ThingJson;
        let categories = category.CategoryJson;

        let filter = [];
        for(let i = 0; i < filters.length; i++){
            let specialFilter = filters[i];
            filter.push({DefName:specialFilter.DefName, Enabled:specialFilter.Allows, ThingDefOrSpecialFilter:true});
        }
        for(let i = 0; i < things.length; i++){
            let thingDef = things[i];
            filter.push({DefName:thingDef.DefName, Enabled:thingDef.Allows, ThingDefOrSpecialFilter:true});
        }

        for(let i = 0; i < categories.length; i++){
            let category = categories[i];
            filter.push(...this.GetFilterFromCategories(category));
        }

        return filter;
    }

    static async #onICard(event, button){
        event.preventDefault();
        console.log(button.dataset.recipeDef);
        
        let thingDefInfo = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getThingStatCard",button.dataset.recipeDef));

        let info = new GenericStatCardSheet(thingDefInfo);
        info.render({force:true});
    }
}
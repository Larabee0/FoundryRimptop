import { WorkBillsController } from "./WorkBillsController.js";
import { DoubleSliderController } from "../PartialControllers/DoubleSliderController.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EditActivity extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "edit-activity",
        tag: "form",
        window:{
            title: "EditActivity.form.title",
            resizable:true
        },
        position: {
          width: 400,
          height: 450
        },
        actions:{
            
        }
    }

    static PARTS = {
        form: {
          id: "edit-activity",
          template: "systems/rimtop/templates/dialogue/edit-activity-sheet.hbs"
        }
    }

    get title(){
        return "Configure Activity";
    }
    
    min = 2;
    max = 4;
    weight = 0.25;

    static learningModes = ["Maintain skills","Focus specific skill","Learn random skills"]
    static selectedLearnMode = 0;

    static cachedSkillsForPawn = [];

    anySkills = false;
    actor;
    pawnId;
    activityType="Learning";

    workBillController;
    rangeController;

    closeAction;

    async _prepareContext(options){
        let context = {
            weight:this.weight,
            min: this.min,
            max: this.max,
            activityType:this.activityType,
            learningModes:EditActivity.learningModes,
            selectedLearnMode:EditActivity.selectedLearnMode,
            rangeMin:2,
            rangeMax:6
        };

        if(!this.rangeController){
            this.rangeController = new DoubleSliderController();
            this.rangeController.onAction = this.onChangeMinMaxDuration.bind(this);
        }
        

        if(this.activityType ==="Learning"){

            if(EditActivity.selectedLearnMode === 1 || EditActivity.selectedLearnMode === 2){
                if(Object.keys(EditActivity.cachedSkillsForPawn).length === 0){
                    EditActivity.cachedSkillsForPawn = JSON.parse(await CONFIG.HttpRequest.GetLearnSkillsFor(this.pawnId));
                }

                if(EditActivity.selectedLearnMode === 2){
                    let atLeastOneLearning = false;
                    let atLeastOneNotLearning = false;
                    for(let i = 0; i < EditActivity.cachedSkillsForPawn.length; i++){
                        if(EditActivity.cachedSkillsForPawn[i].Learning){
                            atLeastOneLearning = true;
                        }
                        else{
                            atLeastOneNotLearning = true;
                        }
                    }

                    this.anySkills = false;
                    if(atLeastOneLearning && !atLeastOneNotLearning){
                        this.anySkills = true;
                        for(let i = 0; i < EditActivity.cachedSkillsForPawn.length; i++){
                            EditActivity.cachedSkillsForPawn[i].Learning = false;
                        }
                    }
                    else if(!atLeastOneLearning && atLeastOneNotLearning){
                        this.anySkills = true;
                    }
                    context.anyValue = this.anySkills;
                }
                context.randomSkills = EditActivity.cachedSkillsForPawn;
            }
        }
        else if(this.activityType === "Work"){
            if(!this.workBillController){
                this.workBillController = new WorkBillsController(this.actor,this);
            }
            context = await this.workBillController._prepareContext(context);
        }

        

        console.log(context);
        return context;
    }

    
    async _preClose(){
        let downTimeData={
            ActivityType:this.activityType,
            ActivityWeight: String(this.weight),
            DurationMin:this.min,
            DurationMax:this.max,
            
        }

        let skillData = [];

        if(this.activityType ==="Learning"){
            downTimeData.LearnMode=parseInt(EditActivity.selectedLearnMode);
            if(EditActivity.selectedLearnMode === 1) {

                for(let i = 0; i < EditActivity.cachedSkillsForPawn.length; i++){
                    let element = EditActivity.cachedSkillsForPawn[i];
                    if(element.Specific){
                        skillData.push(element.DefName);
                        break;
                    }
                }
            }
            else if(EditActivity.selectedLearnMode === 2) {

                for(let i = 0; i < EditActivity.cachedSkillsForPawn.length; i++){
                    let element = EditActivity.cachedSkillsForPawn[i];
                    if(element.Learning){
                        skillData.push(element.DefName);
                    }
                }
            }
        }
        console.log(downTimeData);
        await CONFIG.HttpRequest.SetDownTimeActivityFor(this.pawnId,JSON.stringify(downTimeData),JSON.stringify(skillData));
        if(this.closeAction){
            this.closeAction();
        }

        EditActivity.cachedSkillsForPawn = [];
        return super._preClose();
    }

    _onRender(context,options){
        let rangeContainer = this.element.querySelector("[id=range-slider]");

        this.rangeController?._onRender(rangeContainer);


        if(this.activityType === "Work"){
            let curPos = this.position;
            curPos.width = 600;
            curPos.height = 800;
            this.setPosition(curPos);
        }
        let weightSlider = this.element.querySelector("[id=weight-slider]");
        if(weightSlider){
            weightSlider.addEventListener("change",this.onChangeWeight.bind(this));
        }
        let learnMode = this.element.querySelector("[name=learning-mode]");
        if(learnMode){
            learnMode.addEventListener("change",this.onChangeLearnMode.bind(this));
        }

        let randomSkillInputs = this.element.getElementsByClassName("random-skill-input");
        if(randomSkillInputs){
            for(let i= 0; i < randomSkillInputs.length;i++){
                randomSkillInputs.item(i).addEventListener("change",this.onChangeRandomSkill.bind(this));
            }
        }

        let specificSkillInputs = this.element.getElementsByClassName("specific-skill-input");
        if(specificSkillInputs){
            for(let i= 0; i < specificSkillInputs.length;i++){
                specificSkillInputs.item(i).addEventListener("change",this.onChangeSpecificSkill.bind(this));
            }
        }

        this.workBillController?._onRender(context,options);
    }

    onChangeMinMaxDuration(){
       this.min = this.rangeController.lowerValue;
       this.max = this.rangeController.upperValue;
       this.render();
    }

    onChangeWeight(event){
        
        event.preventDefault();
        this.weight = parseFloat(event.currentTarget.value);
        this.render();
    }

    onChangeLearnMode(event){
        event.preventDefault();
        EditActivity.selectedLearnMode = parseInt(event.currentTarget.value);
        this.render();
    }

    onChangeRandomSkill(event){
        event.preventDefault();
        if(event.currentTarget.id==="any"){
            if(event.currentTarget.checked && !this.anySkills){
                for(let i = 0; i < EditActivity.cachedSkillsForPawn.length; i++){
                    EditActivity.cachedSkillsForPawn[i].Learning = false;
                }
            }
            this.render();
        }
        else{
            EditActivity.cachedSkillsForPawn[event.currentTarget.dataset.index].Learning = event.currentTarget.checked;
            this.render();
        }
    }

    onChangeSpecificSkill(event){
        event.preventDefault();
        for(let i = 0; i < EditActivity.cachedSkillsForPawn.length; i++){
            EditActivity.cachedSkillsForPawn[i].Specific = false;
        }
        EditActivity.cachedSkillsForPawn[event.currentTarget.dataset.index].Specific = event.currentTarget.checked;
        this.render();
    }
}
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { StatCard } from "./StatCard.js";

export class GenericStatCardSheet extends HandlebarsApplicationMixin(ApplicationV2){
    static DEFAULT_OPTIONS = {
        id: "generic-stat-card",
        tag: "form",
        window:{
            icon: "fas fa-chart-simple",
            title: "GenericStatCardSheet.form.title",
            resizable:true
        },
        position: {
            width: 600,
            height: 600
        },
        actions:{
        }
    }

    static PARTS = {
        form: {
          id: "statCard",
          template: "systems/rimtop/templates/dialogue/generic-stat-card.hbs"
        }
    }

    statCardTabController;
    titleText="";

    constructor(thingData){
        super();
        if(!thingData){
            return;
        }
        
        if(Object.keys(thingData).length === 0){
            return;
        }
        this.statCardTabController = new StatCard(this,null,thingData);
        this.titleText = thingData.Title;
    }

    get title(){
        return this.titleText;
    }

    async _prepareContext(options){
        let context = {system:{}};
        context = this.statCardTabController?._prepareContextStatCard(context);
        return context;
    }

    _onRender(context,options){
        this.statCardTabController?.statCardOnRender();
    }
}
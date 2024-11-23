const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class TimeControls extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "time-controls",
        tag: "form",
        window:{
            icon: "fas fa-hourglass-clock",
            title: "TimeControls.form.title",
            resizable:true
        },
        position: {
          width: 430,
          height: 700
        },
        actions:{
            singleTick:TimeControls.#doSingleTick,
            singleSecond:TimeControls.#doSingleSecond,
            combatRound:TimeControls.#doCombatRound,
            refreshTime:TimeControls.#refresh,
            specificTicks:TimeControls.#doSpecificTicks,
            specificSeconds:TimeControls.#doSpecificSeconds,
            specificHours:TimeControls.#doSpecificHours,
            specificDays:TimeControls.#doSpecificDays,
            specificYears:TimeControls.#doSpecificYears,

            stopTime:TimeControls.#stopRunningTime,
            pauseTime:TimeControls.#pauseRunningTime,
            playTime:TimeControls.#playRunningTime,
            toggleCombat:TimeControls.#toggleCombat,

            clearCombatData:TimeControls.#clearCombatData
        }
    }

    // set the handle bars template to be rendered
    static PARTS = {
        form: {
          id: "timeControls",
          template: "systems/rimtop/templates/dialogue/time-control-sheet.hbs"
        }
    }

    // some how this links to the window title thing above, its just the window name.
    get title(){
        return "Time control"
    }

    static lastTimeData={};
    static lastToRunForTicks =0;
    static renderInterval;
    static firstRender = false;
    
    async _prepareContext(options){
        
        let context = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getTimeData"));

        if(Object.keys(TimeControls.lastTimeData).length > 0){
            context.timeData = TimeControls.lastTimeData;
            context.timeData.lastToRunForTicks = TimeControls.lastToRunForTicks;
            if(context.timeData.completed){
                clearInterval(TimeControls.renderInterval);
                TimeControls.renderInterval = null;
            }
        }
        else{
            clearInterval(TimeControls.renderInterval);
            TimeControls.renderInterval = null;
        }
        
        console.log(context);
        return context;
    }
    
    _onRender(context,options){
        
    }

    static HandleBackChannelTime(inData){
        console.log("back channel");
        let sseData=JSON.parse(inData);
        if(sseData.Completed){
            CONFIG.csInterOP.CloseEventSource();
            clearInterval(TimeControls.renderInterval);
            this.render();
        }
        let timeData = JSON.parse(sseData.Payload);
        timeData.completed =sseData.Completed;
        TimeControls.lastTimeData = timeData;
        if(TimeControls.firstRender){
            TimeControls.firstRender = false;
            this.render();
        }
    }
    async DoTicks(ticks){
        
        await CONFIG.csInterOP.SendHttpRequest("POST","doTicks",ticks.scientificToDecimal());
        TimeControls.lastToRunForTicks = ticks;
        CONFIG.csInterOP.TimeControlsEventSource(TimeControls.HandleBackChannelTime.bind(this));
        await CONFIG.csInterOP.SendHttpRequest("POST","setTickRun",String(true));
        TimeControls.renderInterval=setInterval(this.render.bind(this),1000);
        TimeControls.firstRender = true;
    }

    static async #doSingleTick(event,button){
        event.preventDefault();
        await this.DoTicks(1);
    }

    static async #doSingleSecond(event,button){
        event.preventDefault();
        await this.DoTicks(60);
    }

    static async #doCombatRound(event,button){
        event.preventDefault();
        await this.DoTicks(360);
    }

    static async #doSpecificTicks(event,button){
        event.preventDefault();
        let raw = parseInt(this.element.querySelector("[id=specific-ticks]").value);
        if(isNaN(raw)){
            this.render();
        }
        let ticks = raw;


        if(ticks > 60){

            const proceed = await foundry.applications.api.DialogV2.confirm({
                content: "Are you sure you want to pass " + raw + "ticks?",
                rejectClose: false,
                modal: true
            });
            if (proceed){
                await this.DoTicks(ticks);
            }
            else{
                this.render();
            }
        }
        else{
            await this.DoTicks(ticks);
        }
    }

    static async #doSpecificSeconds(event,button){
        event.preventDefault();
        let raw = parseFloat(this.element.querySelector("[id=specific-seconds]").value);
        if(isNaN(raw)){
            this.render();
        }

        let ticks = Math.floor(raw * 60);

        if(ticks > 2500){

            const proceed = await foundry.applications.api.DialogV2.confirm({
                content: "Are you sure you want to pass " + raw + "seconds?<br>"+ticks+" ticks will be performed.",
                rejectClose: false,
                modal: true
            });
            if (proceed){
                await this.DoTicks(ticks);
            }
            else{
                this.render();
            }
        }
        else{
            await this.DoTicks(ticks);
        }
    }

    static async #doSpecificHours(event,button){
        event.preventDefault();
        let raw = parseFloat(this.element.querySelector("[id=specific-hours]").value);
        if(isNaN(raw)){
            this.render();
        }


        let ticks = Math.floor(raw * 2500);

        if(ticks > 60000){

            const proceed = await foundry.applications.api.DialogV2.confirm({
                content: "Are you sure you want to pass " + raw + "hours?<br>"+ticks+" ticks will be performed.",
                rejectClose: false,
                modal: true
            });
            if (proceed){
                await this.DoTicks(ticks);
            }
            else{
                this.render();
            }
        }
        else{
            await this.DoTicks(ticks);
        }
        

    }

    static async #doSpecificDays(event,button){
        event.preventDefault();
        let raw = parseFloat(this.element.querySelector("[id=specific-days]").value);
        if(isNaN(raw)){
            this.render();
        }

        let ticks = Math.floor(raw * 60000);

        const proceed = await foundry.applications.api.DialogV2.confirm({
            content: "Are you sure you want to pass " + raw + "days?<br>"+ticks+" ticks will be performed.",
            rejectClose: false,
            modal: true
        });
        if (proceed){
            await this.DoTicks(ticks);
        }
        else{
            this.render();
        }
    }

    static async #doSpecificYears(event,button){
        event.preventDefault();
        let raw = parseFloat(this.element.querySelector("[id=specific-years]").value);
        if(isNaN(raw)){
            this.render();
        }

        let ticks = Math.floor(raw * 3600000);

        const proceed = await foundry.applications.api.DialogV2.confirm({
            content: "Are you sure you want to pass " + raw + "years?<br>"+ticks+" ticks will be performed.",
            rejectClose: false,
            modal: true
        });
        if (proceed){
            await this.DoTicks(ticks);
        }
        else{
            this.render();
        }
    }

    static async #stopRunningTime(event,button){
        event.preventDefault();
        console.log("cancel");
        await CONFIG.csInterOP.SendHttpRequest("POST","doTicks",String(1));
        await CONFIG.csInterOP.SendHttpRequest("POST","setTickRun",String(true));
        TimeControls.firstRender = true;
        clearInterval(TimeControls.renderInterval);

    }

    static async #pauseRunningTime(event,button){
        event.preventDefault();
        console.log("pause");
        await CONFIG.csInterOP.SendHttpRequest("POST","setTickPause",String(true));
        TimeControls.firstRender = true;

    }

    static async #playRunningTime(event,button){
        event.preventDefault();
        console.log("play");
        await CONFIG.csInterOP.SendHttpRequest("POST","setTickPause",String(false));
        TimeControls.firstRender = true;
        
    }

    static #refresh(event,button){
        event.preventDefault();
        this.render();
    }

    static async #toggleCombat(event,button){
        event.preventDefault();
        await CONFIG.csInterOP.SendHttpRequest("POST","setCombatMode",String(button.checked));

        this.render();
    }

    static async #clearCombatData(event, button){
        
        event.preventDefault();
        await CONFIG.csInterOP.SendHttpRequest("POST","clearCombatData");
    }
}

export class TokenRimTop extends Token {
    
    async _onHoverIn(event,options){
        //super._onHoverIn(event,options);
        let actorSelf = this.document.actor;
        let selectedActor = this.getSingletonSelectedActor();
        if(selectedActor != null)
        {
            let result = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getInstantHitChance",selectedActor.system.thingID, actorSelf.system.thingID));
            
            const right = window.innerWidth - Math.ceil(this.worldTransform.tx - 8);
            const top = Math.floor(this.worldTransform.ty - 8);
            game.tooltip.constructor.LOCKED_TOOLTIP_BUFFER_PX = 200;
            game.tooltip.createLockedTooltip({right:right+"px",top:top+"px"},result.Tooltip);
            
        }
    }

    
    
    _onHoverOut(event,options){
        super._onHoverOut(event,options);
        game.tooltip.constructor.LOCKED_TOOLTIP_BUFFER_PX = 50;
        game.tooltip.dismissLockedTooltips();
    }

    async _onClickRight(event){
        let actorSelf = this.document.actor;
        let selectedActor = this.getSingletonSelectedActor();

        if(selectedActor == null)
        {
            super._onClickRight(event);
        }
        else{
            //console.log("Selected actor",selectedActor,"right clickedActor",actorSelf);
            event.preventDefault();
            event.stopPropagation();
            let result = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","doAttack",selectedActor.system.thingID, actorSelf.system.thingID));
            //console.log(result);
            if(selectedActor.type==="pawn"){
              await selectedActor.updateCombat();
            }
            if(actorSelf.type==="pawn"){
              await actorSelf.updateStats();
              await actorSelf.updateHealthSummary();
              await actorSelf.updateHediffList();
              await actorSelf.updateNeeds();
              await actorSelf.updateCombat();
            }
            else if (actorSelf.type==="thing"){
              await actorSelf.updateStats();
            }

            let chatData ={
                user:game.user._id,
                speaker:ChatMessage.getSpeaker({ actor: selectedActor.actor, token: selectedActor.token }),
                content: `<label data-tooltip="${result.Tooltip}" data-tooltip-direction="RIGHT">
                ${result.Label}
                </label>`
            };


            await ChatMessage.create(chatData);
        }
    }

    _onRelease(options){
        super._onRelease(options);        
        game.tooltip.constructor.LOCKED_TOOLTIP_BUFFER_PX = 50;
        game.tooltip.dismissLockedTooltips();
    }

    getSingletonSelectedActor(){
        
        let actorSelf = this.document.actor;
        let controlled = TokenLayer.instance.controlled;
        if(controlled.length == 1
            &&"document" in controlled[0]
            && "actor" in controlled[0].document
            && actorSelf._id !== controlled[0].document.actor._id)
        {
            return controlled[0].document.actor;
        }

        return null;
    }
}
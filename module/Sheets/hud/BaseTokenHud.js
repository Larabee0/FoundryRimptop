export class BaseTokenHUD extends TokenHUD{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "token-hud",
      template: "systems/rimtop/templates/hud/BaseTokenHUD.hbs"
    });
  }
  
  tokenControlsAction = false;
  showCover = false;

  getData(options={}){
    let data = super.getData(options);
    
    const token = this.object;
    let showUpdateInitative= false;
    let cover = 0;
    let actor = game.actors.get(token.document.actorId);
    let showCover = true;
    if(actor.type === "thing"){
      showCover = false;
    }

    if(this.document.actorLink){
      console.log(actor);
      if("combatCard" in actor.system && "Cover" in actor.system.combatCard){
        cover = actor.system.combatCard.Cover;
      }
      showUpdateInitative = actor.inCombat && actor.isCurrentTurn();
    }

    data = foundry.utils.mergeObject(data,{
      showCover: showCover,
      spawnClass: this.document.actorLink ? "active" : "",
      showTokenControls: this.tokenControlsAction ? "active" : "",
      showCoverControls: this.showCover ? "active" : "",
      showEndTurn: showUpdateInitative
    });
    let coverData = this.getCoverActive(cover);
    data = foundry.utils.mergeObject(data,coverData);
    return data;
  }

  getCoverActive(cover){
    switch(cover){
      case 25:
        return {quarterCover:"active",hasCover:"active"};
      case 50:
        return {halfCover:"active",hasCover:"active"};
      case 75:
        return {threeQuarterCover:"active",hasCover:"active"};
      case 100:
        return {fullCover:"active",hasCover:"active"};
      default:
        return {noCover:"active"};
    }
  }

  _onClickControl(event){
    super._onClickControl(event);
    if ( event.defaultPrevented ) return;
    const button = event.currentTarget;
    switch ( button.dataset.action ) {
      case "set-spawned":
        return this.#onToggleSpawn(event);
      case "push-initative":
        return this.#onPushinitative(event);
      case "toggle-token-controls":
        return this.#onToggleTokenControls(event);
      case "toggle-cover-controls":
        return this.#onToggleCoverControls(event);
      case "set-cover":
        return this.#onSetCover(event);
      case "wait-action":
        return this.#onWaitAction(event);
    }
  }

  async #onToggleSpawn(event) {
    event.preventDefault();
    const token = this.object;
    return token.document.update({actorLink: !token.document.actorLink});
  }

  async #onPushinitative(event){
    event.preventDefault();
    const token = this.object;
    if(this.document.actorLink){
      let actor = game.actors.get(token.document.actorId);
      if(actor.inCombat && actor.isCurrentTurn()){
        game.combat.refreshCombatantInitativeByToken(token.id);
        return this.render();
      }
    }
  }
  async #onToggleTokenControls(event){
    event.preventDefault();
    this.tokenControlsAction = !this.tokenControlsAction;
    this.showCover = false;
    return this.render();
  }
  async #onToggleCoverControls(event){
    event.preventDefault();
    this.showCover = !this.showCover;
    this.tokenControlsAction = false;
    return this.render();
  }
  async #onSetCover(event){
    event.preventDefault();
    let cover = event.currentTarget.dataset.cover
    
    const token = this.object;
    if(this.document.actorLink){
      let actor = game.actors.get(token.document.actorId);
      if(actor.type =="pawn"){
        await actor.setCover(cover);
        return this.render();
      }
    }
  }
  async #onWaitAction(event){
    event.preventDefault();
    
    const token = this.object;
    if(this.document.actorLink){
      let waitType = event.currentTarget.dataset.waitType;
      let actor = game.actors.get(token.document.actorId);
      if(actor.type =="pawn"){
        
        switch(waitType){
          case "turn":
            await actor.waitRestOfTurnTicks();
            await actor.updateCombat();
            return this.render();
          
          case "custom":
            await  actor.customWait();
            await actor.updateCombat();
            return this.render();

          default:
            await actor.wait30Ticks();
            await actor.updateCombat();
            return this.render();
        }
      }
    }

  }
}
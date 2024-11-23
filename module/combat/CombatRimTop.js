export class CombatRimTop extends Combat{

  async startCombat(){
    await this.setupTurns();
    if(game.user.isGM){
      await CONFIG.csInterOP.SendHttpRequest("POST","setCombatMode",String(true));
    }
    return super.startCombat();
  }

  async endCombat(){
    return Dialog.confirm({
      title: game.i18n.localize("COMBAT.EndTitle"),
      content: `<p>${game.i18n.localize("COMBAT.EndConfirmation")}</p>`,
      yes: async() =>
        {
          await CONFIG.csInterOP.SendHttpRequest("POST","setCombatMode",String(false));
          this.delete();
        }
    });
  }

  async _onStartTurn(combatant){
    if(combatant.actor && combatant.actor.type === "pawn"){
      console.log("startTurn",combatant.actor.name);
      // if(JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","startTurn",combatant.actor.system.thingID))){
      //   await combatant.actor.updateCombat();
      // }
    }
  }

  async _onEndTurn(combatant){
    if(combatant.actor && combatant.actor.type === "pawn"){
      console.log("endTurn",combatant.actor.name);
      // if(JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","endTurn",combatant.actor.system.thingID))){
      //   await combatant.actor.updateCombat();
      // }
      
    }
  }

  async rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {
  
    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant?.id;
    const chatRollMode = game.settings.get("core", "rollMode");
  
    // Iterate over Combatants, performing an initiative roll for each
    const updates = [];
    const messages = [];
    for ( let [i, id] of ids.entries() ) {
    
      // Get Combatant data (non-strictly)
      const combatant = this.combatants.get(id);
      if ( !combatant?.isOwner ) continue;
    
      // Produce an initiative roll for the Combatant
      const roll = await combatant.getInitiativeRoll(formula);
      await roll.evaluate();
      updates.push({_id: id, initiative: roll.total});
    
      // Construct chat message data
      let messageData = foundry.utils.mergeObject({
        speaker: ChatMessage.getSpeaker({
          actor: combatant.actor,
          token: combatant.token,
          alias: combatant.name
        }),
        flavor: game.i18n.format("COMBAT.RollsInitiative", {name: combatant.name}),
        flags: {"core.initiativeRoll": true}
      }, messageOptions);
      const chatData = await roll.toMessage(messageData, {create: false});
    
      // If the combatant is hidden, use a private roll unless an alternative rollMode was explicitly requested
      chatData.rollMode = "rollMode" in messageOptions ? messageOptions.rollMode
        : (combatant.hidden ? CONST.DICE_ROLL_MODES.PRIVATE : chatRollMode );
    
      // Play 1 sound for the whole rolled set
      if ( i > 0 ) chatData.sound = null;
      messages.push(chatData);
    }
    if ( !updates.length ) return this;
  
    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", updates);
  
    // Ensure the turn order remains with the same combatant
    if ( updateTurn && currentId ) {
      await this.update({turn: this.turns.findIndex(t => t.id === currentId)});
    }
  
    // Create multiple chat messages
    await ChatMessage.implementation.create(messages);
    return this.update({turn: 0});
  }

  

  async nextTurn(){
    let combatant = this.combatant;
    await combatant.updateInitiative();
    
    //console.log(this);
    
    if(game.user.isGM){
      let serializedCombatants = JSON.stringify(this.getCombatantIds());
      let shouldStartNextRound = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","checkNextRound",serializedCombatants));
      if(shouldStartNextRound){
        await CONFIG.csInterOP.DoTurnCycle();
        await CONFIG.csInterOP.SendHttpRequest("POST","nextRound",serializedCombatants)
        await this.nextRound();
      }
    }
    return this.update({turn: 0});
  }

  async nextRound(){
    await this.resetAll();
    await this.refreshAllInitative();
    await this.refreshAllCombatants();
    return super.nextRound();
  }


  getCombatantIds(){
    let combatants = this.turns;
    let thingIds = [];
    for(let i = 0; i < combatants.length; i++){
      thingIds.push(combatants[i].actor.system.thingID);
    }
    return thingIds;
  }

  async refreshAllCombatants(){
    let combatants = this.turns;
    for(let i = 0; i < combatants.length; i++){
      await combatants[i].actor.updateCombat();
    }
  }

  async refreshAllInitative(){
    let combatants = this.turns;
    for(let i = 0; i < combatants.length; i++){
      await combatants[i].updateInitiative();
    }
  }

  async refreshCombatantInitativeByActorId(actorId){
    let combatants = this.getCombatantsByActor(actorId);
    for(let i = 0; i < combatants.length; i++){
      await combatants[i].updateInitiative();
    }
  }
  async refreshCombatantInitativeByToken(tokenId){
    let combatants = this.getCombatantsByToken(tokenId);
    for(let i = 0; i < combatants.length; i++){
      await combatants[i].updateInitiative();
    }
  }
}
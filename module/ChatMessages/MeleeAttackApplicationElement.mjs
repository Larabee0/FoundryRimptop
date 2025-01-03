import ChatTrayElement from "./ChatTrayElement.mjs";
import TargetedApplicationMixin from "./TargetedApplicationMixin.mjs";

export default class MeleeAttackApplicationElement extends TargetedApplicationMixin(ChatTrayElement) {

    chatMessage;

    meleeAttackThingId = "";

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  connectedCallback() {
    // Fetch the associated chat message
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if ( !this.chatMessage ) return;

    // Build the frame HTML only once
    if ( !this.targetList ) {
      const div = document.createElement("div");
      div.classList.add("card-tray", "damage-tray", "collapsible");
      if ( !this.open ) div.classList.add("collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-swords"></i>
          <span>Melee attack</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
          </div>
        </div>
      `;
      this.replaceChildren(div);
      div.querySelector(".wrapper").prepend(...this.buildTargetContainer());
      div.addEventListener("click", this._handleClickHeader.bind(this));
    }

    this.targetingMode = this.targetSourceControl.hidden ? "selected" : "targeted";
  }

  async buildTargetsList(){
    if ( !this.targetList ) throw new Error("Must create a element to contain the target list.");
    const targetedTokens = new Map();
    switch ( this.targetingMode ) {
      case "targeted":
        this.chatMessage?.getFlag("rimtop", "targets")?.forEach(t => targetedTokens.set(t.uuid, t.name));
        break;
      case "selected":
        canvas.tokens?.controlled?.forEach(t => targetedTokens.set(t.actor.uuid, t.name));
        break;
    }
    
    if(this.chatMessage.speaker.actor && this.chatMessage.speaker.token){
          
      let instigatorToken = ChatMessage.getSpeakerActor(this.chatMessage.speaker).getActiveTokens(false,true).find((element)=>element._id === this.chatMessage.speaker.token);
      if(instigatorToken){
        let actors = Array.from(targetedTokens.keys());
        for(let i = 0; i < actors.length;i++){

          let actor = fromUuidSync(actors[i])
          let token = actor.token;
          if(!token){
            token = this.getAnyTokenFromActor(actor);
          }
          if(token){
            if(!instigatorToken.isAdjacentTo(token)){
              targetedTokens.delete(actors[i]);
            }
          }
        }
      }
    }
    
    let actors = Array.from(targetedTokens.keys());
    if(actors.length > 0){
      let targetThingIds = [];
      for(let i = 0; i < actors.length; i++){
        let actor = fromUuidSync(actors[i]);
        targetThingIds.push(actor.system.thingID);
      }

      let hitChances =  JSON.parse(await CONFIG.HttpRequest.GetInstantMeleeHitChance(JSON.stringify(targetThingIds),ChatMessage.getSpeakerActor(this.chatMessage.speaker).system.thingID));
      for(let i = 0; i < actors.length; i++){
        targetedTokens.set(actors[i], {name: targetedTokens.get(actors[i]), hitChance: hitChances[i]});
      }
  }
    const targets = Array.from(targetedTokens.entries())
      .map(([uuid, name]) => this.buildTargetListEntry({ uuid, name }))
      .filter(t => t);
    if ( targets.length ) this.targetList.replaceChildren(...targets);
    else {
      const li = document.createElement("li");
      li.classList.add("none");
      li.innerText = game.i18n.localize(`None ${this.targetingMode}`);
      this.targetList.replaceChildren(li);
    }
  }

  getAnyTokenFromActor(actor){
    let tokens = actor.getActiveTokens(false,true);
    if(tokens.length > 0){
      return tokens[0];
    }
    return null;
  }

  /* -------------------------------------------- */

  /** @override */
  buildTargetListEntry({ uuid, name }) {
    const actor = fromUuidSync(uuid);
    if ( !actor?.isOwner ) return;

    const li = document.createElement("li");
    li.classList.add("target");
    li.dataset.targetUuid = uuid;
    li.innerHTML = `
      <img class="gold-icon" alt="${name.name}" src="${actor.img}">
      <button class="name-stacked apply-damage" type="button">
        <span class="title"><b>${name.hitChance}</b>  ${name.name}</span>
      </button>
    `;


    li.addEventListener("click", this._onChangeOptions.bind(this));

    return li;
  }



  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  async attackTarget(uuid){
    const token = fromUuidSync(uuid);
    let instigator = ChatMessage.getSpeakerActor(this.chatMessage.speaker);
    if(!instigator){
      return;
    }
    let result = JSON.parse(await CONFIG.HttpRequest.DoAttack(instigator.system.thingID, token.system.thingID));
    if(instigator.type==="pawn"){
      await instigator.updateCombat();
    }
    if(token.type==="pawn"){
      await token.updateStats();
      await token.updateHealthSummary();
      await token.updateHediffList();
      await token.updateNeeds();
      await token.updateCombat();
    }
    else if (token.type==="thing"){
      await token.updateStats();
    }
    await this.chatMessage.setFlag("rimtop","Consumed",true);
    if(result.length > 0){
      let label =result[0].Label;
      let tooltip = result[0].Tooltip;
      this.chatMessage._source.content
      this.chatMessage.update({content:`
        ${this.chatMessage._source.content}
        
      <label data-tooltip="${tooltip}" data-tooltip-direction="RIGHT">
        <br><br>${label}
      </label>
        `});
    }
    this.open = false;
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking a multiplier button or resistance toggle.
   * @param {PointerEvent} event  Triggering click event.
   */
  async _onChangeOptions(event) {
    event.preventDefault();
    const uuid = event.target.closest("[data-target-uuid]")?.dataset.targetUuid;
    await this.attackTarget(uuid);
  }
}
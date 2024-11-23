export default class ChatMessageRimTop extends ChatMessage {

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */
  
    /**
     * The currently highlighted token for attack roll evaluation.
     * @type {BaseToken|null}
     */
    _highlighted = null;
  
    /* -------------------------------------------- */
  
    /**
     * Should the apply damage options appear?
     * @type {boolean}
     */
    get canApplyDamage() {

      return false;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Should the select targets options appear?
     * @type {boolean}
     */
    get canSelectTargets() {
      
      return false;
    }
  
    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */
  
    /** @inheritDoc */
    prepareData() {
      super.prepareData();
    }
  
    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */
  
    /** @inheritDoc */
    async getHTML(...args) {
      const html = await super.getHTML();
  
      this._displayChatActionButtons(html);

      //if ( game.settings.get("dnd5e", "autoCollapseItemCards") ) {
        if ( true) {
        html.find(".description.collapsible").each((i, el) => el.classList.add("collapsed"));
      }
  
      this._enrichChatCard(html[0]);
      this._collapseTrays(html[0]);
      //this._activateActivityListeners(html[0]);
      
  
      return html;
    }
  
    /* -------------------------------------------- */
    // disabled
    /**
     * Handle collapsing or expanding trays depending on user settings.
     * @param {HTMLElement} html  Rendered contents of the message.
     */
    _collapseTrays(html) {
      let collapse;
      //switch ( game.settings.get("dnd5e", "autoCollapseChatTrays") ) {
      switch ( "always") {
        case "always": collapse = true; break;
        case "never": collapse = false; break;
        // Collapse chat message trays older than 5 minutes
        case "older": collapse = this.timestamp < Date.now() - (5 * 60 * 1000); break;
      }
      for ( const tray of html.querySelectorAll(".card-tray, .effects-tray") ) {
        tray.classList.toggle("collapsed", collapse);
      }
      for ( const element of html.querySelectorAll("melee-attack-application, effect-application") ) {
        element.toggleAttribute("open", !collapse);
      }
    }
  
    /* -------------------------------------------- */
    // disabled
    /**
     * Optionally hide the display of chat card action buttons which cannot be performed by the user
     * @param {jQuery} html     Rendered contents of the message.
     * @protected
     */
    _displayChatActionButtons(html) {
      const chatCard = html.find(".dnd5e.chat-card, .dnd5e2.chat-card");
      if ( chatCard.length > 0 ) {
        const flavor = html.find(".flavor-text");
        if ( flavor.text() === html.find(".item-name").text() ) flavor.remove();
  
        if ( this.shouldDisplayChallenge ) chatCard[0].dataset.displayChallenge = "";
  
        const actor = game.actors.get(this.speaker.actor);
        const isCreator = game.user.isGM || actor?.isOwner || (this.author.id === game.user.id);
        for ( const button of html[0].querySelectorAll(".card-buttons button") ) {
          if ( button.dataset.visibility === "all" ) continue;
  
          // GM buttons should only be visible to GMs, otherwise button should only be visible to message's creator
          if ( ((button.dataset.visibility === "gm") && !game.user.isGM) || !isCreator) button.hidden = true;
        }
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Augment the chat card markup for additional styling.
     * @param {HTMLElement} html  The chat card markup.
     * @protected
     */
    _enrichChatCard(html) {
      // Header matter
      const actor = this.getAssociatedActor();
  
      let img;
      let nameText;
      if ( this.isContentVisible ) {
        img = actor?.img ?? this.author.avatar;
        nameText = this.alias;
      } else {
        img = this.author.avatar;
        nameText = this.author.name;
      }
  
      const avatar = document.createElement("a");
      avatar.classList.add("avatar");
      if ( actor ) avatar.dataset.uuid = actor.uuid;
      avatar.innerHTML = `<img src="${img}" alt="${nameText}">`;
  
      const name = document.createElement("span");
      name.classList.add("name-stacked");
      name.innerHTML = `<span class="title">${nameText}</span>`;
  
      const subtitle = document.createElement("span");
      subtitle.classList.add("subtitle");
      if ( this.whisper.length ) subtitle.innerText = html.querySelector(".whisper-to")?.innerText ?? "";
      if ( (nameText !== this.author?.name) && !subtitle.innerText.length ) subtitle.innerText = this.author?.name ?? "";
  
      name.appendChild(subtitle);
  
      const sender = html.querySelector(".message-sender");
      sender?.replaceChildren(avatar, name);
      html.querySelector(".whisper-to")?.remove();
  
      // Context menu
      const metadata = html.querySelector(".message-metadata");
      const deleteButton = metadata.querySelector(".message-delete");
      if ( !game.user.isGM ) deleteButton?.remove();
      const anchor = document.createElement("a");
      anchor.setAttribute("aria-label", "Additional controls");
      anchor.classList.add("chat-control");
      anchor.dataset.contextMenu = "";
      anchor.innerHTML = '<i class="fas fa-ellipsis-vertical fa-fw"></i>';
      metadata.appendChild(anchor);
  

      
      // Targeting roll applications
      if ( this.isContentVisible && (game.user.isGM || actor?.isOwner || (this.author.id === game.user.id)) && !this.getFlag("rimtop","Consumed")&& this.getFlag("rimtop","ThingId")) {
        if (this.getFlag("rimtop","Melee") ) {
          const meleeAttackApp = document.createElement("melee-attack-application");
          meleeAttackApp.classList.add("dnd5e2");
          meleeAttackApp.meleeAttackThingId = this.getFlag("rimtop","ThingId");
          html.querySelector(".message-content").appendChild(meleeAttackApp);
        }
        else if(this.getFlag("rimtop","Ranged")){

          const rangedAttackApp = document.createElement("ranged-attack-application");
          rangedAttackApp.classList.add("dnd5e2");
          rangedAttackApp.rangedAttackThingId = this.getFlag("rimtop","ThingId");
          html.querySelector(".message-content").appendChild(rangedAttackApp);
        }

      }
  
      avatar.addEventListener("click", this._onTargetMouseDown.bind(this));
      avatar.addEventListener("pointerover", this._onTargetHoverIn.bind(this));
      avatar.addEventListener("pointerout", this._onTargetHoverOut.bind(this));
    }
  
  
    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */
  
    /**
     * This function is used to hook into the Chat Log context menu to add additional options to each message
     * These options make it easy to conveniently apply damage to controlled tokens based on the value of a Roll
     *
     * @param {HTMLElement} html    The Chat Message being rendered
     * @param {object[]} options    The Array of Context Menu options
     *
     * @returns {object[]}          The extended options Array including new context choices
     */
    static addChatMessageContextOptions(html, options) {
      const canTarget = ([li]) => game.messages.get(li.dataset.messageId)?.canSelectTargets;
      options.push(
        {
          name: "DND5E.ChatContextSelectHit",
          icon: '<i class="fas fa-bullseye"></i>',
          condition: canTarget,
          callback: ([li]) => game.messages.get(li.dataset.messageId)?.selectTargets(li, "hit"),
          group: "attack"
        },
        {
          name: "DND5E.ChatContextSelectMiss",
          icon: '<i class="fas fa-bullseye"></i>',
          condition: canTarget,
          callback: ([li]) => game.messages.get(li.dataset.messageId)?.selectTargets(li, "miss"),
          group: "attack"
        }
      );
      return options;
    }
    
  
    /* -------------------------------------------- */
  
    /**
     * Handle target selection and panning.
     * @param {Event} event   The triggering event.
     * @returns {Promise}     A promise that resolves once the canvas pan has completed.
     * @protected
     */
    async _onTargetMouseDown(event) {
      event.stopPropagation();
      const uuid = event.currentTarget.dataset.uuid;
      const actor = fromUuidSync(uuid);
      const token = actor?.token?.object ?? actor?.getActiveTokens()[0];
      if ( !token || !actor.testUserPermission(game.user, "OBSERVER")) return;
      const releaseOthers = !event.shiftKey;
      if ( token.controlled ) token.release();
      else {
        token.control({ releaseOthers });
        return canvas.animatePan(token.center);
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle hovering over a target in an attack roll message.
     * @param {Event} event     Initiating hover event.
     * @protected
     */
    _onTargetHoverIn(event) {
      const uuid = event.currentTarget.dataset.uuid;
      const actor = fromUuidSync(uuid);
      const token = actor?.token?.object ?? actor?.getActiveTokens()[0];
      if ( token && token.isVisible ) {
        if ( !token.controlled ) token._onHoverIn(event, { hoverOutOthers: true });
        this._highlighted = token;
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle hovering out of a target in an attack roll message.
     * @param {Event} event     Initiating hover event.
     * @protected
     */
    _onTargetHoverOut(event) {
      if ( this._highlighted ) this._highlighted._onHoverOut(event);
      this._highlighted = null;
    }
  
  
    /* -------------------------------------------- */
  
    /**
     * Select the hit or missed targets.
     * @param {HTMLElement} li    The chat entry which contains the roll data.
     * @param {string} type       The type of selection ('hit' or 'miss').
     */
    selectTargets(li, type) {
      
      if ( !canvas?.ready ) return;
      const lis = li.closest("[data-message-id]").querySelectorAll(`.evaluation li.target.${type}`);
      const uuids = new Set(Array.from(lis).map(n => n.dataset.uuid));
      canvas.tokens.releaseAll();
      uuids.forEach(uuid => {
        const actor = fromUuidSync(uuid);
        if ( !actor ) return;
        const tokens = actor.isToken ? [actor.token?.object] : actor.getActiveTokens();
        for ( const token of tokens ) {
          if ( token?.isVisible && actor.testUserPermission(game.user, "OWNER") ) {
            token.control({ releaseOthers: false });
          }
        }
      });
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle rendering a chat popout.
     * @param {ChatPopout} app  The ChatPopout Application instance.
     * @param {jQuery} html     The rendered Application HTML.
     */
    static onRenderChatPopout(app, [html]) {
      const close = html.querySelector(".header-button.close");
      close.innerHTML = '<i class="fas fa-times"></i>';
      close.dataset.tooltip = "Close";
      close.setAttribute("aria-label", close.dataset.tooltip);
      html.querySelector(".message-metadata [data-context-menu]")?.remove();
    }
  
    /* -------------------------------------------- */
  
    /**
     * Wait to apply appropriate element heights until after the chat log has completed its initial batch render.
     * @param {jQuery} html  The chat log HTML.
     */
    static onRenderChatLog([html]) {
      //if ( !game.settings.get("rimtop", "autoCollapseItemCards") ) {
      if ( true ) {
        requestAnimationFrame(() => {
          // FIXME: Allow time for transitions to complete. Adding a transitionend listener does not appear to work, so
          // the transition time is hard-coded for now.
          setTimeout(() => ui.chat.scrollBottom(), 250);
        });
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Listen for shift key being pressed to show the chat message "delete" icon, or released (or focus lost) to hide it.
     */
    static activateListeners() {
      window.addEventListener("keydown", this.toggleModifiers, { passive: true });
      window.addEventListener("keyup", this.toggleModifiers, { passive: true });
      window.addEventListener("blur", () => this.toggleModifiers({ releaseAll: true }), { passive: true });
    }

    /* -------------------------------------------- */

    /**
     * Toggles attributes on the chatlog based on which modifier keys are being held.
     * @param {object} [options]
     * @param {boolean} [options.releaseAll=false]  Force all modifiers to be considered released.
     */
    static toggleModifiers({ releaseAll=false }={}) {
      document.querySelectorAll(".chat-sidebar > ol").forEach(chatlog => {
        for ( const key of Object.values(KeyboardManager.MODIFIER_KEYS) ) {
          if ( game.keyboard.isModifierActive(key) && !releaseAll ) chatlog.dataset[`modifier${key}`] = "";
          else delete chatlog.dataset[`modifier${key}`];
        }
      });
    }
  
    /* -------------------------------------------- */
    /*  Socket Event Handlers                       */
    /* -------------------------------------------- */
  
    /** @inheritDoc */
    _onDelete(options, userId) {
      super._onDelete(options, userId);
    }
  
    /* -------------------------------------------- */
    /*  Helpers                                     */
    /* -------------------------------------------- */
  
    /* -------------------------------------------- */
  
    /**
     * Get the Actor which is the author of a chat card.
     * @returns {Actor|void}
     */
    getAssociatedActor() {
      if ( this.speaker.scene && this.speaker.token ) {
        const scene = game.scenes.get(this.speaker.scene);
        const token = scene?.tokens.get(this.speaker.token);
        if ( token ) return token.actor;
      }
      return game.actors.get(this.speaker.actor);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Get the original chat message from which this message was created. If no originating message exists,
     * will return this message.
     * @type {ChatMessageRimTop}
     */
    getOriginatingMessage() {
        console.error("get Originating Message still looking for dnd5e stuff which it won't find.");
      return game.messages.get(this.getFlag("rimtop", "originatingMessage")) ?? this;
    }
  
  }
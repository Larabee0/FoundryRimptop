import {rimtop} from "./module/config.js";
import { CSInterOp } from "./module/CS/CSInterOp.js";
import { BaseToken } from "./module/Token/BaseToken.js";
import { TokenRimTop } from "./module/Token/TokenRimTop.js";
import { BaseTokenHUD } from "./module/Sheets/hud/BaseTokenHud.js";
import { BaseActorSheet } from "./module/Sheets/BaseActorSheet.js";
import { PawnActorSheet } from "./module/Sheets/PawnActorSheetParts/PawnActorSheet.js";
import { ThingDataModel } from "./module/DataModel/ThingDataModel.js";
import { PawnDataModel } from "./module/DataModel/PawnDataModel.js";
import { ActorThing } from "./module/actor/ActorThing.js";
import { RimWorldManagement } from "./module/Sheets/Sidebar/WorldManagement.js";
import { RulerRimTop } from "./module/Token/RulerRimTop.js";
import { CombatantRimTop } from "./module/combat/CombatantRimTop.js";
import {CombatRimTop} from "./module/combat/CombatRimTop.js";
import MeleeAttackApplicationElement from "./module/ChatMessages/MeleeAttackApplicationElement.mjs";
import ChatMessageRimTop from "./module/ChatMessages/ChatMessageRimTop.mjs";
import RangedAttackApplicationElement from "./module/ChatMessages/RangedAttackApplicationElement.mjs";

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

const validCharacters = new RegExp(/^[a-zA-Z0-9 ]*$/);

String.prototype.isSafe = function (){
    return validCharacters.test(this) && this.isWellFormed();
}

function stripSign(str) {
    // Check if it has a minus sign
    let hasMinus = str.charAt(0) === '-';
    // Remove it if it does
    if (hasMinus || str.charAt(0) === '+') {
        str = str.substring(1);
    }
    return [hasMinus, str];
}

Number.prototype.scientificToDecimal = function(){
    let str = JSON.stringify(this);
    if (/\d+\.?\d*e[\+\-]*\d+/i.test(str)) {
        let isNegative, isSmall;
        // Remove the sign by slicing the string
        [isNegative, str] = stripSign(str);
        // Split it into coefficient and exponent
        let [c, e] = str.toLowerCase().split('e');
        // Split the coefficient into the whole and decimal portion
        let [w, d] = c.split('.');
        // Provide and empty sting for safety if in the form n(e)n
        d = d || '';
        // The total length of the string
        let length = w.length + d.length;
        // The total string minus the dot
        let numString = w + d;
        // If it's small then we need to calculate the leading zeros
        // The shift of the decimal place to the left
        const dotLocation = w.length + Number(e);
        // Is the dot needed or not
        const dot = dotLocation === length ? '' : '.';
        let value;
        if (dotLocation <= 0) {
            // Join the value but pad after the dot with zeroes
            value = `0${dot}${'0'.repeat(Math.abs(dotLocation))}${numString}`;
        }
        else if (dotLocation > length) {
            value = `${numString}${'0'.repeat(Math.abs(dotLocation - length))}`;
        }
        else {
            value = `${numString.substring(0, dotLocation)}${dot}${numString.substring(dotLocation)}`;
        }
        return isNegative ? '-' + value : value;
    }
    return str;
}

async function preloadHandleBarsTemplates(){
    const templatePaths =[
        "systems/rimtop/templates/partials/search-partial.hbs",
        "systems/rimtop/templates/partials/stat-card-partial.hbs",
        "systems/rimtop/templates/partials/bio-card-partial.hbs",
        "systems/rimtop/templates/partials/gear-thing-partial.hbs",
        "systems/rimtop/templates/ChatMessages/stat-roll.hbs",
        "systems/rimtop/templates/partials/bill-partial.hbs",
        "systems/rimtop/templates/partials/needs-bar-partial.hbs",
        "systems/rimtop/templates/partials/work-bills-partial.hbs",
        "systems/rimtop/templates/partials/down-time-activity-partial.hbs",
        "systems/rimtop/templates/partials/double-slider-partial.hbs",
        "systems/rimtop/templates/partials/bill-ingredient-item-partial.hbs",
        "systems/rimtop/templates/partials/verb-partial.hbs"
    ];
    return loadTemplates(templatePaths);
};
var csInterOP = new CSInterOp();

Hooks.on("renderChatPopout", ChatMessageRimTop.onRenderChatPopout);
Hooks.on("getChatLogEntryContext", ChatMessageRimTop.addChatMessageContextOptions);
Hooks.on("renderChatLog", (app, html, data) => {    ChatMessageRimTop.onRenderChatLog(html);  });
Hooks.once("init", ()=>{
    console.log("Initialising Rim-Top System...");

    window.customElements.define("melee-attack-application", MeleeAttackApplicationElement);
    window.customElements.define("ranged-attack-application",RangedAttackApplicationElement)
    ChatMessageRimTop.activateListeners()
    game.rimtop = rimtop;
    CONFIG.rimtop = rimtop;
    CONFIG.csInterOP = csInterOP;

    CONFIG.Actor.documentClass = ActorThing;
    CONFIG.Actor.dataModels={
        thing:ThingDataModel,
        pawn:PawnDataModel
    };
    CONFIG.Canvas.rulerClass = RulerRimTop;
    CONFIG.ChatMessage.documentClass = ChatMessageRimTop;
    CONFIG.Token.documentClass = BaseToken;
    CONFIG.Token.objectClass = TokenRimTop;
    CONFIG.Token.hudClass = BaseTokenHUD;

    CONFIG.Combatant.documentClass = CombatantRimTop;
    CONFIG.Combat.documentClass = CombatRimTop;

    Actors.unregisterSheet("core",ActorSheet);
    Actors.registerSheet("rimtop",BaseActorSheet);
    Actors.registerSheet("pawn",PawnActorSheet);

    console.log("it even registers changes");

    game.settings.registerMenu("rimtop", "rimworldsaves", {
        name: "Rim World Saves",
        label: "Save/Load",      // The text label used in the button
        hint: "Manage the save fiels for the RimWorld Application.",
        icon: "fas fa-bars",               // A Font Awesome icon used in the submenu button
        type: RimWorldManagement,   // A FormApplication subclass
        restricted: true                   // Restrict this submenu to gamemaster only?
    });

    preloadHandleBarsTemplates();

    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
        return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });
    Handlebars.registerHelper('ifNotEqual', function(arg1, arg2, options) {
        return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
    });
    Handlebars.registerHelper('ifOr',function(arg1,arg2, options){
        if(arg1 || arg2) {
            return options.fn(this);
        }
        return options.inverse(this);
    });
    Handlebars.registerHelper('ifFourOr', function(arg1,arg2,arg3,arg4,options){
        if(arg1 === arg2 || arg3===arg4){
            return options.fn(this);
        }
        
        return options.inverse(this);
    });
})

Hooks.once("ready",()=>{
    $('[data-tab=items]').hide();
})

Hooks.once("setup",()=>{
    CONFIG.Actor.trackableAttributes={
        thing:{
            bar:["health"],
            value:[]
        },
        pawn:{
            bar:["health","instantInitative"],
            value:[]
        }
    }
})

// Hooks.on("updateToken",(scene,data,moved)=>{
//     console.log(scene.actor);
//     console.log(data);
//     console.log(moved);
//     console.log("token moved");
// })
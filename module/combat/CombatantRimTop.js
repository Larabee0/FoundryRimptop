
export class CombatantRimTop extends Combatant{
    async getInitiativeRoll(formula) {
        let result = 0;
        if ( !this.actor ) {
            result = new CONFIG.Dice.D20Roll(formula ?? "1d20+360", {});
        }
        else{
            result = await this.actor.getInitiativeRoll();
            await this.actor.updateCombat();
        }
        
        this.setFlag("rimtop","originalInitative",result);

        return new Roll(String(result));
    }

    async updateInitiative(){
        let original = this.getFlag("rimtop","originalInitative");
        
        let value = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getTicksUsedThisTurn",this.actor.system.thingID));
        if(value == 0){
            if(JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","autoPassTurn",this.actor.system.thingID))){
              await this.actor.updateCombat();
              value = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","getTicksUsedThisTurn",this.actor.system.thingID));
            }
        }
        await this.update({initiative:original-value});
    }
}
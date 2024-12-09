import {SpawnThingSheet} from "../Sheets/SpawnThingSheet.js";
import { PawnCreatorSheet } from "../Sheets/PawnCreatorSheet.js";

export class ActorThing extends Actor {
    
    async openCreateItemDialogue(){
        let spawnSheet = new SpawnThingSheet();
        spawnSheet.createActor = this;
        spawnSheet.render({ force: true });
    }

    async openCreatePawnDialogue(){
        let pawnCreateSheet = new PawnCreatorSheet();
        pawnCreateSheet.targetActor = this;
        pawnCreateSheet.render({ force: true });
    }

    async openSpawnItemDialogue(){
        let spawnSheet = new SpawnThingSheet();
        spawnSheet.giveToActor = this;
        spawnSheet.render({ force: true });
    }

    async refreshAll(){
        if(this.system.thingID==="uncreatedThing")
        {
            return;
        }
        await this.updateStats();
        await this.updateBio();
        await this.updateGear();
        await this.updateHealthSummary();
        await this.updateHediffList();
        await this.updateOperationsBills();
        await this.updateNeeds();
        await this.updateDownTime();
        await this.updateCombat();

        let actorSingle = [];
        actorSingle.push(this.system.ThingID);
        let updates = JSON.parse( await this.SendHttpRequest("GET","refreshActors",JSON.stringify(actorSingle)));
        if(updates[this.system.ThingID]){
            await this.updateFrom(updates[this.system.ThingID]);
        }
    }

    async updateFrom(data){
        let updates ={};
        if(data.StatCard){
            updates = { ...updates,...this.genUpdateStats(data.StatCard)};
        }
        if(data.Bio){
            updates = { ...updates,...this.genUpdateBio(data.Bio)};
        }
        if(data.GearCard){
            updates = { ...updates,...this.genUpdateGear(data.GearCard)};
        }
        if(data.HealthSummary){
            updates = { ...updates,...this.genUpdateHealthSummary(data.HealthSummary)};
        }
        if(data.HediffList){
            updates = { ...updates,...this.genUpdateHediffList(data.HediffList)};
        }
        if(data.OperationsBills){
            updates = { ...updates,...this.genUpdateHediffList(data.OperationsBills)};
        }
        if(data.NeedsCard){
            updates = { ...updates,...this.genUpdateNeeds(data.NeedsCard)};
        }
        if(data.DownTimeCard){
            updates = { ...updates,...this.genUpdateDownTime(data.DownTimeCard)};
        }
        if(data.CombatCard){
            updates = { ...updates,...this.genUpdateCombat(data.CombatCard)};
        }
        await this.update(updates);
    }

    async updateStats(){
        if(this.type ==="thing"||this.type==="pawn"){
            let updates=this.genUpdateStats(await CONFIG.csInterOP.GetThingStatCard(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateStats(json){

        let updates={"system.statCard": JSON.parse(json)};
        let curHp = updates["system.statCard"].Hp;
        let maxHp = updates["system.statCard"].MaxHp;
        updates["system.health"] = {max:maxHp,value:curHp};
        return updates;
    }

    async updateBio(){
        if(this.type ==="pawn"){
            let updates = this.genUpdateBio(await CONFIG.csInterOP.GetPawnBioCard(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateBio(json){
        let bio = JSON.parse(json);
        if(!bio.Name)
        {
            bio.Name = this.name;
        }
        let updates = {"system.bio":bio,"name":bio.Name};
        return updates;
    }

    async updateGear(){
        if(this.type==="pawn"){
            let updates = this.genUpdateGear(await CONFIG.csInterOP.GetPawnGearCard(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateGear(json){
        return {"system.gearCard":JSON.parse(json)};
    }

    async updateHealthSummary(){
        if(this.type==="pawn"){
            let updates = {"system.healthSummary":this.genUpdateHealthSummary(await CONFIG.csInterOP.GetPawnHealthSummary(this.system.thingID))};
            
            updates["system.statCard"]= JSON.parse( await CONFIG.csInterOP.GetThingStatCard(this.system.thingID));
            let curHp = updates["system.statCard"].Hp;
            let maxHp = updates["system.statCard"].MaxHp;
            updates["system.health"] = {max:maxHp,value:curHp};
            await this.update(updates);
        }
    }

    genUpdateHealthSummary(json){

        return {"system.healthSummary":JSON.parse(json)};
    }

    async updateHediffList(){
        if(this.type==="pawn"){
            let updates = this.genUpdateHediffList(await CONFIG.csInterOP.GetPawnHediffList(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateHediffList(json){
        return {"system.hediffList":JSON.parse(json)};
    }

    async updateOperationsBills(){
        if(this.type==="pawn"){
            let updates = this.genUpdateOperationsBills(await CONFIG.csInterOP.GetPawnMedicalBills(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateOperationsBills(json){
        return {"system.operationBills":JSON.parse(json)};
    }

    async updateNeeds(){
        if(this.type==="pawn"){
            let updates = this.genUpdateNeeds(await CONFIG.csInterOP.GetPawnNeeds(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateNeeds(json){
        return {"system.needsCard":JSON.parse(json)};
    }

    async updateDownTime(){
        if(this.type==="pawn"){
            let updates =this.genUpdateDownTime(await CONFIG.csInterOP.GetPawnDownTime(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateDownTime(json){
        return {"system.downTimeCard":JSON.parse(json)};
    }

    async updateCombat(){
        if(this.type==="pawn"){
            let updates =this.genUpdateCombat(await CONFIG.csInterOP.GetPawnCombatCard(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateCombat(json){
        let updates ={"system.combatCard":JSON.parse(json)};
        updates["system.instantInitative"] = {max:updates["system.combatCard"].LastInitiative,value:updates["system.combatCard"].ActionAdjustedInitiative};
        return updates;
    }

    isCurrentTurn(){
        if(this.inCombat && game.combat.combatant){
            return game.combat.combatant.actor._id == this._id;
        }
        return false;
    }

    IsAlive(){
        
        if("PawnState" in this.system.statCard && this.system.statCard.PawnState == 0)
        {
            return false;
        }
        return true;
    }

    IsDowned(){
        
        if("PawnState" in this.system.statCard && this.system.statCard.PawnState == 1)
        {
            return true;
        }
        return false;
    }

    IsMobile(){
        
        if("PawnState" in this.system.statCard && this.system.statCard.PawnState == 2)
        {
            return true;
        }
        return false;
    }

    setSpawned(value){
        //console.log("set spawned ",value);
        let updates={
            "system.spawned":value
        };
        this.update(updates);

    }

    setThingId(value){
        let updates={
            "system.thingID":value
        };
        this.update(updates);
    }

    setThingDef(value){
        let updates={
            "system.thingDef":value
        };
        this.update(updates);
    }

    setLastSpawnedToken(tokenId){
        let updates={
            "system.lastSpawnedToken":tokenId
        };
        this.update(updates);
    }

    async wait30Ticks(){
        await CONFIG.csInterOP.SendHttpRequest("POST","tryWaitTicks",this.system.thingID,"30");
    }

    async waitRestOfTurnTicks(){
        await CONFIG.csInterOP.SendHttpRequest("POST","tryAllTicks",this.system.thingID);
    }

    async customWait(){
        
        let ticks = this.system.customTickDuration;
        ticks.clamp(1,360);
        await CONFIG.csInterOP.SendHttpRequest("POST","tryWaitTicks",this.system.thingID,String(ticks));
    }

    async setCover(coverValue){
        await CONFIG.csInterOP.SendHttpRequest("POST","setCover",this.system.thingID,coverValue);
        await this.updateCombat();
    }

    async getInitiativeRoll(){
        if(this.system.type ==="thing"){
            return 0;
        }
        return parseFloat((JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","rollStat",this.system.thingID,"Initiative"))).Value);
    }

    async _preDelete(options,user){
        let preDelete = super._preDelete(options,user);
        if(game.user._id===user.id){
            //console.log("Editor client!");

            await CONFIG.csInterOP.DestroyThings(JSON.stringify([this.system.thingID]));
            console.log("Destroyed thing in rimworld app");
        }
        return preDelete;
    }
    
    _onCreate(data,options,userId){
        super._onCreate(data,options,userId);
        
        // if(game.user._id===userId){
        //     console.log("Editor client!");
        // }
    }

    async _onUpdate(changed,options,userId){
        //console.log("actor changed ", userId);
        await super._onUpdate(changed,options,userId);
        
        if(game.user._id===userId){
            //console.log("Editor client!");
        
            await this.validateSpawnStatus(("system" in changed && "spawned" in changed.system),(("system" in changed && "spawned" in changed.system) ? changed.system.spawned : null));
        }
    }

    async spawnOnMap(token){

        let pos = token.getRimworldCoordinates();
        
        let thingsToSpawn =[{
            MapId: token.parent._id,
            ThingId: this.system.thingID,
            X: pos[0],
            Y: pos[1]
        }];

        await CONFIG.csInterOP.SpawnThings(JSON.stringify(thingsToSpawn));
        this.setLastSpawnedToken(token._id);
    }

    async despawn(){
        let thingsToDespawn = [this.system.thingID];

        await CONFIG.csInterOP.DespawnThing(JSON.stringify(thingsToDespawn));
        this.setLastSpawnedToken("");
    }

    async validateSpawnStatus(spawnChanged,newValue){
        // the current spawn status we think this actor is in.
        let currentSpawnedStatus = this.system.spawned;

        let linkedTokens = this.getAllSpawnedLinkedTokens();
        if(linkedTokens.length > 1){
            console.warn("too many linked tokens!");
            await this.clearSpawnedTokens();
            let token = game.actors.tokens[this.system.lastSpawnedToken];
            if(token){
                await token.update({actorLink: true});    
                console.log("set to lastSpawnedToken");
            }
            else{
                console.log("despawned all");
            }
            return;
        }


        if(spawnChanged){
            if(newValue){
                // spawn status has changed and is now spawned, spawn the token in rimworld
                this.spawnOnMap(linkedTokens[0]);
                //console.log("spawning token (SC) ",linkedTokens[0]._id);
                return;
            }
            else{
                // spawn status has changed and is now despawned, ensure we are despawned in rimworld.
                this.despawn();
                //console.log("Ensuring despawned (SC)");
                return;
            }
        }
        else{
            // internal spawn check
            if(linkedTokens.length > 0){
                // validate token ids match, if not respawn the token in the right location.
                if(linkedTokens[0]._id !== this.system.lastSpawnedToken){
                    this.spawnOnMap(linkedTokens[0]);
                    //console.log("spawning token (ISC) ",linkedTokens[0]._id);
                }
                else if(!currentSpawnedStatus){
                    // if we aren't currently spawned, spawn us.
                    this.setSpawned(true);            
                    //console.log("set spawned true (ISC)");
                }
            }
            else if (currentSpawnedStatus){
                // if we are currently spawned, despawn us.
                this.setSpawned(false);
                //console.log("set spawned false (ISC)");
            }
        }
    }

    async clearSpawnedTokens(){
        let linkedTokens = this.getAllSpawnedLinkedTokens();
        for(let i = 0; i < linkedTokens.length; i++){
            await linkedTokens[i].update({actorLink: false});
        }
    }

    getAllSpawnedLinkedTokens(){
        return this.getDependentTokens({ linked:true});
    }

}
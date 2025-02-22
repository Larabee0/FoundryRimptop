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
        await this.updateDisplayedName();

        let actorSingle = [];
        actorSingle.push(this.system.thingID);
        let updates = JSON.parse( await this.SendHttpRequest("GET","refreshActors",JSON.stringify(actorSingle)));
        if(updates[this.system.thingID]){
            await this.updateFrom(updates[this.system.thingID]);
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
        if(data.DisplayName){
            updates = { ...updates,...this.genUpdateDisplayName(data.DisplayName)};
        }
        await this.update(updates);
    }
    
    async updateDisplayedName(){
        
        if(this.type ==="thing"||this.type==="pawn"){
            let updates=this.genUpdateDisplayName(await CONFIG.HttpRequest.GetDisplayName(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateDisplayName(json){
        let updates = {name:json};
        return updates;
    }

    async updateStats(){
        if(this.type ==="thing"||this.type==="pawn"){
            let updates=this.genUpdateStats(await CONFIG.HttpRequest.GetThingStatCard(this.system.thingID));
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
            let updates = this.genUpdateBio(await CONFIG.HttpRequest.GetPawnBioCard(this.system.thingID));
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
            let updates = this.genUpdateGear(await CONFIG.HttpRequest.GetPawnGearCard(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateGear(json){
        return {"system.gearCard":JSON.parse(json)};
    }

    async updateHealthSummary(){
        if(this.type==="pawn"){
            let updates = this.genUpdateHealthSummary(await CONFIG.HttpRequest.GetPawnHealthSummary(this.system.thingID));
            
            updates["system.statCard"]= JSON.parse( await CONFIG.HttpRequest.GetThingStatCard(this.system.thingID));
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
            let updates = this.genUpdateHediffList(await CONFIG.HttpRequest.GetPawnHediffList(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateHediffList(json){
        return {"system.hediffList":JSON.parse(json)};
    }

    async updateOperationsBills(){
        if(this.type==="pawn"){
            let updates = this.genUpdateOperationsBills(await CONFIG.HttpRequest.GetPawnMedicalBills(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateOperationsBills(json){
        return {"system.operationBills":JSON.parse(json)};
    }

    async updateNeeds(){
        if(this.type==="pawn"){
            let updates = this.genUpdateNeeds(await CONFIG.HttpRequest.GetPawnNeeds(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateNeeds(json){
        return {"system.needsCard":JSON.parse(json)};
    }

    async updateDownTime(){
        if(this.type==="pawn"){
            let updates =this.genUpdateDownTime(await CONFIG.HttpRequest.GetPawnDownTime(this.system.thingID));
            await this.update(updates);
        }
    }

    genUpdateDownTime(json){
        return {"system.downTimeCard":JSON.parse(json)};
    }

    async updateCombat(){
        if(this.type==="pawn"){
            let updates =this.genUpdateCombat(await CONFIG.HttpRequest.GetPawnCombatCard(this.system.thingID));
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

    async setSpawned(value){
        //console.log("set spawned ",value);
        let updates={
            "system.spawned":value
        };
        return await this.update(updates);

    }

    async setThingId(value){
        let updates={
            "system.thingID":value
        };
        return await this.update(updates);
    }

    async setThingDef(value){
        let updates={
            "system.thingDef":value
        };
        return await this.update(updates);
    }

    async setLastSpawnedToken(tokenId){
        let updates={
            "system.lastSpawnedToken":tokenId
        };
        return await this.update(updates);
    }

    async wait30Ticks(){
        await CONFIG.HttpRequest.TryWeightTicks(this.system.thingID,String(30));
    }

    async waitRestOfTurnTicks(){
        await CONFIG.HttpRequest.TryWaitAllTicks(this.system.thingID);
    }

    async customWait(){
        
        let ticks = this.system.customTickDuration;
        ticks.clamp(1,360);
        await CONFIG.HttpRequest.TryWeightTicks(this.system.thingID,String(ticks));
    }

    async setCover(coverValue){
        await CONFIG.HttpRequest.SetCover(this.system.thingID, coverValue);
        await this.updateCombat();
    }

    async getInitiativeRoll(){
        if(this.system.type ==="thing"){
            return 0;
        }
        return parseFloat((JSON.parse(await CONFIG.HttpRequest.RollStat(this.system.thingID,"Initiative"))).Value);
    }

    async _preDelete(options,user){
        var dependentTokens = this.getDependentTokens();
        for(var i = 0; i < dependentTokens.length; i++){
            await dependentTokens[i].delete({deleteActor: true});
        }
        let preDelete = super._preDelete(options,user);
        if(game.user._id===user.id && this.system.thingID !== "InventoryActorDelete"){
            //console.log("Editor client!");

            await CONFIG.HttpRequest.DestroyThings(JSON.stringify([this.system.thingID]));
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

        var result = JSON.parse(await CONFIG.HttpRequest.SpawnThings(JSON.stringify(thingsToSpawn)));
        if(result && result.length > 0){
            await this.processSpawnResult(token,result[0]);
        }
        else{
            console.error("Recived no spawn result from spawn request");
        }
    }

    async processSpawnResult(token,result){
        if(!token){
            console.error("Cannot process spawn result without intended token");
            return;
        }
        console.log(result);
        if("Success"in result && result.Success){
            var posFoundry = token.convertFromRimWorldCoordinates(result.X,result.Y);
            if(result.ResultThingId !== this.system.thingID){
                // thing id changed
                var actordId = CONFIG.csInterOP.GetActorByThingId(result.ResultThingId);
                if(actordId){ // changed thingId actor exists
                    var otherActor = game.actors.get(actordId);
                    if(otherActor.system.spawned){
                        // if other the actor is spawned try and reuse its token if its on the right map and resolves.
                        var otherTokens = otherActor.getAllSpawnedLinkedTokens();
                        if(otherTokens){
                            var otherToken=otherTokens[0];
                            if(otherToken.parent._id === token.parent._id){
                                // token fully resolved, set position
                                await otherToken.SetPosition(result.X,result.Y);
                            }
                            else{
                                // token on wrong map, create new token
                                await CONFIG.csInterOP.createToken(otherActor,token.parent,posFoundry[0],posFoundry[1]);
                            }
                        }
                        else{
                            // token did not resolve, create new token
                            await CONFIG.csInterOP.createToken(otherActor,token.parent,posFoundry[0],posFoundry[1]);
                        }
                    }
                    else{
                        // other actor is not spawned, create new token
                        await CONFIG.csInterOP.createToken(otherActor,token.parent,posFoundry[0],posFoundry[1]);
                    }
                    // whatever happens we should delete this actor.
                    await this.delete();
                    return;
                }
                else{ 
                    // the thingId has changed but it has no actor in foundry, we'll reassign ourselves to that thing id.
                    // if this has occured, our old thingId has likely been absored into a spawned stack
                    await this.setThingId(result.ResultThingId);
                    await this.updateDisplayedName();
                }
            }  
            else{
                // validate spawn position
                await token.SetPosition(result.X,result.Y);
            }          
            await this.setLastSpawnedToken(token._id);
        }
        else{
            await this.setSpawned(false);
        }
    }

    async despawn(){
        let thingsToDespawn = [this.system.thingID];

        var result = JSON.parse(await CONFIG.HttpRequest.DespawnThing(JSON.stringify(thingsToDespawn)))[0];
        if(result.Merged){
            var thingActor = game.actors.get(CONFIG.csInterOP.GetActorByThingId(result.ResultThingId));
            if(thingActor){
                await thingActor.updateDisplayedName();
            }
        }        
        if(result.Merged || result.Destroyed){
            await this.delete();
        }
        else{
            await this.setLastSpawnedToken("");
        }
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
                if(this.type === "thing"){
                    var curFolder = this.folder;
                    
                    var sceneFolder = CONFIG.csInterOP.GetSceneFolder(linkedTokens[0].parent);
                    if(curFolder._id !== sceneFolder._id){
                        await this.update({folder:sceneFolder});
                    }
                }
                //console.log("spawning token (SC) ",linkedTokens[0]._id);
                return;
            }
            else{
                // spawn status has changed and is now despawned, ensure we are despawned in rimworld.
                await this.despawn();
                if(this.type === "thing"){
                    var curFolder = this.folder;
                    var worldInv = CONFIG.csInterOP.GetWorldInventoryFolder();
                    if(curFolder._id !== worldInv._id){
                        await this.update({folder:worldInv});
                    }
                }
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
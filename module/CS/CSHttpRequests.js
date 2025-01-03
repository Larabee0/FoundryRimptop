export class CSHttpRequest{
    
    //  CONFIG.HttpRequest.
    //  CONFIG.HttpRequest

    csInterOP;
    constructor(interop){
        this.csInterOP = interop;
    }
    //#region time
    async SetTickPause(paused){
        await this.csInterOP.SendHttpRequest("POST","setTickPause",paused);
    }

    async SetTickRun(run){
        await this.csInterOP.SendHttpRequest("POST","setTickRun",run);
    }

    async DoTicks(ticks){
        await this.csInterOP.SendHttpRequest("POST","doTicks",ticks);
    }

    async GetTimeData(){
        return await this.csInterOP.SendHttpRequest("GET","getTimeData");
    }
    
    async GetInstanceHitChance(instigatorId,targetId){
        return await this.csInterOP.SendHttpRequest("GET","getInstantHitChance",instigatorId, targetId);
    }

    async TryAddTokenMovementCost(pawnId,distance){
        return await this.csInterOP.SendHttpRequest("POST","tryAddTokenMoveCost",pawnId,distance);
    }

    async RefundActionPoints(pawnId,action){
        await this.csInterOP.SendHttpRequest("POST","refundAction",pawnId,action);
    }

    async TryCompletePawnBusyStance(pawnId){
        await this.csInterOP.SendHttpRequest("POST","tryCompleteBusyStance",pawnId);
    }

    async TryWaitAllTicks(thingId){
        await this.csInterOP.SendHttpRequest("POST", "tryAllTicks", thingId);
    }

    async TryWeightTicks(thingId, ticks){
        await this.csInterOP.SendHttpRequest("POST", "tryWaitTicks", thingId, ticks);
    }

    //#endregion


    //#region combat rounds

    async ClearCombatData(){
        await this.csInterOP.SendHttpRequest("POST","clearCombatData");
    }

    async NextRound(combatants){
        return await this.csInterOP.SendHttpRequest("POST","nextRound",combatants);
    }

    async CheckNextRound(combatants){
        return await this.csInterOP.SendHttpRequest("POST","checkNextRound",combatants);
    }

    async SetCombatMode(inCombat){
        await this.csInterOP.SendHttpRequest("POST","setCombatMode",inCombat);
    }

    async GetTicksUsedThisTurn(thingId){
        return await this.csInterOP.SendHttpRequest("GET","getTicksUsedThisTurn",thingId);
    }

    async AutoPassTurn(thingId){
        return await this.csInterOP.SendHttpRequest("POST","autoPassTurn",thingId);
    }

    //#endregion

    //#region Pawns

    //#region combat
    async SetMeleeAttackMode(pawnId,attackMode){
        await this.csInterOP.SendHttpRequest("POST","setMeleeAttackMode",pawnId,attackMode);
    }
    async GetMeleeAttackMode(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getMeleeAttackMode",pawnId);
    }

    async DoAttack(instigatorThingId, targetThingId){
        return await this.csInterOP.SendHttpRequest("POST","doAttack",instigatorThingId, targetThingId);
    }

    async GetInstantRangedHitChances(thingIds,thingId){
        return await this.csInterOP.SendHttpRequest("GET","getInstantRangedHitChances",thingIds,thingId);
    }

    async GetInstantMeleeHitChance(thingIds,thingId){
        return await this.csInterOP.SendHttpRequest("GET","getInstantMeleeHitChances",thingIds,thingId);
    }

    async SetCover(thingId, coverValue){
        await this.csInterOP.SendHttpRequest("POST","setCover",thingId,coverValue);
    }

    async GetPawnCombatCard(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getCombatCard",pawnId);
    }


    //#endregion

    //#region Pawn bio
    
    async GetAllTraitsForPawn(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getAllTraits",pawnId);
    }

    async GetAllBackstoriesFor(backstoryRequest){
        return await this.csInterOP.SendHttpRequest("GET","getBackstories",backstoryRequest);
    }

    async GetDisplayName(thingID){
        return await this.csInterOP.SendHttpRequest("GET","displayName",thingID);
    }

    async GetPawnBioCard(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getPawnBioCard",pawnId);
    }

    async GetSkillEditData(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getSkillEditData",pawnId);
    }
    async GetPawnBasicEditData(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getPawnBasicEdit",pawnId);
    }

    async SetPawnBasicBioEdit(basicBioData){
        return await this.csInterOP.SendHttpRequest("POST","setBioBasic",basicBioData);
    }

    async SetPawnBioSkills(skills){
        return await this.csInterOP.SendHttpRequest("POST","setBioSkills",skills);
    }

    async SetPawnBioBackstories(backstories){
        return await this.csInterOP.SendHttpRequest("POST","setBioBackstories",backstories);
    }

    async SetPawnBioTraits(traits){
        return await this.csInterOP.SendHttpRequest("POST","setBioTraits",traits)
    }

    async RandomisePawnBio(pawnId){
        await this.csInterOP.SendHttpRequest("POST","randomiseAll",pawnId);
    }

    async RandomisePawnName(pawnId){
        await this.csInterOP.SendHttpRequest("POST","randomiseName",pawnId);
    }
    
    async RandomisePawnBackstories(pawnId){
        await this.csInterOP.SendHttpRequest("POST","randomiseBackstories",pawnId);
    }
    
    async RandomisePawnTraits(pawnId){
        await this.csInterOP.SendHttpRequest("POST","randomiseTraits",pawnId);
    }
    //#endregion
    

    //#region Health and Damage

    async GetPawnHealthSummary(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getHealthSummary",pawnId);
    }

    async GetPawnHediffList(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getHediffList",pawnId);
    }

    async GetPawnMedicalBills(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getOperationsList",pawnId);
    }

    async GetAllHediffs(){
        return await this.csInterOP.SendHttpRequest("GET","getHediffs");
    }

    async GetWeaponDefsFromPawn(thingId){
        return await this.csInterOP.SendHttpRequest("GET","weaponDefsFromPawn",thingId)
    }

    async AddHediff(targetPawnId,hediffDef,partIndex){
        await this.csInterOP.SendHttpRequest("POST","addHediff",targetPawnId,hediffDef,partIndex);
    }

    async AddDamage(targetThingId,damageDef,bodyPart,amount,armorPen,instigatorThingId,instigatorWeaponId){
        await this.csInterOP.SendHttpRequest("POST","addDamage",targetThingId,damageDef,bodyPart,amount,armorPen,instigatorThingId,instigatorWeaponId);
    }

    async GetPartsForHediff(thingId,hediffDef){
        return await this.csInterOP.SendHttpRequest("GET","getPartsForHediff",thingId,hediffDef)
    }

    async GetDamageAllDefs(){
        return await this.csInterOP.SendHttpRequest("GET","getDamageDefs");
    }

    async GMResurrectPawn(pawnId){
        await this.csInterOP.SendHttpRequest("POST","gmResurrect",pawnId);
    }

    async GetHediffInfoCard(pawnId,hediffId){
        return await this.csInterOP.SendHttpRequest("GET","getHediffInfoCard",pawnId,hediffId)
    }

    async SetSelfTend(pawnId,tendSelf){
        await this.csInterOP.SendHttpRequest("POST","setSelfTend",pawnId,tendSelf);
    }

    async RemoveHediff(pawnId,hediffId){
        await this.csInterOP.SendHttpRequest("POST","removeHediff",pawnId,hediffId);
    }

    async HarmHediff(pawnId, hediffId,newSeverity){
        await this.csInterOP.SendHttpRequest("POST","harmHediff",pawnId,hediffId,newSeverity);
    }

    async HealHediff(pawnId, hediffId, newSeverity){
        await this.csInterOP.SendHttpRequest("POST","healHediff",pawnId,hediffId,newSeverity);
    }

    async AddOperationBill(pawnId, billDefName,bodyPartIndex){
        await this.csInterOP.SendHttpRequest("POST","addOperationBill",pawnId,billDefName,bodyPartIndex);
    }

    async GetMedicalOperationRecipiesForPawn(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","medOpRecipiesFor",pawnId)
    }

    async SetInterPawnTending(pawnId,tendingData){
        return await this.csInterOP.SendHttpRequest("POST","setPawnInterTending",pawnId,tendingData);
    }

    async GetInterPawnTending(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getPawnInterTending",pawnId);
    }

    //#endregion

    //#region Down Time

    async SetMinorBillConfig(config){
        await this.csInterOP.SendHttpRequest("POST","minorBillConfig",config);
    }

    async GetRecipeStatCard(recipeDefName){
        return await this.csInterOP.SendHttpRequest("GET","getRecipeStatCard",recipeDefName);
    }

    async AddNewRecipe(thingId,recipeDefName,bench){
        await this.csInterOP.SendHttpRequest("POST","addNewRecipe",thingId,recipeDefName,bench);
    }

    async GetAllRecipieUserDefData(){
        return await this.csInterOP.SendHttpRequest("GET","allRecipeUserDefData");
    }

    async GetWorkBillsForPawn(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","workBills",pawnId)
    }
    
    async SetMiscDownTime(pawnId,disableDownTime,restEffectiveness,alwaysRest,virtuallySpawned){
        await this.csInterOP.SendHttpRequest("POST","setMiscDownTime",pawnId,disableDownTime,restEffectiveness,alwaysRest,virtuallySpawned);
    }

    async SetDownTimeActivityFor(pawnId,downTimeData,skillData){
        await this.csInterOP.SendHttpRequest("POST","setDownTimeActivity",pawnId,downTimeData,skillData);
    }

    async GetLearnSkillsFor(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","learnableSkillsFor",pawnId)
    }

    async GetBillProductCountFromPawn(pawnId,billId,billMapId){
        return await this.csInterOP.SendHttpRequest("GET","billProductCountFromPawn",pawnId,billId,billMapId);
    }

    async SendBillConfig(pawnId,billId,billMapId,billConfig){
        await this.csInterOP.SendHttpRequest("POST","sendBillConfig",pawnId,billId,billMapId,billConfig);
    }

    async GetBillConfigData(pawnId,billId,billMapId){
        return await this.csInterOP.SendHttpRequest("GET","billConfigData",pawnId,billId,billMapId)
    }

    async GetPawnDownTime(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getDownTime",pawnId);
    }

    //#endregion

    //#region General actions

    async RollStat(thingId,statDefName,){
        return await this.csInterOP.SendHttpRequest("GET","rollStat",thingId,statDefName);
    }

    //#endregion

    //#region Needs/Mood

    async GetPawnNeeds(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getNeedsCard",pawnId);
    }

    async AddThought(thoughtRequest){
        await this.csInterOP.SendHttpRequest("POST","addThought",thoughtRequest);
    }

    async AddCustomThought(customThought){
        await this.csInterOP.SendHttpRequest("POST","addCustomThought",customThought);
    }

    async GetAllThoughts(){
        return await this.csInterOP.SendHttpRequest("GET","getAllThoughts");
    }

    //#endregion

    //#region Inventory/Gear

    async GetPawnGearCard(pawnId){
        return await this.csInterOP.SendHttpRequest("GET","getGearCard",pawnId);
    }

    async IngestThing(pawnId,thingId){
        await this.csInterOP.SendHttpRequest("POST","ingestThing",pawnId,thingId);
    }

    async TryWearThing(pawnId,thingId){
        await this.csInterOP.SendHttpRequest("POST","tryWearThing",pawnId,thingId);
    }

    async TryEquipThing(pawnId, thingId){
        await this.csInterOP.SendHttpRequest("POST","tryEquipThing",pawnId,thingId);
    }

    async DropThing(pawnId,thingId,count){
        return await this.csInterOP.SendHttpRequest("POST","dropThing",pawnId,thingId,count)
    }

    async TryAddToPawnInventory(pawnId, thingId,count){
        return await this.csInterOP.SendHttpRequest("POST","tryAddToInventory",pawnId,thingId,count)
    }

    //#endregion
   
    //#endregion

    //#region Spawn and move actions

    async GetSpawnedThings(){
        return await this.csInterOP.SendHttpRequest("GET","getSpawnedThings")
    }

    async DespawnThing(thingsToDespawn){
        return await this.csInterOP.SendHttpRequest("POST","deSpawnThings",thingsToDespawn);
    }

    async SpawnThings(thingsToSpawn){
        return await this.csInterOP.SendHttpRequest("POST","spawnThings",thingsToSpawn);
    }

    async SetPosition(moveReq){
        return await this.csInterOP.SendHttpRequest("POST","setPosition",moveReq);
    }

    async SetPositionBulk(data){
        return await this.csInterOP.SendHttpRequest("POST","setPositionBulk",data);
    }

    //#endregion

    //#region General Thing
    async GetThingStatCard(thingID){
        return await this.csInterOP.SendHttpRequest("GET","getThingStatCard",thingID);
    }

    async ResolveStatHyperLink(hyperlink){
        return await this.csInterOP.SendHttpRequest("GET","resolveStatHyperLink",hyperlink);
    }
    
    async GetThingInfoCard(thingId){
        return await this.csInterOP.SendHttpRequest("GET","getThingInfoCard",thingId);
    }

    async DestroyThings(thingsToDestroy){
        return await this.csInterOP.SendHttpRequest("POST","destroyThings",thingsToDestroy);
    }

    async GetThingData(thingId){
        return await this.csInterOP.SendHttpRequest("GET","getThingData",thingId)
    }

    async SendThingToMapDirect(thingId,sceneId,stackCount = -1){
        return await this.csInterOP.SendHttpRequest("POST","sendMapToDirect",thingId,sceneId,stackCount)
    }

    async SendThingToWorldDirect(thingId,stackCount = -1){
        return await this.csInterOP.SendHttpRequest("POST","sendToWorldDirect",thingId,stackCount);
    }

    async GetThingContext(thingId){
        return await this.csInterOP.SendHttpRequest("GET","getThingContext",thingId);
    }

    async GetValueFor(thing,stuff,quality){
        return await this.csInterOP.SendHttpRequest("GET","getValueFor",thing,stuff,quality);
    }

    async MakeThing(makeReq){
        return await this.csInterOP.SendHttpRequest("GET","makeThing", makeReq);
    }

    //#endregion

    //#region Campaign Managemenet
    async GetResolveMissingThings(missingThings){
        return await this.csInterOP.SendHttpRequest("GET","resolveMissingThings",missingThings);
    }

    async GetMissingActorData(missingActors){
        return await this.csInterOP.SendHttpRequest("GET","getMissingActorData",missingActors);
    }

    async GetAllThings(){
        return await this.csInterOP.SendHttpRequest("GET","getAllThings");
    }
    
    async AppStateCheck(){
        let res = await this.csInterOP.SendHttpRequest("POST","state",game.world.id);
        return res;
    }

    async ConnectToRimWorldApp(){
        let res = await this.csInterOP.SendHttpRequest("POST","worldStartUp",game.world.id);
        Hooks.call("rimAppConn");
        return res;
    }

    async GetAllThingDefs(){
        return await this.csInterOP.SendHttpRequest("GET","allThingDefs");
    }

    async GetAllPawnKindDefs(){
        return await this.csInterOP.SendHttpRequest("GET","getAllPawnKindDefs");
    }

    async MakePawnGeneratioRequest(request){
        return await this.csInterOP.SendHttpRequest("GET","pawnGenReq",request);
    }

    async SaveNow(){
        return await this.csInterOP.SendHttpRequest("POST","saveNow");
    }

    async LoadFile(file){
        return await this.csInterOP.SendHttpRequest("POST","loadFile",file);
    }

    async RefreshAllActors(actors){
        return await this.csInterOP.SendHttpRequest("GET","refreshActors",actors);
    }

    //#region  map sync
    async SyncMaps(mapData){
        return await this.csInterOP.SendHttpRequest("POST","validateAllMaps",mapData);
    }

    async ValidateMap(mapData){
        return await this.csInterOP.SendHttpRequest("POST","validateMap",mapData);
    }

    async DeleteMap(sceneId){
        await this.csInterOP.SendHttpRequest("POST","deleteMap",sceneId);
    }

    async SetCurrentMap(sceneId){
        await this.csInterOP.SendHttpRequest("POST", "setCurrentMap",sceneId);
    }
    //#endregion
    //#endregion
}
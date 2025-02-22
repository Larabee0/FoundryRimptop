import { ActorThing } from "../actor/ActorThing.js";
import { TimeControls } from "../Sheets/TimeControls.js";
import { CSHttpRequest } from "./CSHttpRequests.js";

const url =window.location.href.replace("30000/game",'8000/');


export class CSInterOp{
    
eventSource;

    constructor(){
        Hooks.once("socketlib.ready", () => {
            this.socket = socketlib.registerSystem("rimtop");
            this.socket.register("gmExeHttpRequest",this.GMExeHttpRequest);
            console.log("socket lib ready");
            CONFIG.socket = this.socket;
        });

        Hooks.once("ready",async ()=>{
            console.log(url);
            CONFIG.HttpRequest = new CSHttpRequest(this);
            if(game.users.activeGM?.isSelf){
                await this.ensureFileSystem();
                Hooks.on("rimAppConn",async ()=>
                {
                    await this.SyncAllDataToRimWorldApp();
                });
                console.log("Is GM, running CS init!");
                let res = await CONFIG.HttpRequest.ConnectToRimWorldApp();
                console.log(res);
                
                Hooks.on("createScene",async (document)=>{
                    console.log("createScene");
                    var sceneFolderId = await this.createActorFolder("Scene: "+document.name);
                    console.log(sceneFolderId._id);
                    document.setFlag("rimtop","sceneFolder",sceneFolderId._id);
                    let scenesForRW=[];
                    
                    let scene = document;
                    let dimensions = this.getSceneSize(scene);
                    let mapData = {
                        Id: scene._id,
                        X: dimensions[0],
                        Y: dimensions[1]
                    }
                
                    scenesForRW.push(JSON.stringify(mapData));
                    let response =JSON.parse(await CONFIG.HttpRequest.ValidateMap(JSON.stringify(scenesForRW)));
                    console.log(response);
                    
                });
                Hooks.on("updateScene",async (document,changed)=>{
                    await this.handleMapUpdate(document,changed);
                });
                Hooks.on("deleteScene",async (scene)=>{
                    console.log("deleteScene");
                    var folder = this.GetSceneFolder(scene);
                    if(folder){
                        await folder.delete({deleteSubfolders: true, deleteContents: true});
                    }
                    
                    await CONFIG.HttpRequest.DeleteMap(scene._id);
                });
                Hooks.on("canvasReady",async ()=>{
                    console.log("Setting curretn Map");
                    await CONFIG.HttpRequest.SetCurrentMap(game.users.activeGM.viewedScene);
                });
            }
            else{
                let appState = await CONFIG.HttpRequest.AppStateCheck();
                console.log(game.user._id);
                if(appState == true){
                    console.log("app is loaded and in correct world");
                }
                else{
                    console.log("app is not loaded or world is wrong. Starting App");
                    let res = await CONFIG.HttpRequest.ConnectToRimWorldApp();
                    console.log(res);
                }
            }
        });
        
    }
    async handleMapUpdate(document,changed){
        console.log("updateScene");
             
        let scene = document;       
        if("name" in changed){
            var folder = this.GetSceneFolder(scene);
            if(folder){
                await folder.update({name: ("Scene: "+document.name)});
            }
        }
        
        if(changed.height || changed.width){
            let scenesForRW=[];
        
            let dimensions = this.getSceneSize(scene);
            let mapData = {
                Id: scene._id,
                X: dimensions[0],
                Y: dimensions[1]
            }
        
            scenesForRW.push(JSON.stringify(mapData));
            let response =JSON.parse(await CONFIG.HttpRequest.ValidateMap(JSON.stringify(scenesForRW)));
            if(response.ModifiedSize){
                // validate map actors spawned
                var tokens = this.getAllTokens(true);

                for(let i = 0; i < tokens.length; i++){
                    var token = tokens[i];
                    if(token.parent._id !== scene._id){
                        continue;
                    }
                    var actor = game.actors.get(token.actorId);
                    var thingId = actor.system.thingID;
                    var thingContext = JSON.parse(await CONFIG.HttpRequest.GetThingContext(thingId));
                    if(!thingContext.Exists){
                        await actor.delete();
                    }
                    else{
                        if(!thingContext.Spawned){
                            await token.update({actorLink: false});
                        }
                    }
                }

            }
            console.log(response);
        }
    }
    async ensureFileSystem(){
        var actorFolders = Array.from(game.actors.folders);

        const pawnFolder = "Pawns";
        const worldInventoryFolder = "World Inventory";

        var hasPawnFolder = false;
        var hasWorldInvFolder = false;

        var duplicateFolders = [];



        for(var i = 0; i < actorFolders.length; i++){
            var folderName = actorFolders[i].name;
            console.log(actorFolders[i]);
            if(folderName === pawnFolder){
                if(hasPawnFolder){
                    duplicateFolders.push(actorFolders[i].id);
                }
                hasPawnFolder = true;
            }
            else if(folderName === worldInventoryFolder){
                if(hasWorldInvFolder){
                    duplicateFolders.push(actorFolders[i].id);
                }
                hasWorldInvFolder = true;
            }
        }

        if(!hasPawnFolder){
            await this.createActorFolder(pawnFolder);
        }

        if(!hasWorldInvFolder){
            await this.createActorFolder(worldInventoryFolder);
        }

        var scenes = Array.from(game.scenes);
        for(var i = 0; i < scenes.length; i++){
            var scene = scenes[i];
            if(!this.GetSceneFolder(scene)){
                var sceneFolderId = await this.createActorFolder("Scene: "+scene.name);
                scene.setFlag("rimtop","sceneFolder",sceneFolderId._id);
            }
        }
        //game.folders.createDocument()
    }

    async createToken(actor, scene, x, y){
        var originalscene;
        if(game.canvas.scene.id != scene.id){
            originalscene = game.canvas.scene;
            scene = await scene.activate();
        }
        var canvas = game.canvas;
        var tokenLayer = canvas.getCollectionLayer("tokens");
        const td = await actor.getTokenDocument({
            hidden: false,
            sort: Math.max(tokenLayer.getMaxSort() + 1, 0)
          }, {parent: canvas.scene});

        let position = {x: x, y: y};
        await td.updateSource(position);
        if ( !canvas.dimensions.rect.contains(td.x, td.y) ) return false;
        tokenLayer.activate();
        var token =await td.constructor.create(td, {parent: canvas.scene});
        
        await token.update({actorLink: true});
        console.log(token);
        if(originalscene){
            await originalscene.activate();
        }
        else{
            canvas.pan(x,y);

        }
        return token;
    }

    async createActorFolder(name){
        var folderData = {
            name: name,
            type: "Actor"
        };
        var context ={
            parent: null,
            pack: "",
            strict: false
        };
        var folder = await Folder.create(folderData,context);
        await game.actors.createDocument(folderData,context);
        return folder;
    }

    GetActorFolderById(id){
        return game.actors.folders.get(id);
    }

    GetActorFolderByName(name){
        var actorFolders = Array.from(game.actors.folders);
        for(var i = 0; i < actorFolders.length; i++){
            if(actorFolders[i].name === name){
                return actorFolders[i];
            }
        }

        return null;
    }

    GetSceneFolder(scene){
        var folderId = scene.getFlag("rimtop","sceneFolder");
        if(!folderId){
            return null;
        }
        return this.GetActorFolderById(folderId);
    }

    GetPawnsFolder(){
        const pawnFolder = "Pawns";
        return this.GetActorFolderByName(pawnFolder);
    }

    GetWorldInventoryFolder(){        
        const worldInventoryFolder = "World Inventory";
        return this.GetActorFolderByName(worldInventoryFolder);
    }

    async RestartRimWorldApplication(){
        let result =  this.SendHttpRequest("POST","restart");        
        await new Promise(resolve => setTimeout(resolve, 100));
        await CONFIG.HttpRequest.ConnectToRimWorldApp();
        return result;
    }

    OpenTimeControls(){
        let timeControls = new TimeControls();
        timeControls.render({force:true});
    }

    async DoTurnCycle(){
        let timeControls = new TimeControls();
        timeControls.render({force:true});
        timeControls.DoTicks(360);
    }

    TimeControlsEventSource(timeControlOnAction){
        this.eventSource  = new EventSource(url+"timeControlsBackChannel");
        this.eventSource.onmessage = function(event){
            timeControlOnAction(event.data);
        }
        this.eventSource.onerror  = function(event){
            console.log(event);
        }
    }

    CloseEventSource(){
        this.eventSource.close();
    }

    async SendHttpRequest(method,page,...args){

        let parameters = null;
        let counter = 1;

        for (let i = 0; i < args.length; i++) {
            if(args[i] !=null){
                if(parameters == null){
                    parameters = "?"
                }
                else{
                    parameters += "&"
                }
                parameters+="arg"+String(counter)+"="+String(args[i]);
                counter++;
            }
        }

        if(parameters == null){
            parameters = ""
        }
        let httpLink = url+String(page)+parameters;
        let res = await this.GMExeHttpRequest(String(method),httpLink);
        return res.currentTarget.response;
    }

    async GMExeHttpRequest(method,page){
        return await new Promise((resolve,reject)=>{
            let Http = new XMLHttpRequest();

            Http.open(method,page);
            Http.onloadend=resolve;
            Http.onerror=reject;
            Http.ontimeout=reject;
            Http.onabort=reject;
            Http.send();
        });
    }

    GetActorByThingId(thingId){
        let existingActors = this.getAllActors();
        
        for (let i = 0; i < existingActors.length; i++){
            let existingActor = existingActors[i];
            if(existingActor.system.thingID ===thingId){
                return existingActor._id;
            }
        }
        return null;
    }

    async SyncAllDataToRimWorldApp(){
        console.log("### Foundry-RimWorld Sync Started. ###");
        let existingScenes = this.getAllScenes();
        let existingTokens = this.getAllTokens(true);
        let existingActors = this.getAllActors();
        // step 1 check for maps
        //      - in foundry scenes have names. In RimWorld, indexes.
        //      - make sure all scenes in foundry have a map of the correct size in RimWorld.
        //      - Extras in RimWorld should be deleted, with things send to world inventory or world pawns (except projectiles & fire)
        await this.validateScenes(existingScenes);

        // step 2 check for things (actors)
        //      - make sure all the actors in foundry exist as Things in RimWorld.
        //      - actors in foundry that do not exist in RimWorld should be logged to the chat and created if possible.
        //      - things in RimWorld that do not exist in Foundry should be created in foundry & logged to the chat.
        await this.validateActors(existingActors);

        // step 3 check for spawned 
        //      1. Handling Spawned Things in RimWorld.
        //          - spawned things in rimworld maps should be validated in foundry.
        //              1. if no token for the thing exists in the corresponding foundry scene, despawn it in RimWorld.
        //              2. if the token exists in foundry and rimworld, remove it from the unhandled foundry tokens.

        //      2. Handling Foundry Tokens. (Spawned in Foundry but not in RimWorld)
        //        - spawned things may only have single spawned instance in rimworld.
        //        - where possible spawn things in rimworld on their correct maps.
        //        - in the case of duplicate actors;
        //            1. Remove any scenes without any users viewing them (connected or disconnected).
        //                if not one scene left.
        //                2. Remove any scenes with disconnected users viewing them.
        //                    if not one scene left.
        //                    3. if the GM is connected & viewing the actor, spawn the Thing on the GM Viewed scene.
        //                        if GM is not connected or not viewing the actor.
        //                        4. Pick the scene with the most current views by connected users, use GM as a tie breaker or disconnected users.
        //                            if not one scene left.
        //                            5. remove all Tokens in foundry & DeSpawn the object in RimWorld.

        await this.validateSpawnStatus(existingTokens);

        console.log("### Foundry-RimWorld Sync completed. ###");
        await CONFIG.HttpRequest.SetCurrentMap(game.users.activeGM.viewedScene);

        await this.refreshAllActors();
    }

    async refreshAllActors(){
        console.log("Actors refresh started!");
        let existingActors = this.getAllActors();
        let thingIds = [];
        for(let i = 0; i < existingActors.length; i++){
            thingIds.push(existingActors[i].system.thingID);
        }

        let updates = JSON.parse(await CONFIG.HttpRequest.RefreshAllActors(JSON.stringify(thingIds)));
        let keys = Object.keys(updates);


        for (let i = 0; i < keys.length; i++){
            var id = keys[i];
            

            var actor = existingActors.find((element)=>element.system.thingID === id);
            if(!actor){
                console.log("Returned thing id not found while refreshing all!",id);
                continue;
            }
            var update = updates[id];
            await actor.updateFrom(update);
        }

        console.log("Actors refresh complete!");
    }

    getAllScenes(){
        let allScenes=[];
        for (let i = 0; i < game.scenes.apps[1].documents.length; i++){
            allScenes.push(game.scenes.apps[1].documents[i]);
        }
        return allScenes;
    }

    getAllTokens(onlyLinked){

        let validActors = this.getAllActors();
        let validTokens = [];
        for(let j = 0; j < validActors.length; j++){
            let tokens = validActors[j].getAllSpawnedLinkedTokens();
            for (let i = 0; i < tokens.length; i++){
                let actorType = game.actors.get(tokens[i].actorId).type;
                if(actorType === "thing"||actorType ==="pawn"|| actorType ==="player" || actorType==="npc"){
                    validTokens.push(tokens[i]);
                }
            }
        }
        return validTokens;
    }

    getAllActors(){
        let allActors = [];
        for (let i = 0; i < game.actors.apps.length; i++){
            for(let j = 0; j < game.actors.apps[i].documents.length; j++){
                let actorType = game.actors.apps[i].documents[j].type;
                if(actorType === "thing"||actorType ==="pawn"|| actorType ==="player" || actorType==="npc"){
                    allActors.push(game.actors.apps[i].documents[j]);
                }
            }
        }
        return allActors;
    }

    async validateScenes(existingScenes){
        console.log("Validating Scenes...")
        let scenesForRW=[];
        for (let i = 0; i < existingScenes.length; i++){
            let scene = existingScenes[i];
            let dimensions = this.getSceneSize(scene);
            let mapData = {
                Id: scene._id,
                X: dimensions[0],
                Y: dimensions[1]
            }

            scenesForRW.push(JSON.stringify(mapData));

        }
        let response =JSON.parse(await CONFIG.HttpRequest.SyncMaps(JSON.stringify(scenesForRW)));
        let mapsWithIssues = 0;
        for (let i = 0; i < response.length; i++){
            let sceneResult = response[i];
            if(sceneResult.Issues){
                mapsWithIssues++;
                if(sceneResult.ModifiedSize){
                    console.log(sceneResult.Id, " modified size");
                }
                if(sceneResult.Created){
                    console.log(sceneResult.Id, " created");
                }
                if(sceneResult.Deleted){
                    console.log(sceneResult.Id, " Deleted");
                }
            }
        }
        console.log(String(response.length - mapsWithIssues)," maps validated without issues");
        console.log(String(mapsWithIssues)," maps validated with issues");
    }

    getSceneSize(scene){
        let curDimensions =scene.dimensions;
        let x = curDimensions.columns;
        let y = curDimensions.rows;
        //let squareSize = curDimensions.distancePixels;
        //x = x / squareSize;
        //y = curDimensions.rows - 1 - (y / squareSize);
        return [x,y];
    }

    async createActorThingRaw(thingData,img,folder){
        var actor = await ActorThing.create({
            name: thingData.Label,
            type: thingData.Pawn ? "pawn":"thing",
            img: img,
            folder: folder
        });
        actor = await actor.setThingId(thingData.ThingId);
        actor = await actor.setThingDef(thingData.ThingDef);
        
        console.log("Created new Actor ",thingData.Label, " for ThingDef: ",thingData.ThingDef," Thing Id: ",thingData.ThingId);
        return actor;
    }

    async createActorThing(thingData){
        if(thingData.Pawn){
            return await this.createActorThingRaw(thingData,"icons/svg/mystery-man.svg",this.GetPawnsFolder());
        }
        else{

            return await this.createActorThingRaw(thingData,"icons/svg/item-bag.svg",this.GetWorldInventoryFolder());
        }
    }

    async handleDroppedThing(thingDropResult, allowSpawn = true){
        console.log(thingDropResult);
        if(!thingDropResult.Success){
            return null;
        }
        var existingActor = this.GetActorByThingId(thingDropResult.ThingData.ThingId)
        if(existingActor){
            return game.actors.get(existingActor);
        }
        if(thingDropResult.SentToWorld){
            return await this.createActorThing(thingDropResult.ThingData);
        }
        else if(thingDropResult.SentToMap){
            var scene = game.scenes.get(thingDropResult.MapFoundryId);
            if(scene){
                var folderId = scene.getFlag("rimtop","sceneFolder");
                var folder = this.GetActorFolderById(folderId);
                var actor;
                if(folder){
                    actor = await this.createActorThingRaw(thingDropResult.ThingData,thingDropResult.ThingData.Pawn ? "icons/svg/mystery-man.svg": "icons/svg/item-bag.svg",folder);
                    if(allowSpawn){
                        var scenePos = this.convertFromRimWorldCoordinates(scene,thingDropResult.X,thingDropResult.Y);
                        await this.createToken(actor, scene, scenePos[0], scenePos[1]);
                    }
                }
                else{
                    actor = await this.createActorThing(thingDropResult.ThingData);
                    console.warn("Actor should go to scene folder but couldn't find the folder for",scene.name, ",sent it to default folder for actor type", scene);
                }
                return actor;
            }
            else{
                var actor = await this.createActorThing(thingDropResult.ThingData);
                console.warn("Actor", actor._id,"should go to scene folder but couldn't find scene",thingDropResult.MapFoundryId, ",sent it to world instead");
                await CONFIG.HttpRequest.SendThingToWorldDirect(thingDropResult.ThingData.ThingId,-1);
                console.warn("Called SendToWorldDirect but there is no handling in the case the thing is merged or otherwise destroyed.");
                return actor;
            }
        }
    }

    convertFromRimWorldCoordinates(scene,x, y){
        let curDimensions = scene.dimensions;
        let squareSize = Math.floor(curDimensions.distancePixels);
        y = Math.abs(y + 1 - Math.floor(curDimensions.rows));
        y = y * squareSize;
        x = x * squareSize;
        return [x, y];
    }

    async validateActors(existingActors){
        console.log("Validating Actors...");
        let allThings = JSON.parse(await CONFIG.HttpRequest.GetAllThings());
        console.log(String(allThings.length)," existing things in RW Save");
        let thingSet = new Set(allThings);

        // see what actors exist in rimworld and foundry
        let noneExistingActorIds = [];
        let existingActorIds = [];
        for (let i = 0; i < existingActors.length; i++){
            let existingActor = existingActors[i];
            if(!thingSet.has(existingActor.system.thingID)){
                noneExistingActorIds.push(existingActor._id);
            }
            else{
                existingActorIds.push(existingActor._id);
                thingSet.delete(existingActor.system.thingID);
            }
        }
        console.log(String(existingActorIds.length)," existing actors matched things in RW Save");
        console.log(String(noneExistingActorIds.length)," existing actors had no thing in RW Save");

        if(existingActorIds.length === allThings.length && noneExistingActorIds.length === 0){
            // number of actors in foundry matches number of things in rimworld. return now.
            console.log("Validated all Actors and Things successfully.")
            return;
        }
        if(noneExistingActorIds.length > 0){
            // some actors in foundry do not exist in rimworld
            console.log("Try to resolve missing Actors...");

            let missingThings = [];
            for (let i = 0; i < noneExistingActorIds.length; i++){
                let missingActor = game.actors.get(noneExistingActorIds[i]);
                let data ={
                    "ThingDef":missingActor.system.thingDef,
                    "ThingId":missingActor.system.thingID,
                    "ActorId":noneExistingActorIds[i]
                };
                missingThings.push(JSON.stringify(data));
            }
            let resolvedThings = JSON.parse(await CONFIG.HttpRequest.GetResolveMissingThings(JSON.stringify(missingThings)));
            console.log(String(resolvedThings.CreatedThings.length), " things created");
            console.log(String(resolvedThings.OptNoCreate.length), " things opted to not create");

            for(let i = 0; i< resolvedThings.CreatedThings.length; i++) {
                let response = resolvedThings.CreatedThings[i];
                let actor = game.actors.get(response.ActorId);
                if(response.Merged && actor.system.thingID !== response.ThingId){
                    await actor.delete();
                    var mergedActorId = this.GetActorByThingId(response.ThingId);
                    if(mergedActorId){
                        var mergedActor = game.actors.get(mergedActorId);
                        await mergedActor.updateDisplayedName();
                    }
                    console.log("thing resolved req for",response.ActorId, "was resolved by merge into",response.ThingId,"unresolved actor has been deleted.");
                }
                else{
                    await actor.setThingId(response.ThingId);
                    await actor.setThingDef(response.ThingDef);
                    console.log("thing ",response.ThingDef, " created."," ThingId: ", response.ThingId," Actor Id: ", response.ActorId, );    
                }
                
            }

            for(let i = 0; i< resolvedThings.OptNoCreate.length; i++) {
                let response = resolvedThings.OptNoCreate[i];
                let actor = game.actors.get(response.ActorId);
                if(actor.type ==="thing"){
                    actor.delete();
                    console.log("thing ",response.ThingDef, " not created. Reason: ",response.RejectReason," Deleted Actor.");
                }
                else if(actor.type === "pawn"){
                    console.log("pawn ",response.ThingDef, " not created. Reason: ",response.RejectReason," Preserved Actor as it is a pawn.");
                }
            }
        }
        
        
        if(existingActorIds.length < allThings.length){
            // some thing in rimworld do not exist in foundry
            console.log("Resolving missing things...");
            let missingActors = Array.from(thingSet);
            let missingActorData = JSON.parse(await CONFIG.HttpRequest.GetMissingActorData(JSON.stringify(missingActors)));
            console.log(String(missingActorData.length)," missing actors");
            for(let i = 0; i< missingActorData.length; i++){
                await this.createActorThing(missingActorData[i]);
            }
        }
        console.log("Validated all Actors and Things successfully.")
    }

    async validateSpawnStatus(existingTokens){
        console.log("Validating Link/Spawn Status of tokens...");
        console.log(existingTokens);
        // step 3 check for spawned 
        let handledTokens = [];
        
        //   1. Handling Spawned Things in RimWorld.
        //       - spawned things in rimworld maps should be validated in foundry.
        //           1. if no token for the thing exists in the corresponding foundry scene, despawn it in RimWorld.
        //           2. if the token exists in foundry and rimworld, remove it from the unhandled foundry tokens.

        // 1.1
        let spawnedThingsInRimWorld = JSON.parse(await CONFIG.HttpRequest.GetSpawnedThings());
        console.log(String(spawnedThingsInRimWorld.length)," things spawned in rimworld");
        let thingsToDespawnInRimWorld =[];

        for(let i = 0; i< spawnedThingsInRimWorld.length; i++){
            let cur = spawnedThingsInRimWorld[i];
            let token = existingTokens.find((element)=>game.actors.get(element.actorId).system.thingID == cur.ThingId && element.parent._id === cur.MapId);
            
            if(token){
                // 1.2
                handledTokens.push(token);
                //token.registerTokenToActorNow();
            }
            else{
                var actorId = this.GetActorByThingId(cur.ThingId);
                var scene = game.scenes.get(cur.MapId);
                if(actorId && scene){
                    var actor = game.actors.get(actorId);
                    if(!actor.system.spawned){
                        var pos = this.convertFromRimWorldCoordinates(cur.X,cur.Y);
                        await this.createToken(actor,scene,pos[0],pos[1]);
                    }
                }
                else{
                    thingsToDespawnInRimWorld.push(cur.ThingId);
                }
            }
        }

        
        
        //console.log(String(thingsToDespawnInRimWorld.length)," things to despawned in rimworld");
        console.log("Checking for duplicated linked tokens..");
        let existingActors = this.getAllActors();
        let actorsWithMoreThanOneToken = [];
        for(let i = 0; i< existingActors.length; i++){
            let activeTokens = existingActors[i].getAllSpawnedLinkedTokens(true);
            if(activeTokens.length > 1){
                actorsWithMoreThanOneToken.push(existingActors[i].id);
            }
        }
        console.log(String(actorsWithMoreThanOneToken.length)," duplicate linked tokens");

        if(actorsWithMoreThanOneToken.length !== 0){

            let viewedScenesConnectedAndDisconnected = this.getViewedScenes(false);
            let viewedScenesDisconnectedOnly = this.getViewedScenes(true);

            for(let i = 0; i < actorsWithMoreThanOneToken.length; i++){
                let duplicateTokenActor = game.actors.get(actorsWithMoreThanOneToken[i]);

                let duplicateTokens = duplicateTokenActor.getAllSpawnedLinkedTokens(true);
                
                console.log("Duplicate Stage 1");
                // 2.1
                for(let j = 0; j < duplicateTokens.length;j++){
                    let tokenSceneId = duplicateTokens[j].parent._id;
                    if(!viewedScenesConnectedAndDisconnected.includes(tokenSceneId)){
                        duplicateTokens[j].update({actorLink: false});
                    }
                }

                // 2.2
                duplicateTokens = duplicateTokenActor.getAllSpawnedLinkedTokens(true);
                if(duplicateTokens.length > 1){
                    console.log("proceeding to duplicates stage 2 | " ,String(duplicateTokens.length)," duplicate tokens for actor ",actorsWithMoreThanOneToken[i]);
                    for(let j = 0; j < duplicateTokens.length;j++){
                        let tokenSceneId = duplicateTokens[j].parent._id;
                        if(viewedScenesDisconnectedOnly.includes(tokenSceneId)){
                            duplicateTokens[j].update({actorLink: false});
                        }
                    }
                    duplicateTokens = duplicateTokenActor.getAllSpawnedLinkedTokens(true);
                    // 2.3
                    if(duplicateTokens.length > 1){
                        console.log("proceeding to duplicates stage 3 | " ,String(duplicateTokens.length)," duplicate tokens for actor ",actorsWithMoreThanOneToken[i]);
                        if(game.users.activeGM.active){
                            let gmScene = game.users.activeGM.viewedScene;
                            for(let j = 0; j < duplicateTokens.length;j++){
                                let tokenSceneId = duplicateTokens[j].parent._id;
                                if(gmScene === tokenSceneId){
                                    duplicateTokens[j].update({actorLink: false});
                                }
                            }
                        }
                        // 2.4
                        duplicateTokens = duplicateTokenActor.getAllSpawnedLinkedTokens(true);
                        if(duplicateTokens.length > 1){
                            console.log("proceeding to duplicates stage 4 | Still " ,String(duplicateTokens.length)," duplicate tokens for actor ",actorsWithMoreThanOneToken[i]);
                            let mostViewedToken = null;
                            let mostViews = -1;                            
                            for(let j = 0; j < duplicateTokens.length;j++){
                                let tokenSceneId = duplicateTokens[j].parent._id;
                                let curViews = this.getSceneViewCount(tokenSceneId);
                                if(mostViews < curViews){
                                    mostViews = curViews;
                                    mostViewedToken = duplicateTokens[j]._id;
                                }
                                if(mostViews == curViews && game.users.activeGM.viewedScene === tokenSceneId){
                                    mostViewedToken = duplicateTokens[j]._id;
                                }
                            }

                            for(let j = 0; j < duplicateTokens.length;j++){
                                if(mostViewedToken !== duplicateTokens[j]._id){
                                    duplicateTokens[j].update({actorLink: false});
                                }
                            }
                            duplicateTokens = duplicateTokenActor.getAllSpawnedLinkedTokens(true);
                            // 2.5
                            if(duplicateTokens.length > 1){
                                console.log("Failed to resolve duplicates, breaking all links & ensuring despawned in RW");
                                for(let j = 0; j < duplicateTokens.length;j++){
                                    duplicateTokens[j].update({actorLink: false});
                                }
                                let thingId = duplicateTokenActor.system.thingID;
                                if(!thingsToDespawnInRimWorld.includes(thingId)){
                                    thingsToDespawnInRimWorld.push(thingId);
                                }
                            }
                            else{
                                console.log("Resolved duplicates for ",actorsWithMoreThanOneToken[i], " at stage 4");
                            }
                        }
                        else{
                            console.log("Resolved duplicates for ",actorsWithMoreThanOneToken[i], " at stage 3");
                        }
                    }
                    else{
                        console.log("Resolved duplicates for ",actorsWithMoreThanOneToken[i], " at stage 2");
                    }
                }
                else{
                    console.log("Resolved duplicates for ",actorsWithMoreThanOneToken[i], " at stage 1");
                }
            }
        }        
        else{
            console.log("No duplicate Tokens detected.");
        }
        
        console.log(String(thingsToDespawnInRimWorld.length)," things to despawn in rimworld");
        if(thingsToDespawnInRimWorld.length > 0){
            var results = JSON.parse(await CONFIG.HttpRequest.DespawnThing(JSON.stringify(thingsToDespawnInRimWorld)));
            for(var i = 0; i < results.length; i++){
                var result = results[i];
                if(result.Success){
                    var resultId = result.ResultThingId
                    if(result.Merged){
                        var thingActor = game.actors.get(CONFIG.csInterOP.GetActorByThingId(resultId));
                        if(thingActor){
                            await thingActor.updateDisplayedName();
                        }
                    }  
                    if(result.Merged || result.Destroyed){
                        
                        var originalActor = game.actors.get(CONFIG.csInterOP.GetActorByThingId(thingsToDespawnInRimWorld[i]));
                        if(originalActor){
                            await originalActor.delete();
                        } 
                    }
                }
            }
            console.log("Despawned things.");
        }

        console.log("Validating Tokens iteration 2...");
        existingTokens = this.getAllTokens(true);
        let unhandledTokens = [];
        for(let i = 0;i < existingTokens.length; i++){
            if(!handledTokens.includes(existingTokens[i])){
                unhandledTokens.push(existingTokens[i]);
            }
        }


        if(unhandledTokens.length > 0){
            console.log(String(unhandledTokens.length)," tokens still unhandled.");
            let thingsToSpawn= [];
            for(let i = 0;i < unhandledTokens.length; i++){
                let token = unhandledTokens[i];
                let pos = token.getRimworldCoordinates();
                let data ={
                    MapId: token.parent._id,
                    ThingId: game.actors.get(token.actorId).system.thingID,
                    X: pos[0],
                    Y: pos[1]
                };
                thingsToSpawn.push(data);
                console.log(data);
            }
            console.log(String(thingsToSpawn.length)," things to spawn");

            var results = JSON.parse(await CONFIG.HttpRequest.SpawnThings(JSON.stringify(thingsToSpawn)));

            for(let i = 0; i < results.length; i++){
                var targetActor = game.actors.get(unhandledTokens[i].actorId);
                await targetActor.processSpawnResult(unhandledTokens[i],results[i]);
            }

            console.log("Spawned things.");
        }

        console.log("Validating Tokens iteration 3...");
        console.log("Validating Tokens position");
        existingTokens = this.getAllTokens(true);

        let tokenPositions = [];

        for(let i = 0;i < existingTokens.length; i++){
            let position =existingTokens[i].getRimworldCoordinates();
            let moveReq ={
                ThingId: existingTokens[i].actor.system.thingID,
                X: position[0],
                Y: position[1]
            };
            tokenPositions.push(JSON.stringify(moveReq));
        }
        
        let response=JSON.parse(await CONFIG.HttpRequest.SetPositionBulk( JSON.stringify(tokenPositions)));

        for(let i = 0;i < existingTokens.length; i++){
            let element = JSON.parse(response[i]);
            existingTokens[i].SetPosition(element.X,element.Y);
        }

        console.log("Token Link/Spawn validated.");




        // ## Rethink. Tokens have a actorLink property. use this to determine spawn condition and to force a spawn on a certain map.
        // ## multiple tokens can be actor linked, but we shall make it so only one at a time is.

        //  2. Handling Foundry Tokens. (Spawned in Foundry but not in RimWorld)
        //    - spawned things may only have single spawned instance in rimworld.
        //    - where possible spawn things in rimworld on their correct maps.
        //    - in the case of duplicate actors;
        //        1. Remove any scenes without any users viewing them (connected or disconnected).
        //            if not one scene left.
        //            2. Remove any scenes with disconnected users viewing them.
        //                if not one scene left.
        //                3. if the GM is connected & viewing the actor, spawn the Thing on the GM Viewed scene.
        //                    if GM is not connected or not viewing the actor.
        //                    4. Pick the scene with the most current views by connected users, use GM as a tie breaker or disconnected users.
        //                        if not one scene left.
        //                        5. remove all Tokens in foundry & DeSpawn the object in RimWorld.
    }

    getViewedScenes(disconnectedPlayersOnly){
        let users = game.users.apps;
        let viewedScenes = [];
        for(let i = 0; i < users.length; i++){
            if(disconnectedPlayersOnly && !users[i].active){
                viewedScenes.push(users[i].viewedScene);
            }
            else if(!disconnectedPlayersOnly){
                viewedScenes.push(users[i].viewedScene);
            }
        }
        return viewedScenes;
    }

    getSceneViewCount(sceneId){
        let users = game.users.apps;
        let views = 0;
        for(let i = 0; i < users.length; i++){
            if(users[i].viewedScene == sceneId){
                views++;
            }
        }
        return views;
    }

    chatTemplates={
        "stat-roll":"systems/rimtop/templates/ChatMessages/stat-roll.hbs"
    };

    async processChatMessage(rollResult,originatingActor,templateKey){
        
        let chatData ={
            user:game.user._id,
            speaker:ChatMessage.getSpeaker({ actor: originatingActor, token: originatingActor.token }),
            content:await renderTemplate(this.chatTemplates[templateKey],rollResult)
        };

        ChatMessage.create(chatData);
    }
}

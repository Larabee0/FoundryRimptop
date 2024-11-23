export class BaseToken extends TokenDocument{

    _initialize(options){
        super._initialize(options);
        //console.log("custom token doc init");
    }

    prepareData(){
        return super.prepareData();
        
    }

    _onCreate(data,options,userId){
        super._onCreate(data,options,userId);
        
        if(game.user._id===userId){
            //console.log("Editor client!");
            if(data.actorLink){
                this.update({actorLink: false});
            }
        }
    }

    async _onDelete(options,userId){
        super._onDelete(options,userId)
        
        if(game.user._id===userId){
            //console.log("Editor client!");
            if(this.actorLink){
                let actor = game.actors.get(this.actorId);
                actor.setSpawned(false);
            }
        }
    }

    async _preUpdate(changed,options,userId){
        
        if(game.user._id===userId){
            //console.log("Editor client!");

            let actor = game.actors.get(this.actorId);
            if(actor.system.thingID !=="uncreatedThing"){

                actor._registerDependentToken(this);
                
                // guard against token linking to uncreated things.
                if("actorLink" in changed){
                    if(changed.actorLink){
                        await actor.clearSpawnedTokens();
                    }
                }
            }
        }
        return super._preUpdate(changed,options,userId);
    }

    registerTokenToActorNow(){
        let actor = game.actors.get(this.actorId);
        actor._registerDependentToken(this);
    }

    async _onUpdate(changed,options,userId){
        super._onUpdate(changed,options,userId);
        
        if(game.user._id===userId){
            //console.log("Editor client!");
            //console.log("customTokenUpdate");
            //console.log(changed);
            let actor = game.actors.get(this.actorId);
            actor._registerDependentToken(this);


            // guard against token linking to uncreated things.
            if(actor.system.thingID === "uncreatedThing"){
                if("actorLink" in changed && changed.actorLink){
                    this.update({actorLink: false});
                }                
                return;
            }

            if(!("preventSync" in changed)&&("y" in changed || "x" in changed)){
                if(this.actorLink){

                    let newX = changed.x ? changed.x : this.x;
                    let newY = changed.y ? changed.y : this.y;

                    let position = this.convertToRimWorldCoordindates(newX,newY);
                    let moveReq ={
                        ThingId: actor.system.thingID,
                        X: position[0],
                        Y: position[1]
                    }

                    let newPos =JSON.parse(await CONFIG.csInterOP.SetPosition(JSON.stringify(moveReq)));
                    this.SetPosition(newPos.X,newPos.Y);
                }
            }

            if("actorLink" in changed){
                //console.log("Actor link satus changed");
                if(changed.actorLink){
                    await actor.setSpawned(true);
                }
                else{
                    await actor.setSpawned(false);
                }
            }
        }
    }

    isAdjacentTo(token){
        let ourPos = this.getRimworldCoordinates();
        let targetPos = token.getRimworldCoordinates();

        for(let x = ourPos[0] - 1; x < ourPos[0]+1; x++){
            for(let y = ourPos[1]-1;y<ourPos[1]+2;y++){
                if(x === targetPos[0] && y === targetPos[1])    {
                    return true;
                }
            }
        }

        return false;
    }

    getRimworldCoordinates(){
        return this.convertToRimWorldCoordindates(this.x,this.y);
    }

    convertToRimWorldCoordindates(x,y){

        x = Math.floor(x);
        y = Math.floor(y);

        let curDimensions =game.scenes.viewed.dimensions;
        let squareSize = Math.floor(curDimensions.distancePixels);
        x = x / squareSize;
        y = Math.floor(curDimensions.rows) - 1 - (y / squareSize);

        x = x >= 0 ? Math.floor(x) : Math.ceil(x);
        y = y >= 0 ? Math.floor(y) : Math.ceil(y);

        return [x,y];
    }

    convertFromRimWorldCoordinates(x,y){


        let curDimensions =game.scenes.viewed.dimensions;
        let squareSize = Math.floor(curDimensions.distancePixels);
        y = Math.abs(y +1- Math.floor(curDimensions.rows));
        y = y * squareSize;
        x = x * squareSize;
        return [x,y];
    }

    SetPosition(x,y){
        let res = this.convertFromRimWorldCoordinates(x,y);
        if(this.x !== res[0] || this.y !== res[1]){
            this.update({x: res[0],y: res[1], preventSync:true});
        }
    }
}
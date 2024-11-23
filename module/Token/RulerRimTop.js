export class RulerRimTop extends Ruler{

    async _postMove(token){

        let actorId = token.document.actorId;
        let actor = game.actors.get(actorId);
        console.log("move token",actor,this.totalDistance);
        if(actor.type==="pawn"){
            let addedCost = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("POST","tryAddTokenMoveCost",actor.system.thingID,this.totalDistance));
            if(addedCost){
                await actor.updateCombat();
            }
        }
    }
}
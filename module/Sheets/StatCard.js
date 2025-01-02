
import { ThingMoreMenu } from "../Sheets/Forms/ThingMoreMenu.js";

export class StatCard{
    defaultStatCategory = "Basics";
    defaultStatIndex = 0;
    scrollTop = 0;
    scrollLeft = 0;

    hyperLinkChange = false;
    hyperlinkHistoryStack = [];
    hyperLinkCached={}

    ownerSheet;
    boundActor;

    searchValue;

    thingData = {};

    constructor(ownerSheet,boundActor,thingData){
        this.ownerSheet = ownerSheet;
        this.boundActor = boundActor;
        
        this.thingData = thingData;
    }

    async _prepareContextStatCard(context){
        
        if(this.boundActor && (this.boundActor.type ==="thing" || this.boundActor.type ==="pawn")){
            if("noneStat" in this.boundActor.system.statCard){
                await this.boundActor.updateStats();
            }
            
            this.thingData = structuredClone(this.boundActor.system.statCard);
        }
        else{
        }
        if(Object.keys(this.thingData).length ===0){
            return context;
        }
        context.system.statCard = this.thingData;
        
        return await this.#internalContext(context);
    }

    async #internalContext(context){
        
        context.system.statCard.hideRefresh = this.boundActor ? true : false;
        if(this.hyperLinkChange){
            if(this.hyperlinkHistoryStack.length > 0){
                this.hyperLinkCached = JSON.parse(await CONFIG.csInterOP.ResolveStatHyperLink(this.hyperlinkHistoryStack[this.hyperlinkHistoryStack.length-1]));
            }
            this.defaultStatCategory = "Basics";
            this.defaultStatIndex = 0;
            this.hyperLinkChange = false;
            this.scrollPos = 0;
            this.scrollLeft = 0;
        }

        if(this.hyperlinkHistoryStack.length === 0){
            this.hyperLinkCached = {};
            context.system.statCard = this.thingData;
        }
        else{
            
            context.system.statCard = this.hyperLinkCached;
            context.system.statCard.inHyperLink= true;
        }
        
        context.system.statCard.defaultStatCategory = this.defaultStatCategory;
        context.system.statCard.defaultStatIndex = this.defaultStatIndex;
        console.log(context);
        //console.log(this.hyperlinkHistoryStack);
        //console.log(this.hyperLinkCached);
        return context;
    }

    statCardOnRender(){
        this.ownerSheet.element.querySelector("input[name=filter_field]").addEventListener("keyup",this.filterFn.bind(this));

        let scrollContainer = this.ownerSheet.element.querySelector("[id=list_table]");
        if(scrollContainer){
            scrollContainer.scrollTo({top:this.scrollTop,left:this.scrollLeft,behavior:"auto"});
        }

        if(this.searchValue){
            this.ownerSheet.element.querySelector("input[name=filter_field]").value = this.searchValue;
            this.filterFn(); // call filterFn to actually filter the elements.
        }
        
        let statsRows = this.ownerSheet.element.getElementsByClassName("stat-item-container");
        if(statsRows){
            for(let i = 0; i < statsRows.length; i++){
                statsRows.item(i).addEventListener("click",this.inspectStat.bind(this));
            }
        }

        let hyperlinks = this.ownerSheet.element.getElementsByClassName("hyperlink-label");
        if(hyperlinks){            
            for(let i= 0; i<hyperlinks.length;i++){
                hyperlinks.item(i).addEventListener("click",this.defHyperlink.bind(this));
            }
        }

        let backButton = this.ownerSheet.element.querySelector("[name=back-button]");
        if(backButton){            
            backButton.addEventListener("click",this.popHyperLink.bind(this));
        }
        let transferButton = this.ownerSheet.element.querySelector("[name=transfer-button]");
        if(transferButton){            
            
            transferButton.addEventListener("click",this.transferItem.bind(this));
        }

        let rollButton = this.ownerSheet.element.getElementsByClassName("rollable-stat-button");
        if(rollButton){            
            if(rollButton.length > 0){
                rollButton[0].addEventListener("click",this.rollStat.bind(this));
            }
        }
    }

    _onClose(){
        this.hyperlinkHistoryStack = [];
        this.hyperLinkCached = true;
    }

    async onRefreshStats(event){
        event.preventDefault();        
        await this.boundActor.updateStats();
        this.ownerSheet.render();
    }

    inspectStat(event){
        event.preventDefault();
        
        let target = event.currentTarget;
        let scrollContainer = this.ownerSheet.element.querySelector("[id=list_table]");
        this.scrollTop = scrollContainer.scrollTop;
        this.scrollLeft = scrollContainer.scrollLeft;

        this.defaultStatCategory = target.dataset.category;
        this.defaultStatIndex = target.dataset.statIndex;
        this.ownerSheet.render();
    }

    defHyperlink(event){
        event.preventDefault();

        let target = event.currentTarget;
        let hyperlinkIndex=target.dataset.hyplinkIndex;
        let dataSource = {};
        
        if(this.hyperlinkHistoryStack.length === 0){
            dataSource = this.thingData;
        }
        else{
            
            dataSource= this.hyperLinkCached;
        }
        let hyperlinkJson = dataSource.StatsInCategories[this.defaultStatCategory][this.defaultStatIndex].HyperlinkJson[hyperlinkIndex];
        this.hyperlinkHistoryStack.push(hyperlinkJson); 
        this.hyperLinkChange = true;
        this.ownerSheet.render();
    }

    popHyperLink(event){
        event.preventDefault();
       
        if(this.hyperlinkHistoryStack.length > 0){
            this.hyperlinkHistoryStack.pop();
            this.hyperLinkChange = true;
        }
        this.ownerSheet.render();
    }

    async transferItem(event){
        event.preventDefault();
        //console.log(this.boundActor.system.thingID);
        var transferMenu = new ThingMoreMenu(null,this.boundActor.system.thingID,null);
        transferMenu.render({force:true});
        
    }

    async rollStat(event){
        event.preventDefault();
        let statDefName = event.currentTarget.dataset.defName;

        let rollResult = JSON.parse(await CONFIG.csInterOP.SendHttpRequest("GET","rollStat",this.ownerSheet.actor.system.thingID,statDefName,"stat-roll"));
        CONFIG.csInterOP.processChatMessage(rollResult,this.ownerSheet.actor,"stat-roll");
    }
    
    // search filter function
    filterFn(event) {
        const input = this.ownerSheet.element.querySelector("[id=filter_field]"); // get search input
        this.searchValue = input.value; // cache search value for when render() is called.
        const filter = input.value.toLowerCase(); // set search value to lower case for string comparison.
        const table = this.ownerSheet.element.querySelector("[id=list_table]"); // get element table
        let tr = table.getElementsByTagName("tr"); // get all rows in table
    
        // Loop through all table rows, and hide those who don't match the search query
        for (let i = 0; i < tr.length; i++) {
            const td = tr[i].getElementsByTagName("td")[0]; // column to search
            if (td) {
                const txtValue = td.textContent || td.innerText;
                if (txtValue.toLowerCase().indexOf(filter) > -1) {
                    tr[i].style.display = "";
                } else {
                    tr[i].style.display = "none";
                }
            }
        }
    }
}
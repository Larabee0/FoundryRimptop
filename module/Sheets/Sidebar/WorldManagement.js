const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RimWorldManagement extends HandlebarsApplicationMixin(ApplicationV2){

    selectedSave;

    static DEFAULT_OPTIONS = {
        id: "rimworld-saves",
        tag: "form",
        form: {
          handler: RimWorldManagement.#onSubmit,
          submitOnChange: false,
          closeOnSubmit: true
        },
        window:{
            icon: "fas fa-gear",
            title: "RimWorldManagement.form.title"
        },
        actions:{
            // triggers the rerender of the window when the user selects a thing
            saveNow:RimWorldManagement.#onSaveNow,
            selectSave:RimWorldManagement.#onSelectSave,
            loadSelected:RimWorldManagement.#onLoadSelected,
            restartNow:RimWorldManagement.#onRestartNow
        }
    }

    static PARTS = {
        form: {
          id: "rimworld-saves",
          template: "systems/rimtop/templates/dialogue/RimWorldManagement.hbs"
        }
    }

    get title(){
        return "RimWorld saves"
    }



    async _preparePartContext(partId, context){

        const path = "worlds/"+game.world.id+"/RimTopSaves/Saves"
        let target = decodeURIComponent(path);

        let res = await FilePicker.browse("data",target);

        
        
        //console.log(res);

        var context = {};

        let files =[];

        
        for(let i = 0; i < res.files.length; i++){
            files.push( decodeURIComponent(res.files[i].split("/").pop()));
        }

        files.reverse();

        context.files = files;
        context.selectedSave = this.selectedSave;

        return context;
    }

    async _prepareContenxt(options){

        console.log(world);
    }

    static async #onSubmit(event, form, formData) {
        
    }

    static async #onSaveNow(event, button){
        event.preventDefault();
        await CONFIG.HttpRequest.SaveNow();
        this.render()
    }

    static async #onSelectSave(event,button){
        event.preventDefault();
        this.selectedSave=button.closest(".save-item").dataset.save;

        console.log(this.selectedSave);
        this.render()
    }

    static async #onLoadSelected(event, button){
        event.preventDefault();
        await CONFIG.HttpRequest.LoadFile(this.selectedSave);
        
    }

    static async #onRestartNow(event,button){
        event.preventDefault();
        new Dialog({
            title:"Restart RimWorld App?",
            content:"Are you sure you want to restart the RimWorld Application?",
            buttons:{
                submit:{label: "Restart", callback:async ()=>{await RimWorldManagement.restartNow()}},
                cancel:{label:"Cancel"}
            }
        }).render(true);
    }


    static async restartNow(){
        await CONFIG.csInterOP.RestartRimWorldApplication();
    }

    _onRender(context,options){

    }

    filterFn(event) {
        const input = document.getElementById("filter_field"); // get search input
        this.searchValue = input.value; // cache search value for when render() is called.
        const filter = input.value.toLowerCase(); // set search value to lower case for string comparison.
        const table = document.getElementById("list_table"); // get element table
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
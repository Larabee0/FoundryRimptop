const {HTMLField, NumberField, SchemaField, StringField,ArrayField,BooleanField,JSONField} = foundry.data.fields;

export class ThingDataModel extends foundry.abstract.TypeDataModel{
    static defineSchema(){
        return{
            health: new SchemaField({
                min:new NumberField({required: true,integer:true,min:0,initial:0}),
                value:new NumberField({required: true,integer:true,min:0,initial:100}),
                max:new NumberField({required: true,integer:true,min:0,initial:100})
            }),
            instantInitative: new SchemaField({
                min:new NumberField({required: true,integer:false,min:-3600,initial:-3600}),
                value:new NumberField({required: true,integer:false,min:-3600,initial:360}),
                max:new NumberField({required: true,integer:false,min:-3600,initial:360})
            }),
            thingDef: new StringField({required:true,initial:"unknownThingDef"}),
            thingID: new StringField({required:true,initial:"uncreatedThing"}),
            lastSpawnedToken: new StringField({required:true,initial:""}),
            spawned: new BooleanField({required:true,initial:false}),
            statCard: new JSONField({required:true,initial:"{\"noneStat\":\"no stats\"}"})
        }
    }
}
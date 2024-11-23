import { ThingDataModel } from "./ThingDataModel.js";
const {HTMLField, NumberField, SchemaField, StringField,ArrayField,BooleanField,JSONField} = foundry.data.fields;

export class PawnDataModel extends ThingDataModel{
    static defineSchema(){
        const pawnDataModel = super.defineSchema();
        return {
            ...pawnDataModel,
            customTickDuration:new NumberField({required: true,integer:true,min:1,max:360,initial:60}),
            bio: new JSONField({required:true,initial:"{\"noneBio\":\"no bio\"}"}),
            healthSummary: new JSONField({required:true,initial:"{\"noneHeatlh\":\"no health summary\"}"}),
            operationBills: new JSONField({required:true,initial:"{\"noneOperations\":\"no operation bills\"}"}),
            hediffList: new JSONField({required:true,initial:"{\"noneHediff\":\"no hediff list\"}"}),
            needsCard: new JSONField({required:true,initial:"{\"noneNeeds\":\"no needs\"}"}),
            gearCard: new JSONField({required:true,initial:"{\"noneGear\":\"no gear\"}"}),
            logCard: new JSONField({required:true,initial:"{\"noneLog\":\"no log\"}"}),
            downTimeCard: new JSONField({required:true,initial:"{\"noneDownTime\":\"no donw time\"}"}),
            combatCard: new JSONField({required:true,initial:"{\"noneCombat\":\"no combat\"}"}),
        };
    }
}

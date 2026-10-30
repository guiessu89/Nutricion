import {validMealPreset,totals} from './data.js';
export function makeMealPreset(name,meal,entries){
 const preset={id:crypto.randomUUID(),name:String(name).trim(),meal,items:entries.map(e=>({food:structuredClone(e.food),amount:e.food.basis==='portion'?e.servings:e.grams}))};
 if(!validMealPreset(preset))throw Error('Indica un nombre de hasta 120 caracteres y al menos un alimento con cantidad válida.');return preset;
}
export function presetSelection(preset){if(!validMealPreset(preset))throw Error('El preset no es válido.');return structuredClone(preset.items);}
export function presetTotals(preset){return totals(preset.items.map(item=>({food:item.food,grams:item.food.basis==='portion'?null:item.amount,servings:item.food.basis==='portion'?item.amount:null})));}

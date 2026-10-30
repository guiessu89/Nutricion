import test from 'node:test';import assert from 'node:assert/strict';import {makeMealPreset,presetSelection,presetTotals} from './presets.js';import {validBackup} from './data.js';
const entries=[{id:'old',date:'2026-05-06',meal:'Desayuno',grams:50,food:{name:'Base',kcal:200,p:10,c:20,f:5}},{grams:null,servings:2,food:{name:'Porción',basis:'portion',portionLabel:'1 unidad',kcal:100,p:4,c:10,f:2}}];
test('preset conserva alimentos y cantidades separados sin identificadores del diario',()=>{
 const preset=makeMealPreset('Habitual','Desayuno',entries);assert.equal(preset.items.length,2);assert.equal(preset.items[0].amount,50);assert.equal(preset.items[1].amount,2);assert.equal(preset.items[0].date,undefined);assert.equal(preset.items[0].id,undefined);assert.equal(presetTotals(preset).kcal,300);
 const selected=presetSelection(preset);selected[0].food.kcal=999;selected[1].amount=1;assert.equal(preset.items[0].food.kcal,200);assert.equal(preset.items[1].amount,2);entries[0].food.name='Cambiado';assert.equal(preset.items[0].food.name,'Base');
});
test('validación y compatibilidad de copias',()=>{
 const state={version:1,profile:{goal:2000,protein:120,carbs:250,fat:65},entries:[],weights:[],activities:[],custom:[]};assert.ok(validBackup(state));const preset=makeMealPreset('Habitual','Desayuno',entries);assert.ok(validBackup({...state,presets:[preset]}));assert.equal(validBackup({...state,presets:[{...preset,items:[{food:entries[0].food,amount:-1}]}]}),false);assert.throws(()=>makeMealPreset('','Desayuno',entries));assert.throws(()=>makeMealPreset('Vacío','Cena',[]));
});

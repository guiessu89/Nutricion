import test from 'node:test';import assert from 'node:assert/strict';import {csvRows,parseFatSecretCSV,mergeFatSecret} from './fatsecret.js';import {totals,validBackup} from './data.js';
// Synthetic report only: never commit a user's export as a fixture.
export const sample=`# Report\nDaily Average,Cals ( kcal),Fat( g),Carbs( g),Prot( g)\nTotal,9999,0,0,0\nDate,Cals ( kcal),Fat( g),Sat( g),Carbs( g),Fiber( g),Sugar( g),Prot( g),Sod( mg),Chol( mg),Potassium( mg)\n"Wednesday, May 6, 2026",300,10,,30,,,20,,,\n Breakfast,300,10,,30,,,20,,,\n  Example Bread,200,5,,30,,,10,100,,\n   50 g\n  Example Fruit,100,5,,0,,,10,,,\n   1 fruit\nTotal,300,10,,30,,,20,,,\n`;
const empty=()=>({version:1,profile:{goal:2000,protein:120,carbs:250,fat:65},entries:[],custom:[],weights:[],activities:[]});
test('CSV admite BOM, comas, comillas escapadas y comillas interiores en raciones',()=>{assert.deepEqual(csvRows('\uFEFF"x,y","a""b"\r\n   1 medium (2-3/4" dia)\n'),[['x,y','a"b'],['   1 medium (2-3/4" dia)']]);assert.throws(()=>csvRows('"incompleto'));});
test('importa solo alimentos y conserva totales y unidades sin inventar gramos',()=>{
 const r=parseFatSecretCSV(sample);assert.equal(r.entries.length,2);assert.deepEqual(r.days,['2026-05-06']);assert.equal(r.entries[0].meal,'Desayuno');assert.equal(r.entries[0].food.kcal,400);assert.equal(r.entries[1].grams,null);assert.equal(r.entries[1].servings,1);assert.equal(r.entries[1].food.basis,'portion');assert.equal(r.entries[1].food.fiber,null);assert.deepEqual(totals(r.entries),{kcal:300,p:20,c:30,f:10});
 const merged=mergeFatSecret(empty(),r);assert.ok(validBackup(merged.state));assert.equal(mergeFatSecret(merged.state,r).added,0);assert.equal(mergeFatSecret(merged.state,r).foodsAdded,0);assert.equal(merged.state.profile.goal,2000);
});
test('peso embebido es total y el volumen sigue siendo ración',()=>{
 const r=parseFatSecretCSV(sample.replace('   50 g','"   3 x 1 unidad, 28,8 g"').replace('   1 fruit','   250 ml'));assert.equal(r.entries[0].grams,28.8);assert.equal(r.entries[1].grams,null);assert.equal(r.entries[1].quantityLabel,'250 ml');assert.equal(Math.round(totals(r.entries).kcal),300);
});
test('las repeticiones dentro de una comida se conservan y no se duplican al reimportar',()=>{
 const r=parseFatSecretCSV(sample.replace('Total,300', '  Example Fruit,100,5,,0,,,10,,,\n   1 fruit\nTotal,300'));assert.equal(r.entries.length,3);assert.notEqual(r.entries[1].importKey,r.entries[2].importKey);const first=mergeFatSecret(empty(),r);assert.equal(mergeFatSecret(first.state,r).added,0);
});
test('archivo incompleto no se importa parcialmente y biblioteca puede importarse por separado',()=>{
 assert.throws(()=>parseFatSecretCSV(sample.replace('Example Bread,200','Example Bread,')));assert.throws(()=>parseFatSecretCSV('nombre,kcal\na,5'));const r=parseFatSecretCSV(sample);const m=mergeFatSecret(empty(),r,{history:false,library:true});assert.equal(m.state.entries.length,0);assert.equal(m.foodsAdded,2);
});

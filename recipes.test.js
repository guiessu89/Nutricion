import test from 'node:test';import assert from 'node:assert/strict';import {recipeFood,recipeTotals} from './recipes.js';import {nutrients,validBackup} from './data.js';
const recipe={id:'example',name:'Receta de prueba',servings:4,finalWeight:500,notes:'',ingredients:[{food:{name:'Base',kcal:200,p:10,c:20,f:5},grams:100},{food:{name:'Ración',basis:'portion',kcal:100,p:5,c:10,f:2},grams:null,servings:2}]};
test('recetas suman ingredientes en gramos y raciones y dividen por rendimiento final',()=>{
 assert.deepEqual(recipeTotals(recipe),{kcal:400,p:20,c:40,f:9});assert.equal(recipeFood(recipe).kcal,100);assert.equal(recipeFood(recipe,'grams').kcal,80);assert.equal(nutrients(recipeFood(recipe,'grams'),50).kcal,40);assert.equal(nutrients(recipeFood(recipe),.5).kcal,50);
});
test('gramos requieren peso final y el diario conserva la versión anterior',()=>{
 assert.throws(()=>recipeFood({...recipe,finalWeight:null},'grams'));assert.throws(()=>recipeFood({...recipe,ingredients:[]}));assert.throws(()=>recipeFood({...recipe,servings:0}));
 const snapshot=recipeFood(recipe);const changed={...recipe,ingredients:[...recipe.ingredients,{food:{name:'Más base',kcal:200,p:10,c:20,f:5},grams:100}]};assert.equal(recipeFood(changed).kcal,150);assert.equal(snapshot.kcal,100);
});
test('copias antiguas siguen siendo válidas y las recetas inválidas se rechazan',()=>{
 const state={version:1,profile:{goal:2000,protein:120,carbs:250,fat:65},entries:[],weights:[],activities:[],custom:[]};assert.ok(validBackup(state));assert.ok(validBackup({...state,recipes:[recipe]}));assert.equal(validBackup({...state,recipes:[{...recipe,servings:NaN}]}),false);assert.equal(validBackup({...state,recipes:[{...recipe,ingredients:[{food:recipe.ingredients[0].food,grams:-2}]}]}),false);
});

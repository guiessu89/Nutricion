import test from 'node:test';import assert from 'node:assert/strict';import {frequentFoods} from './suggestions.js';
const e=(name,meal,date='2026-05-06',grams=100)=>({date,meal,grams,food:{name,kcal:100,p:1,c:1,f:1}});
test('frecuentes son específicos de cada comida y priorizan frecuencia, recencia y última cantidad',()=>{
 const entries=[e('Avena','Desayuno'),e('Avena','Desayuno','2026-05-07',60),e('Manzana','Desayuno'),...Array.from({length:20},()=>e('Pasta','Cena'))];const top=frequentFoods(entries,'Desayuno');assert.equal(top.length,2);assert.equal(top[0].food.name,'Avena');assert.equal(top[0].count,2);assert.equal(top[0].amount,60);assert.equal(frequentFoods(entries,'Comida').length,0);
});
test('devuelve un máximo de diez y mantiene separadas las raciones',()=>{const entries=Array.from({length:20},(_,i)=>e('Alimento '+i,'Cena'));assert.equal(frequentFoods(entries,'Cena').length,10);});

import test from 'node:test';
import assert from 'node:assert/strict';
import {foods,totals,validBackup} from './data.js';
test('las cantidades escalan los nutrientes y se suman',()=>{assert.deepEqual(totals([{food:{kcal:200,p:10,c:20,f:5},grams:150},{food:{kcal:100,p:2,c:5,f:1},grams:50}]),{kcal:350,p:16,c:32.5,f:8});assert.equal(totals([]).kcal,0);});
test('el catálogo tiene nutrientes válidos y distingue preparación',()=>{assert.ok(foods.length>=50);for(const f of foods)for(const k of ['kcal','p','c','f'])assert.ok(Number.isFinite(f[k])&&f[k]>=0);assert.ok(foods.some(f=>f.name.includes('cocido')));});
test('la importación rechaza copias incompletas y cantidades peligrosas',()=>{const s={version:1,profile:{goal:2000,protein:120,carbs:250,fat:65},entries:[],weights:[],activities:[],custom:[]};assert.equal(validBackup(s),true);assert.equal(validBackup({}),false);assert.equal(validBackup({...s,entries:[{date:'2026-10-30',meal:'Cena',grams:-1,food:foods[0]}]}),false);assert.equal(validBackup({...s,profile:{...s.profile,goal:0}}),false);});

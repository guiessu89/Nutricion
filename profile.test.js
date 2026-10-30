import test from 'node:test';import assert from 'node:assert/strict';import {fixedProfile,mergeProfile} from './profile.js';
test('datos fijos guardados se conservan y edad/objetivos siguen editables',()=>{
 const p={name:'Ana',height:170,sex:'female',age:30,goal:2000};
 const updated=mergeProfile(p,{name:'Otra',height:180,sex:'male',age:31,goal:1900});assert.deepEqual(updated,{...p,age:31,goal:1900});
});
test('perfiles antiguos recuperan los datos fijos desde el cálculo guardado',()=>{
 const p={name:'',predictor:{input:{height:170,sex:'female'}}};assert.deepEqual(fixedProfile(p),{name:null,height:170,sex:'female'});assert.equal(mergeProfile(p,{name:'Ana',height:180}).height,170);assert.equal(mergeProfile(p,{name:'Ana'}).name,'Ana');
});

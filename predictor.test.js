import test from 'node:test';import assert from 'node:assert/strict';import {predictTargets} from './predictor.js';
const input={weight:80,height:180,age:30,sex:'male',activity:'moderate',objective:'maintain'};
test('Mifflin conocido y energía de macros coherente',()=>{const r=predictTargets(input);assert.equal(r.resting,1780);assert.equal(r.maintenance,2759);assert.equal(r.goal,2760);assert.equal(r.protein,128);assert.ok(Math.abs(4*r.protein+4*r.carbs+9*r.fat-r.goal)<=2);assert.equal(predictTargets({...input,sex:'female'}).resting,1614);});
test('déficit y superávit acotados',()=>{const r=predictTargets({...input,objective:'lose'});assert.equal(r.adjustment,-414);assert.equal(r.goal,2350);assert.equal(r.protein,144);assert.equal(predictTargets({...input,objective:'gain'}).adjustment,276);});
test('rechaza datos inválidos y casos excluidos',()=>{for(const change of [{age:17},{weight:NaN},{activity:'unknown'},{objective:'x'},{sex:''},{excluded:true},{weight:50,height:180,objective:'lose'}])assert.throws(()=>predictTargets({...input,...change}));});

import {balanceTargets} from './predictor.js';
const energy=t=>t.protein*4+t.carbs*4+t.fat*9;
test('déficit configurable más agresivo y actividad personalizada',()=>{
 const moderate=predictTargets({...input,objective:'lose',deficitPercent:15});
 const aggressive=predictTargets({...input,objective:'lose',deficitPercent:25});
 assert.ok(aggressive.goal<moderate.goal);assert.equal(aggressive.adjustment,-690);
 assert.equal(predictTargets({...input,activity:'custom',activityFactor:1.6}).maintenance,2848);
 assert.throws(()=>predictTargets({...input,objective:'lose',deficitPercent:40}));
 assert.throws(()=>predictTargets({...input,activity:'custom',activityFactor:3}));
});
test('calorías cambian macros y editar cada macro conserva total y valor elegido',()=>{
 const start={goal:2400,protein:150,carbs:300,fat:66.7};
 const reduced=balanceTargets(start,'goal',2000);assert.equal(reduced.goal,2000);assert.ok(reduced.protein<start.protein);assert.ok(reduced.carbs<start.carbs);assert.ok(reduced.fat<start.fat);assert.ok(Math.abs(energy(reduced)-2000)<=.5);
 for(const key of ['protein','carbs','fat']){
  const value=key==='fat'?80:180;const adjusted=balanceTargets(start,key,value);assert.equal(adjusted[key],value);assert.equal(adjusted.goal,2400);assert.ok(Math.abs(energy(adjusted)-2400)<=.5);
 }
 assert.throws(()=>balanceTargets(start,'protein',600));assert.throws(()=>balanceTargets(start,'goal',NaN));
});
test('ediciones sucesivas no acumulan desajustes energéticos',()=>{
 let t={goal:2400,protein:150,carbs:300,fat:66.7};
 for(let i=0;i<100;i++){t=balanceTargets(t,'goal',1800+(i%5)*100);t=balanceTargets(t,'protein',120+i%30);t=balanceTargets(t,'fat',50+i%10);assert.ok(Math.abs(energy(t)-t.goal)<=.5);assert.ok(t.carbs>=1);}
});

import {estimateWeightTimeline} from './predictor.js';
const weightPlan={...input,objective:'lose',lossMode:'weight',targetWeight:70,pace:'medium'};
test('peso objetivo y ritmo ordenan calorías y plazos',()=>{
 const slow=predictTargets({...weightPlan,pace:'moderate'}),medium=predictTargets(weightPlan),fast=predictTargets({...weightPlan,pace:'fast'});
 assert.ok(slow.goal>medium.goal&&medium.goal>fast.goal);
 const a=estimateWeightTimeline(slow),b=estimateWeightTimeline(medium),c=estimateWeightTimeline(fast);
 assert.ok(a.weeks>b.weeks&&b.weeks>c.weeks);assert.equal(b.kgToLose,10);
 // Falling TDEE must make the estimate longer than a constant-deficit calculation.
 assert.ok(b.days>7700*10/(medium.maintenance-medium.goal));
 const longer=estimateWeightTimeline(medium,medium.goal+100);assert.ok(longer.weeks>b.weeks);
 assert.equal(estimateWeightTimeline(medium,medium.maintenance).weeks,null);
 assert.equal(estimateWeightTimeline(predictTargets(input)),null);
});
test('peso objetivo inválido y ritmo desconocido no generan plan',()=>{
 for(const change of [{targetWeight:80},{targetWeight:85},{targetWeight:40},{targetWeight:NaN},{pace:'extreme'}])assert.throws(()=>predictTargets({...weightPlan,...change}));
});

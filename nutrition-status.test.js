import test from 'node:test';
import assert from 'node:assert/strict';
import {targetStatus,targetsForDay,adherenceDays} from './nutrition-status.js';
import {validBackup} from './data.js';
const profile={goal:2000,protein:100,carbs:200,fat:60};
const state=()=>({version:1,profile:{...profile},entries:[{id:'food',date:'2026-10-30',meal:'Cena',grams:100,food:{name:'Prueba',kcal:2000,p:100,c:200,f:60}}],weights:[],activities:[],custom:[]});
test('umbrales inclusivos, diferencias y días sin registros',()=>{
 for(const [value,kind] of [[0,'low'],[1799,'low'],[1800,'ok'],[2200,'ok'],[2201,'high']])assert.equal(targetStatus(value,2000).kind,kind);
 assert.equal(targetStatus(2500,2000).difference,500);assert.equal(targetStatus(1500,2000).percent,75);
 assert.equal(targetStatus(0,2000,false).kind,'none');
});
test('el cierre conserva objetivos aunque cambie el perfil; fechas vacías no son incumplimientos',()=>{
 const s=state();s.dayReviews=[{date:'2026-10-30',targets:{...profile}}];s.profile.goal=1500;
 assert.equal(targetsForDay(s,'2026-10-30').goal,2000);assert.equal(targetsForDay(s,'2026-10-29').goal,1500);
 const days=adherenceDays(s,'2026-10-31',7);assert.equal(days.length,7);assert.equal(days[0].date,'2026-10-25');
 assert.equal(days[5].closed,true);assert.equal(days[5].statuses.goal.kind,'ok');assert.equal(days[6].hasRecords,false);assert.equal(days[6].statuses.goal.kind,'none');
 s.dayReviews=[];assert.equal(adherenceDays(s,'2026-10-30',1)[0].statuses.goal.kind,'high');
});
test('compatibilidad de copias antiguas y validación de objetivos congelados',()=>{
 const s=state();assert.equal(validBackup(s),true);s.dayReviews=[{date:'2026-10-30',targets:{...profile}}];assert.equal(validBackup(s),true);s.dayReviews[0].targets.goal=-1;assert.equal(validBackup(s),false);
});

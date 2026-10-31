import {totals} from './data.js';import {shiftDate} from './planner.js';
export const TARGET_KEYS=['goal','protein','carbs','fat'];
export function targetStatus(value,target,hasRecords=true){
 if(!hasRecords)return {kind:'none',label:'Sin registros',percent:0,difference:0};
 const ratio=value/target;return {kind:ratio<.9?'low':ratio>1.1?'high':'ok',label:ratio<.9?'Por debajo':ratio>1.1?'Por encima':'En rango',percent:Math.round(ratio*100),difference:value-target};
}
export function targetsForDay(state,date){return state.dayReviews?.find(r=>r.date===date)?.targets||state.profile;}
export function adherenceDays(state,end,days=7){
 return Array.from({length:days},(_,i)=>{const date=shiftDate(end,i-days+1),entries=state.entries.filter(e=>e.date===date),review=state.dayReviews?.find(r=>r.date===date),t=totals(entries),targets=review?.targets||state.profile;return {date,closed:!!review,hasRecords:entries.length>0,totals:t,statuses:Object.fromEntries([['goal','kcal'],['protein','p'],['carbs','c'],['fat','f']].map(([k,v])=>[k,targetStatus(t[v],targets[k],entries.length>0)]))};});
}

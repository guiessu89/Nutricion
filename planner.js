import {entryNutrients} from './data.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const MEAL_NAMES=['Desayuno','Comida','Cena','Tentempiés'];
export function shiftDate(date,days){const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)throw Error('Fecha no válida.');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function weekDates(date){const day=new Date(date+'T12:00:00Z').getUTCDay();const monday=shiftDate(date,-((day+6)%7));return Array.from({length:7},(_,i)=>shiftDate(monday,i));}
export function copyNextWeek(plans,dates){
 const additions=[];for(const plan of plans.filter(p=>dates.includes(p.date))){const date=shiftDate(plan.date,7),origin=plan.copyOrigin||plan.id;if(plans.some(p=>p.date===date&&(p.copyOrigin||p.id)===origin))continue;additions.push({...structuredClone(plan),id:crypto.randomUUID(),date,copyOrigin:origin});}return additions;
}
export function withAmount(entry,amount){
 if(!Number.isFinite(amount)||amount<=0||amount>10000)throw Error('Introduce una cantidad entre 0,1 y 10 000.');
 return {...entry,grams:entry.food.basis==='portion'?null:amount,servings:entry.food.basis==='portion'?amount:null,quantityLabel:entry.food.basis==='portion'?`${amount} × ${entry.food.portionLabel||'ración'}`:`${amount} g`};
}
export class PlannerUI{
 constructor(actions){this.actions=actions;}
 render(container,date){
  const dates=weekDates(date),plans=this.actions.getPlans(),logged=new Set(this.actions.getEntries().map(e=>e.planId).filter(Boolean));
  container.innerHTML=`<p class="sub">Planificación semanal de alimentos y recetas. Los registros pendientes aparecen en el diario de su fecha; se contabilizan al pulsar Registrar.</p><section class="card"><div class="section-head" style="flex-wrap:wrap"><button id="previous-week">← Semana anterior</button><h2>${dates[0]} — ${dates[6]}</h2><button id="next-week">Semana siguiente →</button></div><p><button id="copy-week">Copiar planificación a la semana siguiente</button></p><p id="planner-status" role="status"></p></section><div class="week-grid">${dates.map(day=>`<section class="card"><h2>${esc(new Date(day+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}))}</h2><p class="muted">${Math.round(plans.filter(p=>p.date===day).reduce((sum,p)=>sum+entryNutrients(p).kcal,0))} kcal planificadas</p>${MEAL_NAMES.map(meal=>`<div class="meal"><div class="meal-head"><h3>${meal}</h3><button data-plan-date="${day}" data-plan-meal="${meal}" aria-label="Programar ${meal} ${day}">+</button></div>${plans.filter(p=>p.date===day&&p.meal===meal).map(p=>`<div class="food-row"><div>${esc(p.food.name)}<small>${Math.round(entryNutrients(p).kcal)} kcal · ${logged.has(p.id)?'Registrado en diario':'Pendiente'}</small><label>${p.food.basis==='portion'?'Raciones':'Gramos'}<input data-plan-quantity="${esc(p.id)}" type="number" min="0.1" max="10000" step="0.1" value="${p.food.basis==='portion'?p.servings:p.grams}" ${logged.has(p.id)?'disabled':''}></label></div><button data-remove-plan="${esc(p.id)}" aria-label="Quitar planificación de ${esc(p.food.name)}">×</button></div>`).join('')||'<p class="empty">Sin planificación.</p>'}</div>`).join('')}</section>`).join('')}</div>`;
  container.querySelector('#previous-week').onclick=()=>this.actions.navigate(shiftDate(dates[0],-7));container.querySelector('#next-week').onclick=()=>this.actions.navigate(shiftDate(dates[0],7));
  container.querySelectorAll('[data-plan-date]').forEach(b=>b.onclick=()=>this.actions.chooseFood(b.dataset.planDate,b.dataset.planMeal));
  container.querySelectorAll('[data-remove-plan]').forEach(b=>b.onclick=async()=>{if(!await this.actions.remove(b.dataset.removePlan))return;this.render(container,date);});
  container.querySelectorAll('[data-plan-quantity]').forEach(input=>input.onchange=async()=>{if(!input.checkValidity()){input.reportValidity();return;}if(!await this.actions.changeAmount(input.dataset.planQuantity,Number(input.value)))return;this.render(container,date);});
  container.querySelector('#copy-week').onclick=async()=>{const additions=copyNextWeek(this.actions.getPlans(),dates);if(!additions.length){container.querySelector('#planner-status').textContent='No hay entradas nuevas para copiar.';return;}if(!confirm(`¿Añadir ${additions.length} entradas a la semana siguiente? No se reemplazará la planificación existente.`))return;if(!await this.actions.copy(additions))return;this.render(container,date);container.querySelector('#planner-status').textContent=`${additions.length} entradas copiadas a la semana siguiente.`;};
 }
}

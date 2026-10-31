import {dailyWeights} from './renpho.js';
import {shiftDate} from './planner.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kg=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(n);
export function weightChartModel(weights,from,to,target){
 if(from&&to&&from>to)throw Error('La fecha inicial debe ser anterior o igual a la final.');
 const points=dailyWeights(weights).filter(w=>Number.isFinite(w.weight)&&w.weight>0&&(!from||w.date>=from)&&(!to||w.date<=to));
 if(!points.length)return {points,trend:[],target:Number.isFinite(target)&&target>0?target:null};
 const origin=Date.parse(points[0].date),xs=points.map(w=>(Date.parse(w.date)-origin)/86400000),ys=points.map(w=>w.weight),n=xs.length;
 let trend=[];
 if(n>1){const mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n;const slope=xs.reduce((sum,x,i)=>sum+(x-mx)*(ys[i]-my),0)/xs.reduce((sum,x)=>sum+(x-mx)**2,0);trend=[{date:points[0].date,weight:my-slope*mx},{date:points.at(-1).date,weight:my+slope*(xs.at(-1)-mx)}];}
 const goal=Number.isFinite(target)&&target>0?target:null,values=[...ys,...trend.map(p=>p.weight),...(goal===null?[]:[goal])],min=Math.min(...values),max=Math.max(...values),padding=Math.max(.5,(max-min)*.12);
 return {points,trend,target:goal,min:min-padding,max:max+padding};
}
export class WeightChart{
 constructor(){this.range='all';this.from='';this.to='';this.onOutside=e=>{if(this.plot&&!this.plot.contains(e.target))this.hideTooltip?.();};}
 unmount(){this.observer?.disconnect();document.removeEventListener('pointerdown',this.onOutside);this.hideTooltip=null;this.weights=[];}
 mount(container,weights,target){
  this.observer?.disconnect();document.removeEventListener('pointerdown',this.onOutside);document.addEventListener('pointerdown',this.onOutside);this.weights=weights;this.target=target;this.container=container;
  const days=dailyWeights(weights),first=days[0]?.date||'',last=days.at(-1)?.date||'';
  if(this.range==='all'){this.from=first;this.to=last;}else if(this.range!=='custom'){this.to=last;this.from=last?shiftDate(last,-Number(this.range)+1):'';}
  container.innerHTML=`<div class="weight-chart-toolbar"><div class="weight-range-buttons" role="group" aria-label="Rango de la gráfica">${[['30','30 días'],['90','90 días'],['180','6 meses'],['365','1 año'],['all','Todo']].map(([value,label])=>`<button type="button" data-weight-range="${value}" aria-pressed="${this.range===value}">${label}</button>`).join('')}</div><div class="weight-chart-dates"><label>Desde<input type="date" id="weight-from" value="${esc(this.from)}"></label><label>Hasta<input type="date" id="weight-to" value="${esc(this.to)}"></label></div></div><p class="catalog-info">Rangos rápidos hasta la última medición. La selección no modifica los registros ni la fecha del diario.</p><div class="weight-chart-legend"><span><i class="weight-key"></i>Peso registrado</span><span><i class="trend-key"></i>Tendencia lineal del rango</span><span><i class="goal-key"></i>Peso objetivo</span></div><div id="weight-chart-status" role="status"></div><div class="weight-plot"></div><p class="catalog-info weight-chart-note">Referencia diaria: registro manual si existe; en otro caso, última medida del día. La tendencia ajusta los datos visibles; no predice el peso futuro.</p>`;
  this.plot=container.querySelector('.weight-plot');
  container.querySelectorAll('[data-weight-range]').forEach(b=>b.onclick=()=>{this.range=b.dataset.weightRange;this.mount(container,this.weights,this.target);});
  for(const id of ['weight-from','weight-to'])container.querySelector('#'+id).onchange=()=>{this.range='custom';this.from=container.querySelector('#weight-from').value;this.to=container.querySelector('#weight-to').value;container.querySelectorAll('[data-weight-range]').forEach(b=>b.setAttribute('aria-pressed','false'));this.draw();};
  this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(this.plot);this.draw();
 }
 draw(){
  this.hideTooltip=null;this.plot.onpointermove=null;this.plot.onpointerleave=null;this.plot.onpointerdown=null;
  let model;const status=this.container.querySelector('#weight-chart-status');
  try{model=weightChartModel(this.weights,this.from,this.to,this.target);}catch(e){status.textContent=e.message;this.plot.innerHTML='';return;}
  if(!model.points.length){status.textContent='No hay medidas en el rango seleccionado.';this.plot.innerHTML='';return;}
  const {points,trend,target,min,max}=model,last=points.at(-1);
  status.innerHTML=`<div class="weight-chart-summary"><strong>Último del rango: ${kg(last.weight)} kg</strong><span>${esc(last.date)} · ${points.length} días con medidas</span></div>${target===null?'<p class="catalog-info">Configura un peso objetivo en Mi perfil para mostrar su línea.</p>':''}${points.length===1?'<p class="catalog-info">Se necesitan dos días con medidas para calcular una tendencia.</p>':''}`;
  const width=Math.max(240,this.plot.getBoundingClientRect().width),height=300,left=45,right=14,top=24,bottom=38,start=Date.parse(points[0].date),end=Date.parse(last.date),span=Math.max(86400000,end-start);
  const x=d=>points.length===1?(left+width-right)/2:left+(Date.parse(d)-start)/span*(width-left-right),y=v=>top+(max-v)/(max-min)*(height-top-bottom),poly=list=>list.map(w=>`${x(w.date).toFixed(2)},${y(w.weight).toFixed(2)}`).join(' ');
  const ticks=Array.from({length:5},(_,i)=>min+(max-min)*i/4);
  const dates=points.length===1?[points[0].date]:Array.from({length:width<500?3:5},(_,i)=>new Date(start+(end-start)*i/(width<500?2:4)).toISOString().slice(0,10));
  const labelY=y(last.weight)<65?y(last.weight)+14:y(last.weight)-33,labelX=Math.max(left,x(last.date)-100);
  this.plot.innerHTML=`<svg class="weight-chart-svg" width="100%" height="300" viewBox="0 0 ${width} ${height}" role="group" aria-label="Peso registrado, tendencia y objetivo desde ${esc(points[0].date)} hasta ${esc(last.date)}"><text x="0" y="12" class="axis-text">kg</text>${ticks.map(v=>`<line x1="${left}" y1="${y(v)}" x2="${width-right}" y2="${y(v)}" class="weight-grid"/><text x="${left-9}" y="${y(v)+4}" text-anchor="end" class="axis-text">${kg(v)}</text>`).join('')}${dates.map((d,i)=>`<text x="${points.length===1?x(d):left+i*(width-left-right)/(dates.length-1)}" y="${height-12}" text-anchor="${i===0?'start':i===dates.length-1?'end':'middle'}" class="axis-text">${esc(new Date(d+'T12:00:00Z').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:width>700?'2-digit':undefined,timeZone:'UTC'}))}</text>`).join('')}${target===null?'':`<line data-weight-goal x1="${left}" y1="${y(target)}" x2="${width-right}" y2="${y(target)}" class="weight-goal"/><text x="${left+8}" y="${y(target)-7}" class="goal-text">Objetivo: ${kg(target)} kg</text>`}<polyline data-weight-series points="${poly(points)}" class="weight-series"/>${trend.length?`<polyline data-weight-trend points="${poly(trend)}" class="weight-trend"/>`:''}${points.map(w=>`<circle cx="${x(w.date)}" cy="${y(w.weight)}" r="${w===last?5:3}" class="weight-point"><title>${esc(w.date)}: ${kg(w.weight)} kg</title></circle>`).join('')}<rect x="${labelX}" y="${labelY}" width="100" height="24" rx="6" class="last-weight-box"/><text data-last-weight x="${labelX+50}" y="${labelY+16}" text-anchor="middle" class="last-weight-text">${kg(last.weight)} kg</text>${points.map((w,i)=>`<circle data-weight-point="${i}" cx="${x(w.date)}" cy="${y(w.weight)}" r="11" class="weight-hit" tabindex="0" role="button" aria-pressed="false" aria-label="${esc(new Date(w.date+'T12:00:00Z').toLocaleDateString('es-ES',{timeZone:'UTC'}))}: ${kg(w.weight)} kg"/>`).join('')}</svg><div class="weight-tooltip" id="weight-tooltip" role="tooltip" hidden></div>`;
  const tooltip=this.plot.querySelector('.weight-tooltip'),hits=[...this.plot.querySelectorAll('[data-weight-point]')];let pinned=null;
  const hide=()=>{pinned=null;tooltip.hidden=true;this.plot.querySelector('svg').classList.remove('has-tooltip');hits.forEach(h=>{h.setAttribute('aria-pressed','false');h.removeAttribute('aria-describedby');});};this.hideTooltip=hide;
  const show=i=>{const point=points[i];this.plot.querySelector('svg').classList.add('has-tooltip');tooltip.textContent=new Date(point.date+'T12:00:00Z').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'})+' · '+kg(point.weight)+' kg';tooltip.hidden=false;const box=tooltip.getBoundingClientRect(),plotWidth=this.plot.getBoundingClientRect().width;tooltip.style.left=Math.max(0,Math.min(plotWidth-box.width,x(point.date)-box.width/2))+'px';tooltip.style.top=(y(point.weight)>box.height+12?y(point.weight)-box.height-12:y(point.weight)+16)+'px';hits.forEach((h,j)=>{h.setAttribute('aria-pressed',String(j===i));if(j===i)h.setAttribute('aria-describedby','weight-tooltip');else h.removeAttribute('aria-describedby');});};
  const nearest=e=>{const svg=this.plot.querySelector('svg'),pos=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());let index=0,distance=Infinity;points.forEach((point,i)=>{const d=Math.hypot(pos.x-x(point.date),pos.y-y(point.weight));if(d<distance){index=i;distance=d;}});return {index,distance};};
  hits.forEach((hit,i)=>{hit.onclick=e=>{pinned=e.detail?nearest(e).index:i;show(pinned);};hit.onfocus=()=>show(i);hit.onblur=()=>{if(pinned===null)hide();};hit.onkeydown=e=>{if(e.key==='Escape'){hide();return;}if(e.key==='Enter'||e.key===' '){e.preventDefault();pinned=i;show(i);}};});
  this.plot.onpointermove=e=>{if(e.pointerType!=='mouse'||pinned!==null)return;const point=nearest(e);if(point.distance<=18)show(point.index);else hide();};this.plot.onpointerleave=()=>{if(pinned===null)hide();};
  this.plot.onpointerdown=e=>{if(!e.target.closest('[data-weight-point]'))hide();};
 }
}

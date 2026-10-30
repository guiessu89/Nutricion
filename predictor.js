// Mifflin–St Jeor (1990). PAL and energy adjustments are application assumptions.
export const ACTIVITY={sedentary:1.2,light:1.375,moderate:1.55,high:1.725,veryHigh:1.9};
export function predictTargets(input){
 const {weight,height,age,sex,activity,objective}=input;
 for(const [name,value,min,max] of [['peso',weight,30,300],['altura',height,120,230],['edad',age,18,80]])if(!Number.isFinite(value)||value<min||value>max)throw new Error(`Revisa ${name}: debe estar entre ${min} y ${max}.`);
 if(!['female','male'].includes(sex)||(!Object.hasOwn(ACTIVITY,activity)&&activity!=='custom')||!['maintain','lose','gain'].includes(objective))throw new Error('Selecciona sexo de la fórmula, actividad y objetivo.');
 if(input.excluded)throw new Error('En esta situación utiliza objetivos individualizados con un profesional.');
 const bmi=weight/(height/100)**2;
 if(bmi<18.5&&objective==='lose')throw new Error('Con este peso y altura no se propone un déficit automático.');
 const resting=10*weight+6.25*height-5*age+(sex==='male'?5:-161);
 const factor=activity==='custom'?Number(input.activityFactor):ACTIVITY[activity];
 if(!Number.isFinite(factor)||factor<1.1||factor>2.4)throw Error('El factor de actividad debe estar entre 1,1 y 2,4.');
 const deficitPercent=Number(input.deficitPercent??15);
 if(objective==='lose'&&(!Number.isFinite(deficitPercent)||deficitPercent<5||deficitPercent>25))throw Error('El déficit debe estar entre 5 y 25 %.');
 const maintenance=resting*factor;
 const adjustment=objective==='lose'?-Math.min(maintenance*deficitPercent/100,deficitPercent>20?750:500):objective==='gain'?Math.min(maintenance*.1,300):0;
 const goal=Math.round((maintenance+adjustment)/10)*10;
 // A conservative product guardrail, not a universal physiological minimum.
 if(goal<(sex==='male'?1500:1200))throw new Error('La estimación queda fuera del rango de propuestas automáticas. Consulta objetivos individualizados.');
 const ratio=objective==='lose'?1.8:activity==='sedentary'&&objective==='maintain'?1.2:1.6;
 const protein=Math.round(weight*ratio),fat=Math.round(goal*.30/9),carbs=Math.round((goal-protein*4-fat*9)/4);
 if(carbs<50||protein*4/goal>.35)throw new Error('El reparto automático no es adecuado para estos datos. Necesitas un ajuste individualizado.');
 return {goal,protein,fat,carbs,resting:Math.round(resting),maintenance:Math.round(maintenance),factor,proteinRatio:ratio,bmi,adjustment:Math.round(adjustment),method:'mifflin-st-jeor-v2',input:{weight,height,age,sex,activity,objective,deficitPercent,activityFactor:factor}};
}
export function predictorMarkup(profile,latestWeight){
 const saved=profile.predictor?.input||{};
 const option=(value,label,current)=>`<option value="${value}" ${value===current?'selected':''}>${label}</option>`;
 // Only finite numeric values enter HTML; user text is never interpolated.
 const numeric=v=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):'';
 return `<div class="card"><h2>Calcula tus objetivos</h2><p class="sub">Estimación inicial para adultos de 18–80 años. Elige tu actividad habitual completa: ya incluye ejercicio, no sumaremos sus calorías otra vez.</p><form id="predictor-form" class="fields">
 <label>Peso actual (kg)<input name="weight" type="number" required min="30" max="300" step="0.1" value="${numeric(latestWeight??saved.weight)}"></label>
 <label>Altura (cm)<input name="height" type="number" required min="120" max="230" step="0.1" value="${numeric(profile.height??saved.height)}"></label>
 <label>Edad (años)<input name="age" type="number" required min="18" max="80" step="1" value="${numeric(profile.age??saved.age)}"></label>
 <label>Sexo utilizado por la ecuación<select name="sex" required><option value="">Selecciona</option>${option('female','Femenino',saved.sex)}${option('male','Masculino',saved.sex)}</select></label>
 <label>Actividad habitual<select name="activity" required><option value="">Selecciona</option>${option('sedentary','Sedentaria · trabajo sentado, poco movimiento',saved.activity)}${option('light','Ligera · algo de movimiento y ejercicio ligero',saved.activity)}${option('moderate','Moderada · movimiento diario y ejercicio regular',saved.activity)}${option('high','Alta · trabajo físico o entrenamiento exigente',saved.activity)}${option('veryHigh','Muy alta · actividad física intensa sostenida',saved.activity)}${option('custom','Personalizar factor de actividad',saved.activity)}</select></label>
 <label id="activity-factor-label">Factor de actividad personalizado (1,1–2,4)<input name="activityFactor" type="number" required min="1.1" max="2.4" step="0.01" value="${numeric(saved.activityFactor)||1.55}"></label>
 <label>Objetivo<select name="objective">${option('maintain','Mantener peso',saved.objective||'maintain')}${option('lose','Perder peso · elegir déficit',saved.objective)}${option('gain','Ganar peso · superávit moderado',saved.objective)}</select></label>
 <label id="deficit-label">Déficit de pérdida de peso (5–25 %)<input name="deficitPercent" type="number" required min="5" max="25" step="1" value="${numeric(saved.deficitPercent)||15}"><span class="catalog-info">10 % suave · 15 % moderado · 20 % alto · 25 % más agresivo. Máximo 500 kcal hasta el 20 % y 750 kcal por encima. El 25 % es más exigente; vigila recuperación, hambre y evolución.</span></label>
 <label style="grid-column:1/-1;display:flex;align-items:start"><input name="excluded" type="checkbox" style="width:auto"> Embarazo, lactancia, trastorno de la conducta alimentaria o condición médica que requiere una dieta específica. En estos casos no se generan objetivos automáticos.</label>
 <button class="primary">Estimar objetivos</button></form><div id="prediction" aria-live="polite"></div>
 <details style="margin-top:20px"><summary>Método, límites y fuentes</summary><p class="catalog-info">Gasto en reposo: 10 × kg + 6,25 × cm − 5 × años + 5 (masculino) o −161 (femenino). Factores de actividad aproximados: 1,2 / 1,375 / 1,55 / 1,725 / 1,9, o personalizado (1,1–2,4). Son supuestos prácticos, no una medición ni parte de la ecuación original. La ecuación utiliza dos coeficientes de sexo y puede no representar bien tu fisiología individual.</p><p class="catalog-info">Reglas de la app: pérdida configurable −5 a −25 % (máximo 500 kcal hasta el 20 %, y 750 kcal por encima); ganancia +10 % (máximo 300 kcal). Proteína: 1,2 g/kg en mantenimiento sedentario, 1,6 g/kg con actividad o ganancia, 1,8 g/kg en pérdida. Grasas: 30 %; hidratos: energía restante. Son puntos de partida, no una prescripción clínica. La app limita propuestas bajas y repartos extremos; esos límites no definen una ingesta segura universal. No se predice una fecha ni una cantidad de pérdida de peso.</p><p class="catalog-info">Referencias: <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener">Mifflin et al., 1990</a>; <a href="https://pubmed.ncbi.nlm.nih.gov/15883556/" target="_blank" rel="noopener">Frankenfield et al., revisión de ecuaciones, 2005</a>; <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" target="_blank" rel="noopener">ISSN: proteína y ejercicio, 2017</a>. El consenso deportivo no valida por sí solo todos los ajustes de esta app. Contrasta la estimación con la tendencia de peso durante 2–4 semanas y ajusta tus objetivos según necesidad.</p></details></div>`;
}

const ENERGY={protein:4,carbs:4,fat:9};
const roundGram=n=>Math.round(n*10)/10;
export function balanceTargets(current,key,value){
 if(!['goal',...Object.keys(ENERGY)].includes(key)||!Number.isFinite(value))throw Error('Introduce un valor numérico válido.');
 const next={goal:Number(current.goal),protein:Number(current.protein),carbs:Number(current.carbs),fat:Number(current.fat)};
 if(!Object.values(next).every(n=>Number.isFinite(n)&&n>0))throw Error('Completa primero todos los objetivos con valores positivos.');
 if(key==='goal'){
  if(value<800||value>10000)throw Error('Las calorías editables deben estar entre 800 y 10 000.');
  next.goal=Math.round(value);const total=Object.keys(ENERGY).reduce((s,k)=>s+next[k]*ENERGY[k],0);
  for(const k of Object.keys(ENERGY))next[k]=roundGram(next[k]*next.goal/total);
  next.carbs=roundGram((next.goal-next.protein*4-next.fat*9)/4);
 }else{
  if(value<1)throw Error('Cada macro debe ser al menos 1 g.');
  const others=Object.keys(ENERGY).filter(k=>k!==key),remaining=next.goal-value*ENERGY[key];
  if(remaining<others.reduce((s,k)=>s+ENERGY[k],0))throw Error('Ese macro no cabe en las calorías disponibles dejando al menos 1 g de cada uno de los otros.');
  const total=others.reduce((s,k)=>s+next[k]*ENERGY[k],0);next[key]=roundGram(value);
  // Distribute energy above the 1 g minimum while preserving the prior ratio when possible.
  const [a,b]=others;next[a]=roundGram(Math.max(1,Math.min((remaining-ENERGY[b])/ENERGY[a],remaining*(next[a]*ENERGY[a]/total)/ENERGY[a])));
  next[b]=roundGram((next.goal-next[key]*ENERGY[key]-next[a]*ENERGY[a])/ENERGY[b]);
 }
 if(Object.keys(ENERGY).some(k=>next[k]<1))throw Error('No queda energía suficiente para mantener todos los macros positivos.');
 return next;
}
export function targetEditorFields(target){return [['goal','Calorías (kcal)',800,10000,1],['protein','Proteínas (g)',1,1000,.1],['carbs','Hidratos (g)',1,2000,.1],['fat','Grasas (g)',1,1000,.1]].map(([k,label,min,max,step])=>`<label>${label}<input name="${k}" type="number" required min="${min}" max="${max}" step="${step}" value="${Number(target[k])}"></label>`).join('');}
export function bindTargetEditor(form,target){
 let current={...target};
 let status=form.querySelector('.target-status');if(!status){status=document.createElement('p');status.className='target-status catalog-info';status.style.gridColumn='1/-1';status.setAttribute('aria-live','polite');form.append(status);}
 for(const key of ['goal','protein','carbs','fat']){
  const field=form.elements.namedItem(key);
  field.addEventListener('input',()=>{
   for(const k of ['goal','protein','carbs','fat'])form.elements.namedItem(k).setCustomValidity('');
   if(field.value===''||!field.checkValidity()){status.textContent='Completa el campo con un valor dentro del rango indicado.';return;}
   try{
    current={...current,...balanceTargets(current,key,Number(field.value))};
    for(const k of ['goal','protein','carbs','fat'])if(k!==key)form.elements.namedItem(k).value=current[k];
    const summary=form.closest('.tip')?.querySelector('.target-summary');if(summary)summary.textContent=`${current.goal} kcal/día · Proteínas ${current.protein} g · Hidratos ${current.carbs} g · Grasas ${current.fat} g.`;
    const total=4*current.protein+4*current.carbs+9*current.fat;
    status.textContent=`Macros: ${total.toFixed(1)} kcal · Objetivo: ${current.goal} kcal. Diferencia de redondeo: ${Math.abs(total-current.goal).toFixed(1)} kcal. Pendiente de guardar.`;
   }catch(error){field.setCustomValidity(error.message);status.textContent=error.message;}
  });
 }
 return ()=>Object.fromEntries(['goal','protein','carbs','fat'].map(k=>[k,current[k]]));
}

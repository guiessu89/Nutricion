// Mifflin–St Jeor (1990). PAL and energy adjustments are application assumptions.
export const ACTIVITY={sedentary:1.2,light:1.375,moderate:1.55,high:1.725,veryHigh:1.9};
export const LOSS_PACES={moderate:.0025,medium:.005,fast:.0075};
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
 const lossMode=input.lossMode||(input.targetWeight?'weight':'deficit');
 if(objective==='lose'&&!['weight','deficit'].includes(lossMode))throw Error('Selecciona cómo planificar la pérdida de peso.');
 const targetWeight=Number(input.targetWeight),pace=input.pace||'medium';
 if(objective==='lose'&&lossMode==='weight'){
  if(!Number.isFinite(targetWeight)||targetWeight<30||targetWeight>=weight)throw Error('El peso objetivo debe ser menor que el actual y de al menos 30 kg. Para mantener el peso, elige Mantener.');
  if(targetWeight/(height/100)**2<18.5)throw Error('El peso objetivo está por debajo del rango de propuestas automáticas para esta altura. Consulta un objetivo individualizado.');
  if(!Object.hasOwn(LOSS_PACES,pace))throw Error('Selecciona un ritmo de pérdida válido.');
 }
 const requestedDeficit=objective==='lose'&&lossMode==='weight'?weight*LOSS_PACES[pace]*7700/7:null;
 const adjustment=objective==='lose'?-(requestedDeficit!==null?Math.min(requestedDeficit,maintenance*.25,750):Math.min(maintenance*deficitPercent/100,deficitPercent>20?750:500)):objective==='gain'?Math.min(maintenance*.1,300):0;
 const goal=Math.round((maintenance+adjustment)/10)*10;
 // A conservative product guardrail, not a universal physiological minimum.
 if(goal<(sex==='male'?1500:1200))throw new Error('La estimación queda fuera del rango de propuestas automáticas. Consulta objetivos individualizados.');
 const ratio=objective==='lose'?1.8:activity==='sedentary'&&objective==='maintain'?1.2:1.6;
 const protein=Math.round(weight*ratio),fat=Math.round(goal*.30/9),carbs=Math.round((goal-protein*4-fat*9)/4);
 if(carbs<50||protein*4/goal>.35)throw new Error('El reparto automático no es adecuado para estos datos. Necesitas un ajuste individualizado.');
 return {goal,protein,fat,carbs,resting:Math.round(resting),maintenance:Math.round(maintenance),factor,proteinRatio:ratio,bmi,adjustment:Math.round(adjustment),method:'mifflin-st-jeor-v3',input:{weight,height,age,sex,activity,objective,deficitPercent,activityFactor:factor,lossMode:objective==='lose'?lossMode:'weight',...(objective==='lose'&&lossMode==='weight'?{targetWeight,pace}:{})}};
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
 <label>Objetivo<select name="objective">${option('maintain','Mantener peso',saved.objective||'maintain')}${option('lose','Perder peso · peso objetivo y ritmo',saved.objective)}${option('gain','Ganar peso · superávit moderado',saved.objective)}</select></label>
 <label id="loss-mode-label">Cómo planificar la pérdida<select name="lossMode">${option('weight','Peso objetivo y ritmo',saved.lossMode||'weight')}${option('deficit','Déficit manual (%)',saved.lossMode)}</select></label>
 <label id="target-weight-label">Peso objetivo (kg)<input name="targetWeight" type="number" required min="30" max="300" step="0.1" value="${numeric(saved.targetWeight)}"></label>
 <label id="pace-label">Ritmo de pérdida<select name="pace">${option('moderate','Moderado · 0,25 % del peso inicial / semana',saved.pace||'medium')}${option('medium','Medio · 0,5 % del peso inicial / semana',saved.pace||'medium')}${option('fast','Rápido · 0,75 % del peso inicial / semana',saved.pace||'medium')}</select><span class="catalog-info">El ritmo solicitado puede reducirse por los límites de déficit. No es una pérdida garantizada.</span></label>
 <label id="deficit-label">Déficit de pérdida de peso (5–25 %)<input name="deficitPercent" type="number" required min="5" max="25" step="1" value="${numeric(saved.deficitPercent)||15}"><span class="catalog-info">10 % suave · 15 % moderado · 20 % alto · 25 % más agresivo. Máximo 500 kcal hasta el 20 % y 750 kcal por encima. El 25 % es más exigente; vigila recuperación, hambre y evolución.</span></label>
 <label style="grid-column:1/-1;display:flex;align-items:start"><input name="excluded" type="checkbox" style="width:auto"> Embarazo, lactancia, trastorno de la conducta alimentaria o condición médica que requiere una dieta específica. En estos casos no se generan objetivos automáticos.</label>
 <button class="primary">Estimar objetivos</button></form><div id="prediction" aria-live="polite"></div>
 <details style="margin-top:20px"><summary>Método, límites y fuentes</summary><p class="catalog-info">Gasto en reposo: 10 × kg + 6,25 × cm − 5 × años + 5 (masculino) o −161 (femenino). Factores de actividad aproximados: 1,2 / 1,375 / 1,55 / 1,725 / 1,9, o personalizado (1,1–2,4). Son supuestos prácticos, no una medición ni parte de la ecuación original. La ecuación utiliza dos coeficientes de sexo y puede no representar bien tu fisiología individual.</p><p class="catalog-info">Reglas de la app: por peso objetivo, el ritmo inicial solicita 0,25 / 0,5 / 0,75 % del peso por semana y limita el déficit al 25 % del gasto o 750 kcal. En modo manual, pérdida configurable −5 a −25 % (máximo 500 kcal hasta el 20 %, y 750 kcal por encima); ganancia +10 % (máximo 300 kcal). Proteína: 1,2 g/kg en mantenimiento sedentario, 1,6 g/kg con actividad o ganancia, 1,8 g/kg en pérdida. Grasas: 30 %; hidratos: energía restante. Son puntos de partida, no una prescripción clínica. La app limita propuestas bajas y repartos extremos; esos límites no definen una ingesta segura universal. El plazo del plan es orientativo: combina Mifflin recalculado al bajar peso con una equivalencia aproximada de 7700 kcal/kg, manteniendo constantes las calorías y la actividad. No modela agua, cambios de composición corporal ni adaptación metabólica adicional. No es el modelo dinámico clínico de Hall/NIDDK ni una fecha garantizada.</p><p class="catalog-info">Referencias: <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener">Mifflin et al., 1990</a>; <a href="https://pubmed.ncbi.nlm.nih.gov/15883556/" target="_blank" rel="noopener">Frankenfield et al., revisión de ecuaciones, 2005</a>; <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" target="_blank" rel="noopener">ISSN: proteína y ejercicio, 2017</a>. El consenso deportivo no valida por sí solo todos los ajustes de esta app. Contrasta la estimación con la tendencia de peso durante 2–4 semanas y ajusta tus objetivos según necesidad.</p></details></div>`;
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
export function bindTargetEditor(form,target,onChange=()=>{}){
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
    onChange(current);
    const total=4*current.protein+4*current.carbs+9*current.fat;
    status.textContent=`Macros: ${total.toFixed(1)} kcal · Objetivo: ${current.goal} kcal. Diferencia de redondeo: ${Math.abs(total-current.goal).toFixed(1)} kcal. Pendiente de guardar.`;
   }catch(error){field.setCustomValidity(error.message);status.textContent=error.message;}
  });
 }
 return ()=>Object.fromEntries(['goal','protein','carbs','fat'].map(k=>[k,current[k]]));
}


// Simplified model: dW/dt = -(TDEE(W)-intake)/7700; TDEE is linear in weight.
// Not a clinical forecast: constant activity/intake, no water or adaptive thermogenesis.
export function estimateWeightTimeline(plan,calories=plan?.goal){
 const i=plan?.input;
 if(!i||i.objective!=='lose'||i.lossMode!=='weight')return null;
 const {weight,targetWeight,height,age,sex}=i,factor=plan.factor;
 if(![weight,targetWeight,height,age,factor,calories].every(Number.isFinite)||targetWeight>=weight||factor<=0)return null;
 const maintenance=(10*weight+6.25*height-5*age+(sex==='male'?5:-161))*factor;
 const deficit=maintenance-calories,slope=10*factor,finalDeficit=deficit-slope*(weight-targetWeight);
 const common={weight,targetWeight,kgToLose:weight-targetWeight,initialKgPerWeek:Math.max(0,deficit)*7/7700,limited:deficit+10<weight*LOSS_PACES[i.pace]*7700/7};
 if(deficit<=0||finalDeficit<=0)return {...common,weeks:null,reason:'Con estas calorías constantes no se prevé alcanzar ese peso en este modelo. Será necesario revisar las calorías o el objetivo durante el proceso.'};
 const days=7700/slope*Math.log(deficit/finalDeficit);
 if(!Number.isFinite(days)||days>730)return {...common,weeks:null,reason:'El plazo supera dos años en este modelo simplificado; no mostramos una cifra precisa. Revisa el plan por etapas.'};
 return {...common,days,weeks:Math.max(1,Math.ceil(days/7))};
}
export function weightTimelineMarkup(plan,calories=plan?.goal){
 const result=estimateWeightTimeline(plan,Number(calories));if(!result)return '';
 return `<div class="card" style="margin-top:16px"><h3>Tu plan: ${result.weight} → ${result.targetWeight} kg</h3><p>${result.kgToLose.toFixed(1)} kg de diferencia · ${Number(calories)} kcal/día.</p><p>${result.weeks?`<strong>Plazo orientativo: unas ${result.weeks} semanas</strong> (${(result.weeks/4.35).toFixed(1)} meses).`:result.reason}</p><p class="catalog-info">Ritmo inicial estimado: ${result.initialKgPerWeek.toFixed(2)} kg/semana. El ritmo se reduce al bajar el gasto.${result.limited?' Los límites de déficit o las calorías editadas reducen el ritmo solicitado.':''} Estimación desde el peso utilizado en el cálculo, no una fecha garantizada. Revisa la tendencia real y recalcula cada 2–4 semanas.</p></div>`;
}

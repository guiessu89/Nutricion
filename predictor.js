// Mifflin–St Jeor (1990). PAL and energy adjustments are application assumptions.
export const ACTIVITY={sedentary:1.2,light:1.375,moderate:1.55,high:1.725};
export function predictTargets(input){
 const {weight,height,age,sex,activity,objective}=input;
 for(const [name,value,min,max] of [['peso',weight,30,300],['altura',height,120,230],['edad',age,18,80]])if(!Number.isFinite(value)||value<min||value>max)throw new Error(`Revisa ${name}: debe estar entre ${min} y ${max}.`);
 if(!['female','male'].includes(sex)||!Object.hasOwn(ACTIVITY,activity)||!['maintain','lose','gain'].includes(objective))throw new Error('Selecciona sexo de la fórmula, actividad y objetivo.');
 if(input.excluded)throw new Error('En esta situación utiliza objetivos individualizados con un profesional.');
 const bmi=weight/(height/100)**2;
 if(bmi<18.5&&objective==='lose')throw new Error('Con este peso y altura no se propone un déficit automático.');
 const resting=10*weight+6.25*height-5*age+(sex==='male'?5:-161);
 const maintenance=resting*ACTIVITY[activity];
 const adjustment=objective==='lose'?-Math.min(maintenance*.15,500):objective==='gain'?Math.min(maintenance*.1,300):0;
 const goal=Math.round((maintenance+adjustment)/10)*10;
 // A conservative product guardrail, not a universal physiological minimum.
 if(goal<(sex==='male'?1500:1200))throw new Error('La estimación queda fuera del rango de propuestas automáticas. Consulta objetivos individualizados.');
 const ratio=objective==='lose'?1.8:activity==='sedentary'&&objective==='maintain'?1.2:1.6;
 const protein=Math.round(weight*ratio),fat=Math.round(goal*.30/9),carbs=Math.round((goal-protein*4-fat*9)/4);
 if(carbs<50||protein*4/goal>.35)throw new Error('El reparto automático no es adecuado para estos datos. Necesitas un ajuste individualizado.');
 return {goal,protein,fat,carbs,resting:Math.round(resting),maintenance:Math.round(maintenance),factor:ACTIVITY[activity],proteinRatio:ratio,bmi,adjustment:Math.round(adjustment),method:'mifflin-st-jeor-v1',input:{weight,height,age,sex,activity,objective}};
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
 <label>Actividad habitual<select name="activity" required><option value="">Selecciona</option>${option('sedentary','Sedentaria · trabajo sentado, poco movimiento',saved.activity)}${option('light','Ligera · algo de movimiento y ejercicio ligero',saved.activity)}${option('moderate','Moderada · movimiento diario y ejercicio regular',saved.activity)}${option('high','Alta · trabajo físico o entrenamiento exigente',saved.activity)}</select></label>
 <label>Objetivo<select name="objective">${option('maintain','Mantener peso',saved.objective||'maintain')}${option('lose','Perder peso · déficit moderado',saved.objective)}${option('gain','Ganar peso · superávit moderado',saved.objective)}</select></label>
 <label style="grid-column:1/-1;display:flex;align-items:start"><input name="excluded" type="checkbox" style="width:auto"> Embarazo, lactancia, trastorno de la conducta alimentaria o condición médica que requiere una dieta específica. En estos casos no se generan objetivos automáticos.</label>
 <button class="primary">Estimar objetivos</button></form><div id="prediction" aria-live="polite"></div>
 <details style="margin-top:20px"><summary>Método, límites y fuentes</summary><p class="catalog-info">Gasto en reposo: 10 × kg + 6,25 × cm − 5 × años + 5 (masculino) o −161 (femenino). Factores de actividad aproximados: 1,2 / 1,375 / 1,55 / 1,725. Son supuestos prácticos, no una medición ni parte de la ecuación original. La ecuación utiliza dos coeficientes de sexo y puede no representar bien tu fisiología individual.</p><p class="catalog-info">Reglas de la app: pérdida −15 % (máximo 500 kcal); ganancia +10 % (máximo 300 kcal). Proteína: 1,2 g/kg en mantenimiento sedentario, 1,6 g/kg con actividad o ganancia, 1,8 g/kg en pérdida. Grasas: 30 %; hidratos: energía restante. Son puntos de partida, no una prescripción clínica. La app limita propuestas bajas y repartos extremos; esos límites no definen una ingesta segura universal. No se predice una fecha ni una cantidad de pérdida de peso.</p><p class="catalog-info">Referencias: <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener">Mifflin et al., 1990</a>; <a href="https://pubmed.ncbi.nlm.nih.gov/15883556/" target="_blank" rel="noopener">Frankenfield et al., revisión de ecuaciones, 2005</a>; <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" target="_blank" rel="noopener">ISSN: proteína y ejercicio, 2017</a>. El consenso deportivo no valida por sí solo todos los ajustes de esta app. Contrasta la estimación con la tendencia de peso durante 2–4 semanas y ajusta tus objetivos según necesidad.</p></details></div>`;
}

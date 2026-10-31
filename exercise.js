// 2024 Adult Compendium: https://pacompendium.com/running/ and /sports/.
export const SPORT_OPTIONS={
 run_slow:{type:'Correr',label:'Carrera suave · 6,4–6,8 km/h',met:6.5,code:'12028'},
 run_8:{type:'Correr',label:'Carrera · 8–8,4 km/h',met:8.5,code:'12030'},
 run_10:{type:'Correr',label:'Carrera · 9,7–10,1 km/h',met:9.3,code:'12050'},
 run_11:{type:'Correr',label:'Carrera · 11,3 km/h',met:11,code:'12070'},
 run_13:{type:'Correr',label:'Carrera · 12,9 km/h',met:12,code:'12090'},
 climb_easy:{type:'Escalada',label:'Vía o travesía · dificultad baja–moderada',met:5.8,code:'15537'},
 climb_hard:{type:'Escalada',label:'Vía · dificultad alta',met:7.3,code:'15535'},
 boulder:{type:'Escalada',label:'Búlder · tiempo de escalada activa',met:8.8,code:'15534'}
};
export function estimateExercise({type,variant,weight,minutes}){
 const option=SPORT_OPTIONS[variant];if(!option||option.type!==type)throw Error('Selecciona una modalidad de carrera o escalada.');
 if(!Number.isFinite(weight)||weight<20||weight>400||!Number.isFinite(minutes)||minutes<1||minutes>1440)throw Error('Introduce peso (20–400 kg) y minutos activos (1–1440) válidos.');
 return {method:'met-net-v1',met:option.met,weight,minutes,kcal:Math.round((option.met-1)*3.5*weight/200*minutes),grossKcal:Math.round(option.met*3.5*weight/200*minutes),label:option.label,referenceCode:option.code};
}
export function exerciseSummary(activities){return {kcal:activities.reduce((sum,a)=>sum+((Number.isFinite(a.energyEstimate?.kcal)&&a.energyEstimate.kcal>=0)?a.energyEstimate.kcal:0),0),missing:activities.filter(a=>!(Number.isFinite(a.energyEstimate?.kcal)&&a.energyEstimate.kcal>=0)).length};}

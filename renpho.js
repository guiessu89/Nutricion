import {csvRows} from './fatsecret.js';
export function parseRenphoCSV(text){
 if(text.length>10e6)throw Error('El archivo supera 10 MB.');
 const rows=csvRows(text).filter(r=>r.some(v=>v.trim())),header=rows.shift()?.map(v=>v.trim());
 if(!header||!['Date','Time','Weight(kg)'].every(k=>header.includes(k)))throw Error('Usa la exportación CSV de RENPHO con peso en kg.');
 const result=[];
 for(const row of rows){
  const raw=Object.fromEntries(header.map((k,i)=>[k,(row[i]||'').trim()]));
  const date=raw.Date.replaceAll('.','-'),time=raw.Time;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}:\d{2}$/.test(time))throw Error('Fecha u hora de medida no válida.');
  const stamp=date+'T'+time,d=new Date(stamp+'Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,19)!==stamp)throw Error('Fecha u hora de medida no válida.');
  const number=(key)=>{const v=raw[key];if(v===undefined||v===''||v==='--')return null;const n=Number(v.replace(',','.'));if(!Number.isFinite(n)||n<0)throw Error('Medida numérica no válida: '+key);return n;};
  const weight=number('Weight(kg)'),bodyFat=number('Body Fat Percentage(%)');
  if(weight===null||weight<20||weight>400||bodyFat!==null&&bodyFat>100)throw Error('Peso o porcentaje de grasa fuera del rango admitido.');
  const renphoMetrics=Object.fromEntries(header.filter(k=>!['No.','Date','Time','Remarks','Weight Level','Body Type'].includes(k)).map(k=>[k,number(k)]));
  result.push({date,time,weight,bodyFat,fatFreeMass:number('Fat-Free Mass(kg)'),muscleMass:number('Muscle Mass(kg)'),waterPercent:number('Body Water Percentage(%)'),bmr:number('BMR(kcal)'),source:'renpho',renphoMetrics,renphoRemarks:raw.Remarks==='--'?'':raw.Remarks,importKey:JSON.stringify(['renpho',stamp,renphoMetrics,raw.Remarks||''])});
 }
 if(!result.length)throw Error('No se encontraron medidas.');return result.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
export function mergeRenpho(weights,records){
 const keys=new Set(weights.map(w=>w.importKey).filter(Boolean)),added=[];
 for(const record of records){if(keys.has(record.importKey))continue;keys.add(record.importKey);added.push({...structuredClone(record),id:crypto.randomUUID()});}
 return {weights:[...weights,...added],added:added.length,skipped:records.length-added.length};
}
export function dailyWeights(weights){
 const grouped=new Map();for(const w of weights){const previous=grouped.get(w.date);if(!previous||(!w.source&&previous.source)||Boolean(w.source)===Boolean(previous.source)&&(w.time||'')>=(previous.time||''))grouped.set(w.date,w);}
 return [...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

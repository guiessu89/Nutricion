// FatSecret detailed food diary CSV. Reports and uploaded personal data must never be committed.
const MEALS={Breakfast:'Desayuno',Lunch:'Comida',Dinner:'Cena','Snacks/Other':'Tentempiés'};
const MONTHS={January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
const COLUMNS={'Cals ( kcal)':'kcal','Fat( g)':'f','Carbs( g)':'c','Prot( g)':'p','Sat( g)':'saturatedFat','Fiber( g)':'fiber','Sugar( g)':'sugars','Sod( mg)':'sodiumMg','Chol( mg)':'cholesterolMg','Potassium( mg)':'potassiumMg'};
export function csvRows(text){
 const rows=[];let row=[],field='',quoted=false;
 const push=()=>{row.push(field);field='';};
 const source=text.replace(/^\uFEFF/,'');
 for(let i=0;i<source.length;i++){
  const ch=source[i];
  if(quoted){if(ch==='"'&&source[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}
  else if(ch==='"'&&field==='')quoted=true;
  else if(ch===',')push();
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&source[i+1]==='\n')i++;push();rows.push(row);row=[];}
  else field+=ch;
 }
 if(quoted)throw Error('El CSV contiene un campo entrecomillado sin cerrar.');
 if(field||row.length){push();rows.push(row);}return rows;
}
function dateValue(text){
 const m=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), ([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(text);
 if(!m)return null;const month=MONTHS[m[2]],day=Number(m[3]),year=Number(m[4]);
 if(!month)throw Error('Mes no reconocido en el informe.');const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 if(new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Fecha no válida en el informe.');return date;
}
function values(row,header){
 const result={};for(const [column,key] of Object.entries(COLUMNS)){
  const i=header.indexOf(column),raw=i<0?'':(row[i]||'').trim();
  if(!raw){result[key]=null;continue;}const n=Number(raw);if(!Number.isFinite(n)||n<0)throw Error(`Nutriente no válido: ${column}.`);result[key]=n;
 }
 if(['kcal','p','c','f'].some(k=>result[k]===null))throw Error('Hay un alimento sin calorías o macros completos. No se ha importado nada.');return result;
}
export function parseFatSecretCSV(text){
 if(text.length>10e6)throw Error('El CSV supera el tamaño máximo de 10 MB.');
 const rows=csvRows(text);let header=null,date=null,meal=null,pending=null;const entries=[],days=new Set(),occurrences=new Map();
 const finish=()=>{
  if(!pending)return;
  const quantityLabel=pending.quantity||'Cantidad no indicada en el informe';
  // FatSecret labels with a trailing weight give the TOTAL consumed mass, not mass per unit.
  const matches=[...quantityLabel.matchAll(/(\d+(?:[.,]\d+)?)\s*g\b/g)],grams=matches.length?Number(matches.at(-1)[1].replace(',','.')):null;
  if(grams!==null&&(!Number.isFinite(grams)||grams<=0))throw Error('Peso de alimento no válido.');
  const food={id:'',name:pending.name,basis:grams===null?'portion':'100g',source:'FatSecret · diario personal',...(grams===null?{portionLabel:quantityLabel}:{})};
  for(const [key,n] of Object.entries(pending.nutrients))food[key]=n===null?null:n*(grams===null?1:100/grams);
  const canonical=JSON.stringify([date,meal,pending.name,quantityLabel,pending.nutrients]);const occurrence=(occurrences.get(canonical)||0)+1;occurrences.set(canonical,occurrence);
  entries.push({date,meal,grams,servings:grams===null?1:null,food,quantityLabel,recordedNutrients:pending.nutrients,importSource:'fatsecret',importKey:canonical+'#'+occurrence});pending=null;
 };
 for(const row of rows){
  const first=row[0]||'';if(first.trim()==='Date'&&row.includes('Cals ( kcal)')){finish();header=row.map(v=>v.trim());continue;}
  if(!header||!first.trim()||first.startsWith('#'))continue;
  const foundDate=dateValue(first);
  if(foundDate){finish();date=foundDate;meal=null;days.add(date);continue;}
  const indent=first.length-first.trimStart().length;
  if(indent===1&&MEALS[first.trim()]){finish();meal=MEALS[first.trim()];continue;}
  if(indent===2){finish();if(!date||!meal)throw Error('Alimento sin fecha o comida asociada.');pending={name:first.trim(),nutrients:values(row,header),quantity:null};continue;}
  if(indent>=3){if(!pending)throw Error('Cantidad sin alimento asociado.');pending.quantity=row.join(',').trim();continue;}
  if(first.trim()==='Total'){finish();continue;}
  throw Error('Formato de informe no reconocido. Usa el CSV detallado de alimentos de FatSecret en inglés.');
 }
 finish();if(!header||!entries.length)throw Error('No se encontraron alimentos en un informe detallado válido.');
 const names=new Set(entries.map(e=>e.food.name));
 return {entries,days:[...days].sort(),foodNames:names.size,portionEntries:entries.filter(e=>e.grams===null).length};
}
export function mergeFatSecret(state,report,{history=true,library=true}={}){
 const keys=new Set(state.entries.map(e=>e.importKey).filter(Boolean));
 const additions=history?report.entries.filter(e=>!keys.has(e.importKey)):[];
 const libraryKeys=new Set(state.custom.map(f=>JSON.stringify([f.name.toLocaleLowerCase(),f.basis||'100g',f.portionLabel||''])));
 const custom=[];
 if(library)for(const entry of report.entries){const f=entry.food,key=JSON.stringify([f.name.toLocaleLowerCase(),f.basis||'100g',f.portionLabel||'']);if(libraryKeys.has(key))continue;libraryKeys.add(key);custom.push({...f,id:crypto.randomUUID()});}
 return {state:{...state,entries:[...state.entries,...additions.map(e=>({...e,id:crypto.randomUUID(),food:{...e.food,id:crypto.randomUUID()}}))],custom:[...state.custom,...custom]},added:additions.length,skipped:history?report.entries.length-additions.length:0,foodsAdded:custom.length};
}

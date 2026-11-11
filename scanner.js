// Browser-only scanner. Photos are processed locally; barcode lookup uses Open Food Facts.
const number = value => { if(value===null||value===undefined||String(value).trim()==='')return null; const n=Number(String(value??'').replace(/\s/g,'').replace(',','.')); return Number.isFinite(n)&&n>=0?n:null; };
export function parseNutrition(text){
 const lines=String(text).split(/\n/).map(x=>x.trim()).filter(Boolean);
 const patterns={kcal:/\b(?:kcal|calor[ií]as)\b/i,p:/\b(?:prote[ií]nas?|protein)\b/i,c:/\b(?:hidratos|carbohidratos|carbohydrates|carbs)\b/i,f:/\b(?:grasas?\s*(?:totales?)?|fat|l[ií]pidos)\b/i};
 const result={kcal:null,p:null,c:null,f:null};
 const extract=(line,key)=>{
  let match;
  if(key==='kcal'){
   match=line.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*kcal\b/i);
   if(match)return number(match[1]);
  }
  const label=patterns[key].exec(line);
  if(!label)return null;
  let tail=line.slice(label.index+label[0].length).replace(/^\s*[:.\-]?\s*/,'');
  const values=[...tail.matchAll(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:g|kcal)?(?=\s|$|\/|\||;)/gi)].map(m=>number(m[1])).filter(v=>v!==null);
  return values.find(v=>v<=(key==='kcal'?1000:100))??null;
 };
 for(let i=0;i<lines.length;i++){
  for(const key of Object.keys(result)){
   if(result[key]!==null)continue;
   let v=extract(lines[i],key);
   if(v===null&&patterns[key].test(lines[i])&&i+1<lines.length&&/^\s*\d/.test(lines[i+1]))v=number(lines[i+1].match(/\d+(?:[.,]\d+)?/)?.[0]);
   if(v!==null&&v<=(key==='kcal'?1000:100))result[key]=v;
  }
 }
 return result;
}
export function barcodeProduct(product){
 const n=product?.nutriments||{};
 const val=(...keys)=>{for(const key of keys){const v=number(n[key]);if(v!==null)return v;}return null;};
 return {name:product?.product_name_es||product?.product_name||'',kcal:val('energy-kcal_100g'),p:val('proteins_100g'),c:val('carbohydrates_100g'),f:val('fat_100g')};
}
export function setupScanner({onFood,onMessage}){
 const dialog=document.getElementById('scanner-dialog'),file=document.getElementById('scanner-photo'),gallery=document.getElementById('scanner-gallery'),status=document.getElementById('scanner-status'),form=document.getElementById('scanner-form');
 let stream=null,detector=null,frame=0,busy=false,previewURL=null;
 const preview=document.getElementById('scanner-preview');
 const photoStatus=document.getElementById('scanner-photo-status');
 const video=document.getElementById('scanner-video');
 const say=t=>{status.textContent=t;onMessage?.(t);};
 const stop=()=>{cancelAnimationFrame(frame);frame=0;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;};
 const populate=food=>{for(const k of ['name','kcal','p','c','f'])form.elements[k].value=food[k]??'';};
 const lookup=async code=>{
  say('Buscando código de barras…');
  try{
   const response=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_es,nutriments',{headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Error de consulta');
   const data=await response.json();
   if(data.status!==1)throw Error('Producto no encontrado. Puedes fotografiar su etiqueta.');
   populate(barcodeProduct(data.product));say('Producto encontrado. Comprueba los valores por 100 g.');
  }catch(error){say(error.message);}
 };
 async function scanFrame(){
  if(!stream||!detector)return;
  try{const codes=await detector.detect(video);if(codes.length){stop();await lookup(codes[0].rawValue);return;}}catch{}
  frame=requestAnimationFrame(scanFrame);
 }
 async function start(){
  stop();
  if(!navigator.mediaDevices?.getUserMedia){say('La cámara requiere HTTPS. Usa una fotografía o introduce el código.');return;}
  if(!('BarcodeDetector' in window)){say('Este navegador no admite escaneo de códigos en directo. Introduce el código o fotografía la etiqueta.');return;}
  try{
   detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
   video.srcObject=stream;await video.play();say('Apunta al código de barras.');scanFrame();
  }catch(error){stop();say('No se pudo abrir la cámara. Comprueba los permisos o usa una fotografía.');}
 }
 document.getElementById('scan-open').onclick=()=>{dialog.showModal();say('Escanea un código o fotografía la tabla nutricional.');};
 document.getElementById('scan-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{stop();if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}preview.hidden=true;photoStatus.hidden=true;});
 document.getElementById('scanner-start').onclick=start;
 document.getElementById('scanner-lookup').onclick=()=>{const code=document.getElementById('scanner-code').value.trim();if(!/^\d{8,14}$/.test(code)){say('Introduce un código de 8 a 14 cifras.');return;}stop();lookup(code);};
 const processImage=async image=>{
  if(!image||busy)return;
  busy=true;stop();
  if(previewURL)URL.revokeObjectURL(previewURL);
  previewURL=URL.createObjectURL(image);preview.src=previewURL;preview.hidden=false;
  photoStatus.hidden=false;photoStatus.textContent='Imagen seleccionada: '+image.name+' ('+Math.round(image.size/1024)+' KB)';
  say('Imagen cargada. Preparando reconocimiento OCR…');
  try{
   if(!window.Tesseract){
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar el motor OCR. Revisa la conexión.'));document.head.append(script);});
   }
   say('Motor OCR cargado. Leyendo etiqueta, espera unos segundos…');
   const worker=await window.Tesseract.createWorker('spa+eng');
   let text='';
   try{({data:{text}}=await worker.recognize(image));}finally{await worker.terminate();}
   if(!text.trim())throw Error('No se detectó texto legible. Prueba con una foto más cercana y nítida.');
   const parsed=parseNutrition(text);populate({...Object.fromEntries(new FormData(form)),...Object.fromEntries(Object.entries(parsed).filter(([,v])=>v!==null))});
   say(Object.values(parsed).some(v=>v!==null)?'Valores detectados: '+Object.entries(parsed).filter(([,v])=>v!==null).map(([k,v])=>k+': '+v).join(', ')+'. Revisa los datos por 100 g.':'Se leyó texto, pero no se pudieron identificar valores nutricionales. Introdúcelos manualmente o prueba otra foto.');
  }catch(error){say('OCR no disponible: '+error.message);}finally{file.value='';gallery.value='';busy=false;}
 };
 file.onchange=()=>processImage(file.files?.[0]);
 gallery.onchange=()=>processImage(gallery.files?.[0]);
 form.onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));const food={name:data.name.trim()};for(const k of ['kcal','p','c','f']){food[k]=number(data[k]);if(food[k]===null||food[k]>(k==='kcal'?1000:100)){say('Comprueba '+k+' por 100 g.');return;}}if(!food.name){say('Introduce el nombre del alimento.');return;}onFood(food);dialog.close();};
}

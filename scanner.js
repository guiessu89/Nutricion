// Browser-only scanner. Photos are processed locally; barcode lookup uses Open Food Facts.
const number = value => { const n=Number(String(value??'').replace(/\s/g,'').replace(',','.')); return Number.isFinite(n)&&n>=0?n:null; };
export function parseNutrition(text){
 const lines=String(text).split(/\n/).map(x=>x.trim()).filter(Boolean);
 const find=(patterns,max)=>{for(const line of lines){if(!patterns.some(p=>p.test(line)))continue;const m=line.match(/(?:^|\s|:)\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:g|kcal)?\b/i);if(m){const n=number(m[1]);if(n!==null&&n<=max)return n;}}return null;};
 const kcal=find([/\b(?:energ[ií]a|energy|valor energ[eé]tico)\b.*\bkcal\b/i,/\bkcal\b/i],1000);
 const p=find([/\b(?:prote[ií]nas?|protein)\b/i],100);
 const c=find([/\b(?:hidratos|carbohidratos|carbohydrates|carbs)\b/i],100);
 const f=find([/\b(?:grasas?|fat|l[ií]pidos)\b/i],100);
 return {kcal,p,c,f};
}
export function barcodeProduct(product){
 const n=product?.nutriments||{};
 const val=(...keys)=>{for(const key of keys){const v=number(n[key]);if(v!==null)return v;}return null;};
 return {name:product?.product_name_es||product?.product_name||'',kcal:val('energy-kcal_100g'),p:val('proteins_100g'),c:val('carbohydrates_100g'),f:val('fat_100g')};
}
export function setupScanner({onFood,onMessage}){
 const dialog=document.getElementById('scanner-dialog'),file=document.getElementById('scanner-photo'),gallery=document.getElementById('scanner-gallery'),status=document.getElementById('scanner-status'),form=document.getElementById('scanner-form');
 let stream=null,detector=null,frame=0;
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
 dialog.addEventListener('close',stop);
 document.getElementById('scanner-start').onclick=start;
 document.getElementById('scanner-lookup').onclick=()=>{const code=document.getElementById('scanner-code').value.trim();if(!/^\d{8,14}$/.test(code)){say('Introduce un código de 8 a 14 cifras.');return;}stop();lookup(code);};
 const processImage=async image=>{
  if(!image)return;
  stop();say('Reconociendo texto en el dispositivo…');
  try{
   if(!window.Tesseract){
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar el motor OCR. Revisa la conexión.'));document.head.append(script);});
   }
   const worker=await window.Tesseract.createWorker('spa+eng');
   let text='';
   try{({data:{text}}=await worker.recognize(image));}finally{await worker.terminate();}
   const parsed=parseNutrition(text);populate({...Object.fromEntries(new FormData(form)),...Object.fromEntries(Object.entries(parsed).filter(([,v])=>v!==null))});
   say('Texto reconocido. Revisa los valores y asegúrate de que corresponden a 100 g, no a una ración.');
  }catch(error){say('OCR no disponible: '+error.message);}finally{file.value='';gallery.value='';}
 };
 file.onchange=()=>processImage(file.files?.[0]);
 gallery.onchange=()=>processImage(gallery.files?.[0]);
 form.onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));const food={name:data.name.trim()};for(const k of ['kcal','p','c','f']){food[k]=number(data[k]);if(food[k]===null||food[k]>(k==='kcal'?1000:100)){say('Comprueba '+k+' por 100 g.');return;}}if(!food.name){say('Introduce el nombre del alimento.');return;}onFood(food);dialog.close();};
}

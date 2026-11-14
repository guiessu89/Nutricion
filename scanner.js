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
 let stream=null,detector=null,frame=0,busy=false,previewURL=null,zxingControls=null;
 const preview=document.getElementById('scanner-preview');
 const photoStatus=document.getElementById('scanner-photo-status');
 const video=document.getElementById('scanner-video');
 const snapshot=document.getElementById('scanner-snapshot');
 let cameraMode=null;
 const cropArea=document.getElementById('scanner-crop-area'),cropStage=document.getElementById('scanner-crop-stage'),cropImage=document.getElementById('scanner-crop-image'),cropSelection=document.getElementById('scanner-crop-selection');
 let selectedImage=null,selection=null,dragStart=null;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const position=e=>{const r=cropImage.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)};};
 const drawSelection=()=>{
  if(!selection){cropSelection.hidden=true;return;}
  cropSelection.hidden=false;
  Object.assign(cropSelection.style,{left:(selection.x*100)+'%',top:(selection.y*100)+'%',width:(selection.w*100)+'%',height:(selection.h*100)+'%'});
 };
 cropStage.addEventListener('pointerdown',e=>{if(!selectedImage||busy)return;dragStart=position(e);selection=null;cropStage.setPointerCapture(e.pointerId);e.preventDefault();});
 cropStage.addEventListener('pointermove',e=>{if(!dragStart)return;const p=position(e);selection={x:Math.min(dragStart.x,p.x),y:Math.min(dragStart.y,p.y),w:Math.abs(p.x-dragStart.x),h:Math.abs(p.y-dragStart.y)};drawSelection();e.preventDefault();});
 const endDrag=()=>{dragStart=null;if(selection&&(selection.w<.015||selection.h<.015)){selection=null;drawSelection();}};
 cropStage.addEventListener('pointerup',endDrag);cropStage.addEventListener('pointercancel',endDrag);
 const cropFile=async()=>{
  if(!selection||selection.w<.015||selection.h<.015)throw Error('Selecciona primero la zona de la etiqueta arrastrando el dedo.');
  const bitmap=await createImageBitmap(selectedImage,{imageOrientation:'from-image'});
  try{
   const sx=Math.round(selection.x*bitmap.width),sy=Math.round(selection.y*bitmap.height);
   const sw=Math.max(1,Math.round(selection.w*bitmap.width)),sh=Math.max(1,Math.round(selection.h*bitmap.height));
   const scale=Math.min(3,Math.max(1,1600/Math.max(sw,sh)));
   const canvas=document.createElement('canvas');canvas.width=Math.round(sw*scale);canvas.height=Math.round(sh*scale);
   const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
   return canvas;
  }finally{bitmap.close();}
 };
 document.getElementById('scanner-crop-apply').onclick=async()=>{if(busy)return;try{const canvas=await cropFile();await recognize(canvas);}catch(error){say(error.message);}};
 document.getElementById('scanner-crop-full').onclick=()=>{if(!busy&&selectedImage)recognize(selectedImage);};

 const say=t=>{status.textContent=t;onMessage?.(t);};
 const stop=()=>{cameraMode=null;snapshot.hidden=true;zxingControls?.stop();zxingControls=null;cancelAnimationFrame(frame);frame=0;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;};
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
  if(!navigator.mediaDevices?.getUserMedia){say('La cámara requiere HTTPS y permisos. También puedes introducir el código manualmente.');return;}
  try{
   cameraMode='barcode';say('Abriendo cámara…');
   if('BarcodeDetector' in window){
    try{
     detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});
     stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
     video.srcObject=stream;await video.play();say('Apunta al código de barras.');scanFrame();return;
    }catch(error){stop();detector=null;}
   }
   say('Preparando lector de códigos compatible con Safari…');
   const ZXing=await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
   const reader=new ZXing.BrowserMultiFormatReader();
   zxingControls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'}}},video,(result,error,controls)=>{
    if(result){const code=result.getText();controls.stop();zxingControls=null;lookup(code);}
   });
   say('Apunta al código de barras. Mantén la cámara estable.');
  }catch(error){stop();say('No se pudo iniciar el lector: '+error.message+'. Introduce el código manualmente.');}
 }
 document.getElementById('scanner-label-camera').onclick=async()=>{
  stop();
  if(!navigator.mediaDevices?.getUserMedia){say('No se puede abrir la cámara integrada. Utiliza la cámara del teléfono o la galería.');return;}
  try{
   say('Abriendo cámara para fotografiar etiqueta…');
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
   cameraMode='label';video.srcObject=stream;await video.play();snapshot.hidden=false;
   video.scrollIntoView({block:'nearest',behavior:'smooth'});
   say('Encuadra la tabla nutricional y pulsa «Capturar etiqueta».');
  }catch(error){stop();say('No se pudo abrir la cámara integrada: '+error.message+'. Usa la opción alternativa.');}
 };
 snapshot.onclick=async()=>{
  if(cameraMode!=='label'||!stream||video.readyState<2){say('Espera a que aparezca la imagen de la cámara.');return;}
  const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0);
  stop();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
  if(!blob){say('No se pudo capturar la imagen.');return;}
  await processImage(new File([blob],'etiqueta-camara.jpg',{type:'image/jpeg'}));
 };
 document.getElementById('scan-open').onclick=()=>{dialog.showModal();say('Escanea un código o fotografía la tabla nutricional.');};
 document.getElementById('scan-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{selectedImage=null;selection=null;dragStart=null;cropArea.hidden=true;cropImage.removeAttribute('src');drawSelection();stop();if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}preview.hidden=true;photoStatus.hidden=true;});
 document.getElementById('scanner-start').onclick=start;
 document.getElementById('scanner-lookup').onclick=()=>{const code=document.getElementById('scanner-code').value.trim();if(!/^\d{8,14}$/.test(code)){say('Introduce un código de 8 a 14 cifras.');return;}stop();lookup(code);};
 const recognize=async source=>{
  if(!source||busy)return;
  busy=true;cropArea.hidden=true;document.getElementById('scanner-ocr-debug').hidden=true;say('Preparando reconocimiento OCR…');
  try{
   if(!window.Tesseract){
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar el motor OCR. Revisa la conexión.'));document.head.append(script);});
   }
   say('Leyendo la etiqueta. Puede tardar unos segundos…');
   const worker=await window.Tesseract.createWorker('spa+eng');
   let text='',parsed={kcal:null,p:null,c:null,f:null};
   try{
    const original=await worker.recognize(source);
    text=original.data.text||'';parsed=parseNutrition(text);
    // Second pass: upscale, grayscale and improve local contrast on small labels.
    if(Object.values(parsed).filter(v=>v!==null).length<4){
     const bitmap=source instanceof HTMLCanvasElement?source:await createImageBitmap(source);
     try{
      const scale=Math.min(3,Math.max(1,1800/Math.max(bitmap.width,bitmap.height)));
      const canvas=document.createElement('canvas');
      canvas.width=Math.min(3000,Math.round(bitmap.width*scale));
      canvas.height=Math.min(3000,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height);
      const px=data.data;
      let low=255,high=0;
      for(let i=0;i<px.length;i+=4){const v=Math.round(.299*px[i]+.587*px[i+1]+.114*px[i+2]);px[i]=px[i+1]=px[i+2]=v;low=Math.min(low,v);high=Math.max(high,v);}
      const range=Math.max(1,high-low);
      for(let i=0;i<px.length;i+=4){const v=Math.max(0,Math.min(255,(px[i]-low)*255/range));px[i]=px[i+1]=px[i+2]=v;}
      ctx.putImageData(data,0,0);
      say('Realizando una segunda lectura con contraste mejorado…');
      const second=await worker.recognize(canvas);
      const candidate=parseNutrition(second.data.text||'');
      for(const key of Object.keys(parsed))if(parsed[key]===null&&candidate[key]!==null)parsed[key]=candidate[key];
      if((second.data.text||'').length>text.length)text=second.data.text;
     }finally{if(bitmap!==source)bitmap.close();}
    }
   }finally{await worker.terminate();}
   document.getElementById('scanner-ocr-debug').hidden=false;
   document.getElementById('scanner-ocr-text').textContent=text||'(No se reconoció texto)';
   if(!text.trim())throw Error('No se detectó texto legible. Prueba con una selección más nítida.');
   populate({...Object.fromEntries(new FormData(form)),...Object.fromEntries(Object.entries(parsed).filter(([,v])=>v!==null))});
   const detected=Object.entries(parsed).filter(([,v])=>v!==null);
   say(detected.length?'Valores detectados: '+detected.map(([k,v])=>k+': '+v).join(', ')+'. Comprueba los valores por 100 g.':'Se reconoció texto pero no los valores. Prueba otro recorte o introdúcelos manualmente.');
  }catch(error){say('Error de reconocimiento: '+error.message);}
  finally{busy=false;cropArea.hidden=false;}
 };
 const processImage=async image=>{
  if(!image||busy)return;
  stop();selectedImage=image;selection=null;dragStart=null;drawSelection();
  if(previewURL)URL.revokeObjectURL(previewURL);
  previewURL=URL.createObjectURL(image);
  preview.src=previewURL;preview.hidden=true;
  cropImage.src=previewURL;cropArea.hidden=false;
  photoStatus.hidden=false;photoStatus.textContent='Imagen seleccionada: '+image.name+' ('+Math.round(image.size/1024)+' KB)';
  say('Arrastra el dedo para seleccionar la tabla nutricional y pulsa «Leer selección».');
  file.value='';gallery.value='';
 };
 file.onchange=()=>processImage(file.files?.[0]);
 gallery.onchange=()=>processImage(gallery.files?.[0]);
 form.onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));const food={name:data.name.trim()};for(const k of ['kcal','p','c','f']){food[k]=number(data[k]);if(food[k]===null||food[k]>(k==='kcal'?1000:100)){say('Comprueba '+k+' por 100 g.');return;}}if(!food.name){say('Introduce el nombre del alimento.');return;}onFood(food);dialog.close();};
}

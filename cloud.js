// Only expose known messages and a bounded error code, never server detail/SQL or tokens.
export function cloudError(status,data,path){
 const rawCode=typeof data?.error_code==='string'?data.error_code:data?.code;
 const code=typeof rawCode==='string'&&/^[A-Za-z0-9_]{1,48}$/.test(rawCode)?rawCode:'';
 const auth=path.startsWith('/auth/v1/token');
 const operation=auth?'No se pudo iniciar sesión':path.includes('/rpc/')?'No se pudo guardar':path==='/auth/v1/logout'?'No se pudo cerrar la sesión':'No se pudieron cargar los datos';
 const messages={
  invalid_credentials:'Email o contraseña incorrectos. Usa la cuenta creada en Supabase Authentication, no la cuenta de GitHub ni la contraseña del proyecto.',
  email_not_confirmed:'Tu email no está confirmado. Confírmalo desde el correo recibido o desde Supabase Authentication → Users.',
  user_banned:'Esta cuenta está deshabilitada. Revisa su estado en Supabase Authentication.',
  over_request_rate_limit:'Demasiados intentos. Espera antes de volver a intentarlo.',
  over_email_send_rate_limit:'Se ha alcanzado el límite de correos. Espera antes de volver a intentarlo.',
  refresh_token_not_found:'La sesión ha caducado. Vuelve a iniciar sesión.',
  refresh_token_already_used:'La sesión ya no es válida. Vuelve a iniciar sesión.',
  PGRST202:'Falta la función de guardado o su firma no coincide. Revisa database/schema.sql en Supabase SQL Editor.',
  PGRST205:'Falta una tabla de la aplicación. Revisa database/schema.sql en Supabase SQL Editor.',
  '42501':'La cuenta no tiene acceso. Revisa el usuario autorizado y las políticas de Supabase.',
  '23514':'Los datos no cumplen una restricción de la base de datos. Exporta los cambios pendientes antes de recargar.',
  '42702':'La función de base de datos tiene una referencia ambigua. Revisa su definición en Supabase SQL Editor.'
 };
 const suffix=` (HTTP ${status}${code?'; código '+code:''}).`;
 if(status===409)return Error('Hay cambios guardados desde otro dispositivo. Exporta los cambios pendientes y recarga la base de datos.');
 if(code&&messages[code])return Error(operation+': '+messages[code]+suffix);
 if(status===401||status===403)return Error(operation+': acceso denegado. Comprueba la sesión y la cuenta autorizada.'+suffix);
 return Error(operation+suffix+(path.includes('/rpc/')?' No se ha confirmado el guardado. Exporta los cambios pendientes.':''));
}
export class CloudStore {
 constructor(config,fetcher=(...args)=>globalThis.fetch(...args)){this.config=config;this.fetcher=fetcher;this.session=null;this.revision=0;}
 get configured(){return Boolean(this.config.url&&this.config.publicKey);}
 async request(path,{method='GET',body,authenticated=true}={}){
  if(!this.configured)throw Error('Falta configurar Supabase.');
  if(authenticated&&!this.session)throw Error('Inicia sesión para acceder a tus datos.');
  if(authenticated&&Date.now()>=this.session.expiresAt-60000){
   const refreshed=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.session.refresh_token},authenticated:false});this.setSession(refreshed);
  }
  const response=await this.fetcher(this.config.url.replace(/\/$/,'')+path,{method,headers:{apikey:this.config.publicKey,'Content-Type':'application/json',...(authenticated?{Authorization:`Bearer ${this.session.access_token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  if(!response.ok){let data=null;try{data=await response.json();}catch{}throw cloudError(response.status,data,path);}
  return response.status===204?null:response.json();
 }
 setSession(data){this.session={...data,expiresAt:Date.now()+data.expires_in*1000};}
 async login(email,password){const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:email.trim(),password},authenticated:false});this.setSession(data);}
 async load(){const owners=await this.request('/rest/v1/app_owner?select=user_id');if(owners.length!==1)throw Error('Esta cuenta no es la propietaria autorizada.');const rows=await this.request('/rest/v1/private_state?select=payload,revision');if(rows.length>1)throw Error('Configuración de cuenta incorrecta.');this.revision=rows[0]?.revision||0;return rows[0]?.payload??null;}
 async save(payload){const result=await this.request('/rest/v1/rpc/save_private_state',{method:'POST',body:{new_payload:payload,expected_revision:this.revision}});this.revision=result;}
 async logout(){try{if(this.session)await this.request('/auth/v1/logout',{method:'POST'});}finally{this.session=null;this.revision=0;}}
}

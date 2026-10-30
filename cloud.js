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
  if(!response.ok){if(response.status===409)throw Error('Hay cambios guardados desde otro dispositivo. Exporta los cambios pendientes y recarga la base de datos.');throw Error(response.status===401||response.status===403?'Acceso denegado. Comprueba la sesión y la cuenta autorizada.':`No se pudo completar la operación (${response.status}). No se ha confirmado el guardado.`);}
  return response.status===204?null:response.json();
 }
 setSession(data){this.session={...data,expiresAt:Date.now()+data.expires_in*1000};}
 async login(email,password){const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},authenticated:false});this.setSession(data);}
 async load(){const owners=await this.request('/rest/v1/app_owner?select=user_id');if(owners.length!==1)throw Error('Esta cuenta no es la propietaria autorizada.');const rows=await this.request('/rest/v1/private_state?select=payload,revision');if(rows.length>1)throw Error('Configuración de cuenta incorrecta.');this.revision=rows[0]?.revision||0;return rows[0]?.payload??null;}
 async save(payload){const result=await this.request('/rest/v1/rpc/save_private_state',{method:'POST',body:{new_payload:payload,expected_revision:this.revision}});this.revision=result;}
 async logout(){try{if(this.session)await this.request('/auth/v1/logout',{method:'POST'});}finally{this.session=null;this.revision=0;}}
}

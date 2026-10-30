import {test,expect} from '@playwright/test';
const initial=()=>({version:1,profile:{name:'',goal:2000,protein:120,carbs:250,fat:65},entries:[],weights:[],activities:[],custom:[]});
async function setup(page,{legacy=false}={}){
 let payload=null,revision=0,conflict=false,fail=false;
 await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:"export const cloudConfig={url:'https://test.supabase.co',publicKey:'public-test'};"}));
 await page.route('https://test.supabase.co/**',async r=>{
  const path=new URL(r.request().url()).pathname;
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
  if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers});
  if(path.includes('/token'))return r.fulfill({headers,json:{access_token:'test',refresh_token:'test-refresh',expires_in:3600}});
  if(path.endsWith('/app_owner'))return r.fulfill({headers,json:[{user_id:'owner'}]});
  if(path.endsWith('/private_state'))return r.fulfill({headers,json:payload?[{payload,revision}]:[]});
  if(path.includes('/rpc/')){if(fail)return r.fulfill({headers,status:503,json:{}});const body=r.request().postDataJSON();if(conflict||body.expected_revision!==revision)return r.fulfill({headers,status:409,json:{}});payload=body.new_payload;revision++;return r.fulfill({headers,json:revision});}
  return r.fulfill({headers,status:204});
 });
 if(legacy)await page.addInitScript(data=>localStorage.setItem('mi-nutricion',JSON.stringify(data)),{...initial(),profile:{...initial().profile,name:'Antiguo'}});
 return {get payload(){return payload;},get revision(){return revision;},setConflict(){conflict=true;},setFailure(){fail=true;}};
}
async function login(page){await page.goto('/#perfil');await page.locator('[name=email]').fill('owner@example.org');await page.locator('[name=password]').fill('test-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.locator('#profile-form')).toBeVisible();}
test('remoto: guarda en servidor, recupera al recargar, sin registros en almacenamiento local',async({page})=>{
 const db=await setup(page);await login(page);await page.locator('#profile-form [name=name]').fill('Remoto');await page.getByRole('button',{name:'Guardar perfil'}).click();await expect(page.locator('#toast')).toHaveText('Perfil actualizado');expect(db.payload.profile.name).toBe('Remoto');
 expect(await page.evaluate(()=>localStorage.getItem('mi-nutricion'))).toBeNull();
 await page.reload();await expect(page.locator('#login-form')).toBeVisible();await page.locator('[name=email]').fill('owner@example.org');await page.locator('[name=password]').fill('test-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.locator('#profile-form [name=name]')).toHaveValue('Remoto');
 db.setConflict();await page.locator('#profile-form [name=name]').fill('Pendiente');await page.getByRole('button',{name:'Guardar perfil'}).click();await expect(page.getByRole('heading',{name:'Guardado sin confirmar'})).toBeVisible();expect(db.payload.profile.name).toBe('Remoto');await expect(page.getByRole('button',{name:'Exportar cambios pendientes'})).toBeVisible();
});
test('migración confirmada conserva el original, fallo de red no muestra éxito',async({page})=>{
 const db=await setup(page,{legacy:true});await login(page);await expect(page.locator('#profile-form [name=name]')).toHaveValue('');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Migrar datos antiguos del navegador'}).click();await expect(page.locator('#toast')).toHaveText('Migración confirmada por el servidor');expect(db.payload.profile.name).toBe('Antiguo');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mi-nutricion')).profile.name)).toBe('Antiguo');
 db.setFailure();await page.goto('/#hoy');await page.getByRole('button',{name:'Registrar comida'}).click();await page.locator('#search').fill('Avena');await page.getByRole('button',{name:'Añadir Avena en copos'}).click();await expect(page.locator('#food-dialog')).not.toBeVisible();await expect(page.getByRole('heading',{name:'Guardado sin confirmar'})).toBeVisible();expect(db.payload.entries).toHaveLength(0);
});

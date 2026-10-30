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
 db.setConflict();await page.locator('#profile-form [name=goal]').fill('2100');await page.getByRole('button',{name:'Guardar perfil'}).click();await expect(page.getByRole('heading',{name:'Guardado sin confirmar'})).toBeVisible();expect(db.payload.profile.name).toBe('Remoto');await expect(page.getByRole('button',{name:'Exportar cambios pendientes'})).toBeVisible();
});
test('migración confirmada conserva el original, fallo de red no muestra éxito',async({page})=>{
 const db=await setup(page,{legacy:true});await login(page);await expect(page.locator('#profile-form [name=name]')).toHaveValue('');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Migrar datos antiguos del navegador'}).click();await expect(page.locator('#toast')).toHaveText('Migración confirmada por el servidor');expect(db.payload.profile.name).toBe('Antiguo');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mi-nutricion')).profile.name)).toBe('Antiguo');
 db.setFailure();await page.goto('/#hoy');await page.getByRole('button',{name:'Registrar comida'}).click();await page.locator('#search').fill('Avena');await page.getByRole('button',{name:'Añadir Avena en copos'}).click();await page.getByRole('button',{name:'Confirmar selección',exact:true}).click();await expect(page.locator('#food-dialog')).not.toBeVisible();await expect(page.getByRole('heading',{name:'Guardado sin confirmar'})).toBeVisible();expect(db.payload.entries).toHaveLength(0);
});

test('error de login 400 se explica sin sugerir que falló un guardado',async({page})=>{
 await setup(page);
 await page.route('https://test.supabase.co/auth/v1/token?*',r=>r.fulfill({status:400,headers:{'Access-Control-Allow-Origin':'*'},json:{code:400,error_code:'invalid_credentials',message:'Sensitive backend details'}}));
 await page.goto('/');await page.locator('[name=email]').fill('user@example.org');await page.locator('[name=password]').fill('test-only');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.locator('#cloud-error')).toContainText('Email o contraseña incorrectos');await expect(page.locator('#cloud-error')).not.toContainText('guardado');await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();
});

test('acceso, actualización y cierre solo en el último apartado de perfil',async({page})=>{
 await setup(page);await login(page);await expect(page.locator('#account-status')).toHaveText('Sesión iniciada.');await expect(page.locator('#content > :last-child')).toHaveAttribute('id','account-panel');
 for(const route of ['hoy','alimentacion','evolucion','actividad']){
  await page.goto('/#'+route);await expect(page.locator('#logout')).toHaveCount(0);await expect(page.locator('#cloud-refresh')).toHaveCount(0);await expect(page.locator('body')).not.toContainText('Base de datos conectada');
 }
 await page.goto('/#perfil');await page.getByRole('button',{name:'Actualizar datos',exact:true}).click();await expect(page.locator('#account-status')).toHaveText('Datos actualizados.');
 await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await expect(page).toHaveURL(/#perfil$/);await expect(page.locator('#account-panel #login-form')).toBeVisible();await expect(page.locator('#account-status')).toHaveText('Sesión cerrada.');
});

test('recetas y planificación se guardan en el documento remoto',async({page})=>{
 const db=await setup(page);await login(page);await page.goto('/#recetas');await page.locator('#recipe-form [name=name]').fill('Receta remota');await page.getByRole('button',{name:'Buscar ingrediente'}).click();await page.locator('#search').fill('Manzana');await page.getByRole('button',{name:'Añadir Manzana con piel'}).click();await page.getByRole('button',{name:'Confirmar selección',exact:true}).click();await page.getByRole('button',{name:'Guardar receta',exact:true}).click();await expect(page.locator('#recipe-error')).toHaveText('Receta guardada.');expect(db.payload.recipes).toHaveLength(1);
 await page.goto('/#calendario');await page.locator('#date').fill('2026-05-06');await page.locator('#date').dispatchEvent('change');await page.getByRole('button',{name:'Programar Cena 2026-05-06',exact:true}).click();await page.locator('#search').fill('Receta remota');await page.getByRole('button',{name:'Añadir Receta remota',exact:true}).click();await page.getByRole('button',{name:'Confirmar selección',exact:true}).click();await expect(page.locator('.week-grid')).toContainText('Receta remota');expect(db.payload.plans).toHaveLength(1);expect(db.payload.entries).toHaveLength(0);
 await page.reload();await page.locator('[name=email]').fill('owner@example.org');await page.locator('[name=password]').fill('test-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.locator('#profile-form')).toBeVisible();await page.goto('/#calendario');await page.locator('#date').fill('2026-05-06');await page.locator('#date').dispatchEvent('change');await expect(page.locator('.week-grid')).toContainText('Receta remota');
});

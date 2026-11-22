// Supabase Edge Function: wearable-ingest
// Deploy with --no-verify-jwt. This endpoint authenticates using a dedicated secret.
// Required Supabase Edge secrets: WEARABLE_INGEST_TOKEN (random >=32 chars),
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase provides the latter two).
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const num=(v:unknown,min:number,max:number):number|null=>v===null||v===undefined||v===''?null:typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:NaN;
const validDay=(d:unknown)=>typeof d==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'));
Deno.serve(async req=>{
 if(req.method!=='POST')return json(405,{error:'method_not_allowed'});
 const expected=Deno.env.get('WEARABLE_INGEST_TOKEN')||'';
 if(expected.length<32||req.headers.get('Authorization')!==`Bearer ${expected}`)return json(401,{error:'unauthorized'});
 if(Number(req.headers.get('content-length')||0)>100000)return json(413,{error:'too_large'});
 let body:any;try{body=await req.json()}catch{return json(400,{error:'invalid_json'})}
 const days=body?.days??[],workouts=body?.workouts??[];
 if(!Array.isArray(days)||!Array.isArray(workouts)||days.length>14||workouts.length>100)return json(400,{error:'invalid_batch'});
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {data:owners,error:ownerError}=await client.from('app_owner').select('user_id').limit(2);
 if(ownerError||owners?.length!==1)return json(503,{error:'owner_not_configured'});
 const user_id=owners[0].user_id;
 const cleanDays=[];
 for(const d of days){
  if(!validDay(d.day))return json(400,{error:'invalid_day'});
  const row:any={user_id,day:d.day,source:'apple_health'};
  for(const [key,max] of [['steps',200000],['distance_km',300],['active_kcal',20000],['resting_kcal',10000],['heart_rate_avg',240]] as const){
   const value=num(d[key],key==='heart_rate_avg'?20:0,max);
   if(Number.isNaN(value))return json(400,{error:'invalid_'+key});
   row[key]=value;
  }
  if(row.steps!==null&&!Number.isInteger(row.steps))return json(400,{error:'invalid_steps'});
  cleanDays.push(row);
 }
 const cleanWorkouts=[];
 for(const w of workouts){
  if(!validDay(w.day)||typeof w.external_id!=='string'||w.external_id.length>160||!w.external_id||typeof w.kind!=='string'||w.kind.length>80)return json(400,{error:'invalid_workout'});
  const row:any={user_id,external_id:w.external_id,day:w.day,kind:w.kind,source:'apple_health',started_at:w.started_at||null};
  if(row.started_at&&!Number.isFinite(Date.parse(row.started_at)))return json(400,{error:'invalid_start'});
  for(const [key,max] of [['duration_min',1440],['distance_km',300],['active_kcal',20000],['heart_rate_avg',240]] as const){
   const value=num(w[key],key==='heart_rate_avg'?20:0,max);
   if(Number.isNaN(value)||(key==='duration_min'&&value===null))return json(400,{error:'invalid_'+key});
   row[key]=value;
  }
  cleanWorkouts.push(row);
 }
 if(cleanDays.length){const {error}=await client.from('wearable_days').upsert(cleanDays,{onConflict:'user_id,day,source'});if(error)return json(500,{error:'days_save_failed'});}
 if(cleanWorkouts.length){const {error}=await client.from('wearable_workouts').upsert(cleanWorkouts,{onConflict:'user_id,external_id'});if(error)return json(500,{error:'workouts_save_failed'});}
 return json(200,{ok:true,days:cleanDays.length,workouts:cleanWorkouts.length});
});

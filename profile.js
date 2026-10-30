// Preserve saved identity fields across routine profile and calculator edits.
export function fixedProfile(profile){
 const height=profile.height??profile.predictor?.input?.height;
 const sex=profile.sex??profile.predictor?.input?.sex;
 return {name:typeof profile.name==='string'&&profile.name.trim()?profile.name:null,height:Number.isFinite(height)&&height>0?height:null,sex:['male','female'].includes(sex)?sex:null};
}
export function mergeProfile(profile,updates){
 const fixed=fixedProfile(profile),result={...profile,...updates};
 for(const [k,v] of Object.entries(fixed))if(v!==null)result[k]=v;
 return result;
}

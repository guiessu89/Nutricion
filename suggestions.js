export function foodKey(food){return JSON.stringify([food.recipeId||food.name.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase(),food.basis||'100g',food.portionLabel||'']);}
export function frequentFoods(entries,meal,limit=10){
 const groups=new Map();
 for(const entry of entries.filter(e=>e.meal===meal)){
  const key=foodKey(entry.food),previous=groups.get(key);if(previous){previous.count++;if(entry.date>=previous.date){previous.food=entry.food;previous.amount=entry.food.basis==='portion'?entry.servings:entry.grams;previous.date=entry.date;}}
  else groups.set(key,{food:entry.food,amount:entry.food.basis==='portion'?entry.servings:entry.grams,count:1,date:entry.date});
 }
 return [...groups.values()].sort((a,b)=>b.count-a.count||b.date.localeCompare(a.date)||a.food.name.localeCompare(b.food.name)).slice(0,limit);
}

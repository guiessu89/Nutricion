import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateExercise,exerciseSummary} from './exercise.js';
import {validEnergyEstimate} from './data.js';
test('carrera: el gasto extra excluye reposo y conserva los datos usados',()=>{
 const e=estimateExercise({type:'Correr',variant:'run_8',weight:80,minutes:30});assert.equal(e.kcal,315);assert.equal(e.grossKcal,357);assert.equal(e.referenceCode,'12030');assert.equal(e.weight,80);assert.equal(validEnergyEstimate(e),true);
});
test('escalada: estimación por minutos activos y modalidad; rechaza valores inválidos',()=>{
 assert.equal(estimateExercise({type:'Escalada',variant:'boulder',weight:80,minutes:20}).kcal,218);
 for(const values of [{variant:'unknown'},{type:'Escalada'},{weight:NaN},{weight:0},{minutes:0},{minutes:1441}])assert.throws(()=>estimateExercise({type:'Correr',variant:'run_8',weight:80,minutes:30,...values}));
});
test('no se inventa gasto de actividades anteriores, ni se aceptan estimaciones importadas inválidas',()=>{
 const e=estimateExercise({type:'Correr',variant:'run_8',weight:80,minutes:30});assert.deepEqual(exerciseSummary([{energyEstimate:e},{minutes:30,type:'Caminar'}]),{kcal:315,missing:1});
 assert.equal(validEnergyEstimate({...e,kcal:'<script>'}),false);assert.equal(validEnergyEstimate({...e,kcal:-1}),false);
});

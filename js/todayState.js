/* Estado central em memória para água, proteína, aplicação e perfil do dia */
import { todayISO } from './date.js';

const store = {
  date: null,
  water: 0,
  protein: 0,
  injections: [],
  weights: [],
  meals: [],
  symptoms: [],
  settings: null,
  loaded: false,
};

export function getState(date = todayISO()){
  if (store.date !== date) {
    // reset when date changes
    store.date = date;
    store.water = 0;
    store.protein = 0;
    store.injections = [];
    store.weights = [];
    store.meals = [];
    store.symptoms = [];
    store.settings = null;
    store.loaded = false;
  }
  return store;
}

export function setWater(v){ store.water = v; }
export function setProtein(v){ store.protein = v; }
export function setInjections(v){ store.injections = v; }
export function setWeights(v){ store.weights = v; }
export function setMeals(v){ store.meals = v; }
export function setSymptoms(v){ store.symptoms = v; }
export function setSettings(v){ store.settings = v; }
export function markLoaded(){ store.loaded = true; }

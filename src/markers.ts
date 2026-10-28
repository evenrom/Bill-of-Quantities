export const splitMarkers=(text:string)=>text.split(/(\{[^{}]*\})/g).filter(Boolean).map(text=>({text,marked:/^\{[^{}]*\}$/.test(text)}));

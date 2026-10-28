import restaurant from './data/restaurant.json';
import apartment from './data/apartment.json';
import privateHouse from './data/private_house.json';
import bfresh from './data/bfresh.json';
import oshi from './data/oshi_oshi.json';

export const templates=[restaurant,apartment,privateHouse,bfresh,oshi];
export function templateCounts(template:typeof restaurant) {
  const rows=template.chapters.flatMap(c=>c.rows);
  return {chapters:template.chapters.length,items:rows.filter(r=>r.kind==='item').length,notes:rows.filter(r=>r.kind==='note').length};
}

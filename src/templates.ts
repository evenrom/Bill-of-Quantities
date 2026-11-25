import restaurant from './data/restaurant.json';
import residential from './data/residential.json';
import bfresh from './data/bfresh.json';
import oshi from './data/oshi_oshi.json';

export const templates=[restaurant,residential,bfresh,oshi];
export function templateCounts(template:typeof restaurant) {
  const rows=template.chapters.flatMap(c=>c.rows);
  return {chapters:template.chapters.length,items:rows.filter(r=>r.kind==='item').length,notes:rows.filter(r=>r.kind==='note').length};
}

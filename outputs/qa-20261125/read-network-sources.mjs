import ExcelJS from 'exceljs';
import fs from 'node:fs';
const paths={ganot:'O:/WINWORD/כתבי כמויות/גנות/גנות.xlsx',oshi:'O:/WINWORD/כתבי כמויות/אושי מבשרת/כתב כמויות אושי מבשרת.xlsx',bfresh:'O:/WINWORD/כתבי כמויות/B FRESH/בי פרש דובאי מול/B fresh dubai mall- heb.xlsx'};
const out={};
for(const [id,path]of Object.entries(paths)){
 const b=new ExcelJS.Workbook();await b.xlsx.readFile(path);out[id]={path,sheets:{}};
 for(const s of b.worksheets){const rows=[];s.eachRow(r=>{const cells={};r.eachCell(c=>{if(c.col<=6&&c.text)cells[c.address]=c.text});if(Object.keys(cells).length)rows.push(cells)});out[id].sheets[s.name]=rows;}
}
fs.writeFileSync('outputs/qa-20261125/network-sources.json',JSON.stringify(out,null,2));
console.log(Object.fromEntries(Object.entries(out).map(([id,v])=>[id,Object.fromEntries(Object.entries(v.sheets).map(([n,r])=>[n,r.length]))])));

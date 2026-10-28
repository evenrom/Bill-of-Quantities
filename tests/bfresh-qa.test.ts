import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {templates} from '../src/templates';
import {createProject,insertRow,chapterTotal} from '../src/model';
import {encodeProject,decodeProject} from '../src/workbook';
import {encodeContractor} from '../src/export';
import {renderDocument} from '../src/print';
import ExcelJS from 'exceljs';

const template=templates.find(t=>t.id==='bfresh')!;
const rows=template.chapters.flatMap(c=>c.rows);
const row=(id:string)=>rows.find(r=>r.sourceId===id)!;
const approved=readFileSync('docs/BFRESH_QA_APPROVED_20261028.md','utf8');

describe('approved Bfresh QA corrections',()=>{
  it('adds the four exact approved lines once, in order and with the approved units and states',()=>{
    const additions=[...approved.matchAll(/- sourceId: (bfresh\.[\w.]+)[\s\S]*?- נוסח מלא:\r?\n([^\r\n]+)/g)];
    expect(additions).toHaveLength(4);
    const checks:Record<string,[string,string,boolean]>={
      'bfresh.partitions.partFullHeight':['bfresh.partitions.partLow','מ"ר',false],
      'bfresh.ceilings.gypsumCeiling':['bfresh.ceilings.nCeil','מ"ר',false],
      'bfresh.electrical.elecEmergency':['bfresh.electrical.elecSign',"קומפ'",true],
      'bfresh.tiling.tileConcreteWall':['bfresh.tiling.tileKitchenWall','מ"ר',true],
    };
    for(const [,id,description] of additions){
      const [after,unit,active]=checks[id];
      expect(rows.filter(r=>r.sourceId===id)).toHaveLength(1);
      const c=template.chapters.find(c=>c.rows.some(r=>r.sourceId===id))!;
      expect(c.rows[c.rows.findIndex(r=>r.sourceId===after)+1].sourceId).toBe(id);
      expect(row(id)).toMatchObject({kind:'item',unit,description});expect(c.active).toBe(active);
    }
    expect(new Set(rows.map(r=>r.sourceId)).size).toBe(rows.length);
    expect(rows.filter(r=>r.kind==='item')).toHaveLength(80);
    expect(createProject({},'bfresh').chapters.flatMap(c=>c.rows).every(r=>r.quantity===null&&r.price===null)).toBe(true);
  });
  it('keeps exact approved joinery text and removes historical review material from contractor content',()=>{
    for(const suffix of ['nJoin','counterInner']){
      const text=approved.split(`ב־bfresh.joinery.${suffix} להחליף את הנוסח המלא ל־:`)[1].trimStart().split(/\r?\n/)[0];
      expect(row(`bfresh.joinery.${suffix}`).description).toBe(text);
    }
    const content=[template.instructions,...rows.map(r=>r.description)].join('\n');
    expect(content).toContain('בירמן 1100');expect(content).toContain('אלוקובונד');
    expect(content).not.toMatch(/D2178|Alucobond|BF-\d+|מקורות|במקור|דובאי|נירוסטה מוברשת/);
    for(const suffix of ['alucobondSmooth','alucobondPerforated'])expect(row(`bfresh.metalwork.${suffix}`).unit).toBe('מ.א.');
    expect(rows.filter(r=>r.description.includes('80×80'))).toHaveLength(1);
    expect(row('bfresh.tiling.tilePublic').description).toMatch(/2 מ״מ ורובה אפורה/);
    expect(row('bfresh.joinery.counterTop').description).toContain('26 ס״מ');
    expect(row('bfresh.metalwork.counterFrame').description).toContain('RAL 9005');
  });
  it('keeps the 76-line project and its old material unchanged after save and reopen',async()=>{
    // Historical template only: no captured office/project workbook is uploaded.
    const legacy=JSON.parse(readFileSync('tests/fixtures/bfresh-before-qa2.json','utf8'));
    const original=createProject({title:'בדיקת תאימות סינתטית'},'bfresh');
    original.instructions=legacy.instructions;
    original.chapters=legacy.chapters.map((c:{title:string;active:boolean;rows:{kind:'item'|'note';description:string;unit:string}[]})=>({
      id:crypto.randomUUID(),title:c.title,active:c.active,rows:c.rows.map(r=>({
        id:crypto.randomUUID(),kind:r.kind,description:r.description,unit:r.unit,quantity:null,price:null
      }))
    }));
    Object.assign(original.chapters.find(c=>c.active)!.rows.find(r=>r.kind==='item')!,{quantity:0,price:10.5,frozen:true});
    const {project}=await decodeProject(await encodeProject(original) as never);
    expect(project).toEqual(original);
    expect(project.chapters.flatMap(c=>c.rows).filter(r=>r.kind==='item')).toHaveLength(76);
    expect(project.chapters.flatMap(c=>c.rows).some(r=>r.description.includes('D2178'))).toBe(true);
    expect(project.chapters.flatMap(c=>c.rows).some(r=>r.frozen&&r.quantity===0&&r.price===10.5)).toBe(true);
    expect((await decodeProject(await encodeProject(project) as never)).project).toEqual(project);
  });
  it('exports active additions, omits optional and frozen content, and uses clean contractor text',async()=>{
    const p=createProject({},'bfresh'),book=new ExcelJS.Workbook();
    const electrical=template.chapters.findIndex(c=>c.sourceId==='bfresh.electrical');
    const emergency=template.chapters[electrical].rows.findIndex(r=>r.sourceId==='bfresh.electrical.elecEmergency');
    p.chapters[electrical].rows[emergency].frozen=true;
    await book.xlsx.load(await encodeContractor(p) as never);
    expect(book.getWorksheet(template.chapters.find(c=>c.sourceId==='bfresh.partitions')!.title)).toBeUndefined();
    expect(book.getWorksheet(template.chapters.find(c=>c.sourceId==='bfresh.ceilings')!.title)).toBeUndefined();
    const cells:string[]=[];book.worksheets.filter(s=>s.state==='visible').forEach(s=>s.eachRow(r=>r.eachCell(c=>cells.push(c.text))));
    const text=cells.join('\n');expect(text).toContain('120×60');expect(text).toContain('בירמן 1100');
    expect(text).not.toContain(row('bfresh.electrical.elecEmergency').description);
    expect(text).not.toMatch(/D2178|Alucobond|BF-\d+|במקור|מקורות/);
    const html=renderDocument(p);expect(html).not.toContain('<mark');expect(html).toContain('אלוקובונד');
  });
  it('already permits separately priced fire systems without adding fixed template systems',()=>{
    let p=createProject({},'bfresh');const index=template.chapters.findIndex(c=>c.sourceId==='bfresh.safety');
    const plumbing=p.chapters.find(c=>c.title==='אינסטלציה ותברואה');
    const c=p.chapters[index];expect(c.active).toBe(false);
    for(const [description,price] of [['גלגלון',100],['ספרינקלרים',200]] as const){
      p=insertRow(p,c.id,p.chapters[index].rows.length,'item');
      Object.assign(p.chapters[index].rows.at(-1)!,{description,unit:"קומפ'",quantity:1,price});
    }
    expect(chapterTotal(p.chapters[index]).value).toBe(300);
    expect(p.chapters[index].rows.slice(-2).map(r=>r.description)).toEqual(['גלגלון','ספרינקלרים']);
    expect(p.chapters.find(c=>c.title==='אינסטלציה ותברואה')).toEqual(plumbing);
  });
});

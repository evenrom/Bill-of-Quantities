import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {templates} from '../src/templates';
import {createProject} from '../src/model';
import {encodeProject,decodeProject} from '../src/workbook';
import {encodeContractor} from '../src/export';
import {renderDocument} from '../src/print';
import ExcelJS from 'exceljs';
const row=(id:string)=>templates.flatMap(t=>t.chapters.flatMap(c=>c.rows)).find(r=>r.sourceId===id)!;
describe('approved chain specifications 2026-10-28',()=>{
  it('keeps the approved Bfresh materials and independent pricing lines',()=>{
    const checks:Record<string,string[]>={
      'tiling.tileWork':['30×30','3 מ״מ','אפוקסית שחורה'],
      'tiling.tileKitchenWall':['30×60','2 מ״מ','רובה לבנה'],
      'tiling.tileCounterIn':['30×60','3 מ״מ','רובה כחולה'],
      'tiling.tilePublic':['80×80','2 מ״מ','רובה אפורה'],
      'painting.paintWall':['Dunn Edwards Paints DE6374'],
      'painting.paintWave':['RAL 5012','שמן מט משי'],
      'joinery.counterInner':['18 מ"מ','בירמן 1100'],
      'joinery.counterTop':['במבוק','2 ס״מ','26 ס״מ','15%'],
      'joinery.brandBacking':['40×40','60×20','MDF','RAL 5012'],
      'metalwork.alucobondSmooth':['חלקים','42 ס״מ','2 ס״מ','RAL 5012'],
      'metalwork.alucobondPerforated':['מחוררים','42 ס״מ','2 ס״מ','RAL 5012'],
      'metalwork.aluminumSeparation':['80×50','RAL 9003'],
      'glazing.perspexBacking':['4 מ״מ','80 ס״מ'],
      'glazing.glassCanopy':['10 מ״מ','60 ס״מ','40 ס״מ'],
      'glazing.glassShelf':['10 מ״מ','35 ס״מ'],
      'surfaces.surfaceWork':['Corian Glacier White','8 מ״מ'],
      'surfaces.surfaceFascia':['12 מ״מ','26 ס״מ'],
      'surfaces.surfaceFascia29':['12 מ״מ','29 ס״מ'],
      'surfaces.surfaceFascia32':['12 מ״מ','32 ס״מ'],
      'surfaces.surfaceCoping':['40 מ״מ','20 ס״מ'],
    };
    for(const [suffix,terms] of Object.entries(checks))for(const term of terms)expect(row(`bfresh.${suffix}`).description).toContain(term);
    expect(row('bfresh.surfaces.surfaceFascia29').unit).toBe('מ.א.');
  });
  it('keeps Oshi approved finishes distinct and leaves unresolved choices variable',()=>{
    for(const suffix of ['nJoin','counterTop','counterOuter','backBar'])expect(row(`oshi_oshi.joinery.${suffix}`).description).toContain('1067 GV');
    expect(row('oshi_oshi.tiling.tilePublic').description).toContain('120×60');expect(row('oshi_oshi.tiling.tileWork').description).toContain('30×30');
    expect(row('oshi_oshi.painting.paintWall').description).toContain('1537T');
    expect(row('oshi_oshi.painting.paintDecor').description).toContain('440');
    expect(row('oshi_oshi.painting.paintWarehouse').description).toContain('לבן');
    for(const suffix of ['counterFrame','metalShelf','metalSupport','metalPartition','brandFrame']){
      expect(row(`oshi_oshi.metalwork.${suffix}`).description).toContain('RAL 9005');expect(row(`oshi_oshi.metalwork.${suffix}Gold`).description).toContain('RAL 1036');
      expect(row(`oshi_oshi.metalwork.${suffix}Gold`).unit).toBe(row(`oshi_oshi.metalwork.${suffix}`).unit);
    }
    expect(row('oshi_oshi.tiling.tileCounterIn').description).toContain('{בחירה לפרויקט לפי OS-03}');
    expect(row('oshi_oshi.tiling.tileWork').description).toContain('{אישור לפרויקט לפי OS-07}');
    expect(row('oshi_oshi.painting.paintCeiling').description).not.toContain('0515');
  });
  for(const [id,oldItems,newItems] of [['bfresh',66,80],['oshi_oshi',83,90]] as const){
    it(`${id}: existing saved projects remain unchanged after the base update`,async()=>{
      const bytes=readFileSync(`tests/fixtures/${id}-before-chain-update.xlsx`),{project}=await decodeProject(bytes as never);
      expect(project.chapters.flatMap(c=>c.rows).filter(r=>r.kind==='item')).toHaveLength(oldItems);
      expect(createProject({},id).chapters.flatMap(c=>c.rows).filter(r=>r.kind==='item')).toHaveLength(newItems);
      expect((await decodeProject(await encodeProject(project) as never)).project).toEqual(project);
    });
    it(`${id}: exports every approved line, unit and chapter state without injecting quantities`,async()=>{
      const p=createProject({},id),base=templates.find(t=>t.id===id)!;
      expect(p.chapters.flatMap(c=>c.rows).every(r=>r.quantity===null&&r.price===null)).toBe(true);
      const initial=p.chapters.map(c=>c.active);expect(initial).toEqual(base.chapters.map(c=>c.active));
      p.chapters.forEach(c=>c.active=true);
      const b=new ExcelJS.Workbook();await b.xlsx.load(await encodeContractor(p) as never);
      p.chapters.forEach(c=>{
        const s=b.getWorksheet(c.title)!;const content:{description:unknown;unit:unknown}[]=[];
        s.eachRow(r=>{if(['item','note'].includes(String(r.getCell(8).value)))content.push({description:r.getCell(2).value,unit:r.getCell(3).value??''});});
        expect(content).toEqual(c.rows.map(r=>({description:r.description,unit:r.unit})));
      });
      const print=renderDocument(p);for(const token of id==='bfresh'?['בירמן 1100','DE6374','Glacier White']:['1067 GV','RAL 1036','1537T'])expect(print).toContain(token);
      expect(print).not.toContain('<mark');
    });
  }
});

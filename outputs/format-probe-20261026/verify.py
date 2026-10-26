"""Read-only comparison of real engine round trips; probe reader, not production importer."""
import json, zipfile, posixpath, copy, hashlib
import xml.etree.ElementTree as E
import openpyxl
from pathlib import Path
P=Path(__file__).parent
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read(path):
    with zipfile.ZipFile(path) as z:
        ss=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            ss=[''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml'))]
        rels={r.get('Id'):r.get('Target') for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        out={}
        for sh in E.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',NS):
            target=rels[sh.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')]
            target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
            root=E.fromstring(z.read(target)); cells={}; formulas={}
            for c in root.findall('s:sheetData/s:row/s:c',NS):
                v=c.find('s:v',NS); value=v.text if v is not None else None
                typ=c.get('t')
                if typ=='s': value=ss[int(value)]
                elif typ=='inlineStr': value=''.join(c.find('s:is',NS).itertext())
                elif typ=='b': value=value=='1'
                elif value is not None and typ not in ['str','e']: value=float(value)
                cells[c.get('r')]=value
                f=c.find('s:f',NS)
                if f is not None: formulas[c.get('r')]=f.text
            out[sh.get('name')]={'state':sh.get('state','visible'),'cells':cells,'formulas':formulas,
                'rtl':[v.get('rightToLeft','0') for v in root.findall('s:sheetViews/s:sheetView',NS)],
                'hidden_cols':[(c.get('min'),c.get('max')) for c in root.findall('s:cols/s:col',NS) if c.get('hidden')=='1']}
        # Excel/Sheets may encode repeated formulas using shared-formula anchors.
        # Compare expanded formulas, not their XML storage representation.
        formulas_book=openpyxl.load_workbook(path, data_only=False)
        for sheet in formulas_book:
            out[sheet.title]['formulas']={c.coordinate:c.value.lstrip('=') for row in sheet for c in row if c.data_type=='f'}
        formulas_book.close()
        return out
def validate(w):
    if '_BOQ_META' not in w: return 'guided_import:metadata_missing'
    m=w['_BOQ_META']['cells']
    if m.get('A1')!='BOQ_WORKBOOK' or m.get('B1')!=1: return 'guided_import:unsupported_schema'
    ids=[]
    for name in [m.get('B7'),m.get('B8')]:
        if name not in w:return 'guided_import:chapter_missing_or_renamed'
        cs=w[name]['cells']
        for addr,value in cs.items():
            if addr.startswith('H') and value in ['item','note']:
                rid=cs.get('G'+addr[1:])
                if not rid:return 'guided_import:row_id_missing'
                ids.append(rid)
    if len(ids)!=len(set(ids)):return 'guided_import:duplicate_row_id'
    return 'direct_open'
base=read(P/'baseline.xlsx')
results={}
for name in ['excel','google']:
    f=P/f'{name}-roundtrip.xlsx'; w=read(f); a=w['פרק פעיל']; c=a['cells']
    checks={
      'reader_accepts':validate(w)=='direct_open',
      'chapter_and_meta_sheets_retained':set(w)==set(base),
      'metadata_cells_identical':all(w['_BOQ_META']['cells'].get(k)==v for k,v in base['_BOQ_META']['cells'].items()),
      'inactive_content_identical':all(w['פרק כבוי']['cells'].get(k)==v for k,v in base['פרק כבוי']['cells'].items()),
      'metadata_hidden':w['_BOQ_META']['state']=='hidden',
      'inactive_hidden':w['פרק כבוי']['state']=='hidden',
      'edited_description_authoritative':c['B2']=='דלת נערכה בתוכנה חיצונית\nמידות: 90×210',
      'edited_quantity_authoritative':c['D2']==4,
      'edited_price_authoritative':c['E4']==20,
      'row_ids_and_types':all(c.get(col+str(r))==base['פרק פעיל']['cells'].get(col+str(r)) for col in ['G','H'] for r in range(2,11)),
      'formulas_preserved':a['formulas']==base['פרק פעיל']['formulas'],
      'numeric_total':c['F2']==49.36 and c['F4']==60,
      'zero_is_zero':c['F5']==0,
      'included_and_irrelevant':c['E6']=='כלול' and c['E7']=='לא רלוונטי' and c['F6']==0 and c['F7']==0,
      'missing_quantity_not_zero':c.get('D8') is None and c.get('F8') in [None,''],
      'invalid_price_not_zero':c['F9']=='קלט לא תקין',
      'round_half_up':c['F10']==0.01,
      'partial_sum':abs(c['F11']-109.37)<1e-9,
      'no_unexpected_content_changes':all(c.get(k)==v or (c.get(k) in [None,''] and v in [None,'']) for k,v in base['פרק פעיל']['cells'].items() if k not in ['B2','D2','E4','F2','F4','F11']),
    }
    results[name]={'checks':checks,'passed':sum(checks.values()),'total':len(checks),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'rtl':a['rtl'],'hidden_cols':a['hidden_cols']}
bad_cases={}
for label in ['missing_meta','missing_id','duplicate_id','unknown_schema','renamed_chapter']:
    w=copy.deepcopy(base)
    if label=='missing_meta':del w['_BOQ_META']
    elif label=='missing_id':w['פרק פעיל']['cells']['G2']=None
    elif label=='duplicate_id':w['פרק פעיל']['cells']['G3']='row-001'
    elif label=='unknown_schema':w['_BOQ_META']['cells']['B1']=999
    elif label=='renamed_chapter':w['שם אחר']=w.pop('פרק פעיל')
    bad_cases[label]=validate(w)
results['fault_injection_in_memory']=bad_cases
results['reference_sha256']=hashlib.sha256((P.parent.parent/'docs/references/BOQ_LAYOUT_REFERENCE.xlsx').read_bytes()).hexdigest()
(P/'verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False,indent=2))
assert all(r['passed']==r['total'] for k,r in results.items() if k in ['excel','google'])
assert all(v.startswith('guided_import:') for v in bad_cases.values())

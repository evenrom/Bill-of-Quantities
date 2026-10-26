"""Add only unsupported visibility/print settings to the artifact-authored test workbook."""
from pathlib import Path
import zipfile
import xml.etree.ElementTree as E
p = Path(__file__).parent / 'baseline.xlsx'
ns = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
E.register_namespace('', ns['s'])
with zipfile.ZipFile(p) as z:
    content = {n:z.read(n) for n in z.namelist()}
root = E.fromstring(content['xl/workbook.xml'])
for sheet in root.findall('s:sheets/s:sheet',ns):
    if sheet.get('name') in ['_BOQ_META','פרק כבוי']:
        sheet.set('state','hidden')
content['xl/workbook.xml'] = E.tostring(root, encoding='utf-8',xml_declaration=True)
for n in ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml']:
    root=E.fromstring(content[n])
    for view in root.findall('s:sheetViews/s:sheetView',ns): view.set('rightToLeft','1')
    for col in root.findall('s:cols/s:col',ns):
        if int(col.get('min'))>=7: col.set('hidden','1')
    content[n]=E.tostring(root,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED) as z:
    for n,data in content.items(): z.writestr(n,data)
print('Hidden metadata, inactive chapter and ID columns. RTL is set only where a sheetView already exists; this probe does not certify RTL layout.')

import json,re,html
from pathlib import Path
root=Path.cwd()
path=root/'src/data/restaurant.json'
t=json.loads(path.read_text(encoding='utf8'))
before=json.loads(path.read_text(encoding='utf8'))
sources=json.loads((root/'outputs/qa-20261125/source-descriptions.json').read_text(encoding='utf8'))
corn=sources['corn'];base=sources['base']['גיליון1']
updates={
'demolition.nDem':corn['פירוק והריסה']['B3'],
'demolition.demWall':'פירוק מחיצות פנים באזור {אזור}, כולל חיפויים, דלתות ומשקופים בהתאם לתכניות.',
'demolition.demCeil':'פירוק הנמכת תקרה מסוג {סוג} באזור {אזור}, לרבות התשתית המיועדת לפירוק.',
'demolition.demFloor':'פירוק ריצוף ושכבות תשתית באזור {אזור}, כהכנה לעבודות אינסטלציה, חשמל וריצוף מחדש.',
'demolition.demFurniture':'פירוק ופינוי ריהוט קבוע, ארונות, מדפים וציוד קיימים באזור {אזור}.',
'demolition.demElectric':corn['פירוק והריסה']['B7'],
'demolition.demPlumb':corn['פירוק והריסה']['B8'].replace('בשטח החנות','באזור {אזור}'),
'demolition.demOpening':'פירוק דלת או חלון, כולל כנף ומשקוף, בהתאם לתכניות.',
'demolition.demSign':'פירוק שילוט קיים באזור {אזור}.',
'partitions.nPart':corn['מחיצות פנים']['B3'],
'partitions.partDry':'מחיצות פנים מלוחות גבס {סוג}, מסלול {רוחב} ס"מ, לגובה {גובה} ס"מ, בהתאם לתכניות. בסיס המחיצה: {פרט}.',
'partitions.partLining':'עיבוי קירות ועמודים בלוחות גבס {סוג}, על גבי קונסטרוקציה, כהכנה למעבר צנרת חשמל ואינסטלציה, בהתאם לתכניות.',
'partitions.partLow':'מחיצה נמוכה מלוחות גבס {סוג}, מסלול {רוחב} ס"מ, לגובה {גובה} ס"מ, כהכנה לדלפק הגשה.',
'partitions.steelCorner':'התקנת מגן פינה מנירוסטה, עיגון לקיר בברגים ומילוי רווחים בדייס בטון, בהתאם לתכנית נירוסטה וציוד.',
'partitions.steelEnd':'התקנת מגן קצה מנירוסטה, עיגון לקיר בברגים ומילוי רווחים בדייס בטון, בהתאם לתכנית נירוסטה וציוד.',
'partitions.steelFrame':'התקנת משקוף נירוסטה לפתח {זיהוי}, עיגון לקיר בברגים ומילוי רווחים בדייס בטון, בהתאם לתכנית נירוסטה וציוד.',
'plumbing.nPlumb':corn['אינסטלציה ']['B3'],
'plumbing.plumbMain':corn['אינסטלציה ']['B4'],
'plumbing.plumbHotCold':corn['אינסטלציה ']['B7'],
'plumbing.plumbCold':corn['אינסטלציה ']['B8'],
'plumbing.plumbDrain':base['B88'],
'plumbing.plumbAC':'ניקוז מזגנים: בהתאם לתכניות יועץ מיזוג.',
'plumbing.plumbChannel':corn['אינסטלציה ']['B11'],
'plumbing.plumbCistern':'נקודת שירותים, התקנת מכל הדחה סמוי ואביזרים על קיר {סוג}, בהתאם לתכנית.',
'plumbing.plumbHeater':corn['אינסטלציה ']['B6'].replace('60 ליטר','{קיבול} ליטר'),
'electrical.nElec':corn['חשמל ותקשורת']['B3'],
'electrical.elecLight':corn['חשמל ותקשורת']['B4'],
'electrical.elecExtra':'גופי תאורה נוספים המשויכים למעגלי התאורה, בהתאם לתכנית.',
'electrical.elecInstall':'חיבור והתקנה של גופי תאורה מסוגים שונים, בהתאם לתכניות, על מעגלי התאורה.',
'electrical.elecPower':corn['חשמל ותקשורת']['B8'],
'electrical.elecThree':corn['חשמל ותקשורת']['B9'],
'electrical.elecAC':'נקודת מזגן, באביזרים ומוליכים בהתאם להנחיות יועץ או מתקין.',
'electrical.elecFan':'נקודת מפוח, באביזרים ומוליכים בהתאם להנחיות יועץ או מתקין.',
'electrical.elecData':corn['חשמל ותקשורת']['B11'],
'electrical.elecBoard':corn['חשמל ותקשורת']['B12'].replace('A 120 x 3','{גודל חיבור}'),
'electrical.elecEmergency':corn['חשמל ותקשורת']['B13'],
'floorprep.nPrep':'עבודות הכנת הרצפה וההגבהות יבוצעו בהתאם לתכניות ולמפלסים.',
'floorprep.floorPrep':'ביצוע שכבת הכנה או הגבהה מחומר {סוג}, בעובי {עובי} ס"מ, באזור {אזור}, כהכנה לאיטום וריצוף, בהתאם לתכניות.',
'waterproofing.nSeal':'עבודות האיטום כוללות הכנת התשתית, רולקות לאורך הקירות והצנרות, טיפול בניקוזים וסגירת האיטום בפתחים, בהתאם למפרט.',
'waterproofing.sealWet':'איטום שטחים רטובים באזור {אזור}, במערכת {מפרט האיטום}, לרבות רולקות, חדירות וסיומות בהתאם לתכניות.',
'doors.nDoor':corn['דלתות פנים']['B3'],
'doors.door':'דלת פנים מטיפוס {זיהוי}, לפתיחה {סוג}.\nכנף: {מפרט}.\nמשקוף והלבשות: {מפרט}.\nגמר: {גמר וגוון}.\nמידות: {מידות}.',
'tiling.nTile':corn['ריצוף וחיפוי']['B3'],
'tiling.tilePublic':'ריצוף של אריחי גרניט פורצלן {דגם וגמר}, במידות {מידות} ס"מ, באזור {אזור}. פוגות {רוחב} מ"מ, גמר רובה {סוג וגוון}.',
'tiling.tileWork':'ריצוף של אריחי גרניט פורצלן אנטיסליפ במידות {מידות} ס"מ, באזורי העבודה. פוגות {רוחב} מ"מ, גמר רובה {סוג וגוון}.',
'tiling.tileWall':'חיפוי קירות באזור {אזור}, באריחי {סוג וגוון}, בגודל {מידות} ס"מ, לגובה {גובה} ס"מ. פוגות {רוחב} מ"מ, גמר רובה {סוג וגוון}, בהתאם לתכניות.',
'tiling.tileSkirt':'חיפוי פנל קרמיקה בגובה {גובה} ס"מ, לאורך הקירות והנגרות הקבועה, בהתאם לריצוף ולתכניות.',
'ceilings.nCeil':corn['תקרות והנמכות']['B3'],
'ceilings.ceiling':'הנמכות גבס באזור {אזור}, בגבהים ובחלוקה בהתאם לתכניות.',
'ceilings.cornice':'קרניזים מגבס באזור {אזור}, בגבהים ובחלוקה בהתאם לתכניות.',
'ceilings.ceilingTray':'אספקת והתקנת תקרת מגשים ברוחב {רוחב} ס"מ, באזור {אזור}.\nפרופיל סיום: {סוג}.\nצבע: {גוון}.',
'ceilings.ceilingAcoustic':'אספקת והתקנת תקרה אקוסטית מסוג {סוג}, במידות {מידות}, בגמר {גוון}, על גבי קונסטרוקציה מתאימה, בגבהים בהתאם לתכניות.',
'painting.nPaint':corn['צבע ']['B3'],
'painting.paintWall':'קירות:\nא. צביעת שכבת יסוד מתאימה לתשתית.\nב. מריחת שפכטל אמריקאי עד להחלקה.\nג. צביעה בצבע אקרילי מסוג סופרקריל, בשתי שכבות לפחות ועד לכיסוי מלא.\nגוון: {גוון}.',
'painting.paintCeiling':'תקרה:\nא. צביעת הנמכות הגבס בשכבת יסוד מתאימה לתשתית.\nב. מריחת שפכטל אמריקאי עד להחלקה.\nג. צביעה בצבע אקרילי מסוג סופרקריל, בשתי שכבות לפחות ועד לכיסוי מלא.\nגוון: {גוון}.',
'painting.paintDecor':'גמר דקורטיבי מסוג {סוג}, על קירות ועמודים באזור {אזור}, לרבות שכבת יסוד, בהתאם לתכניות. גוון: {גוון}.',
'joinery.nJoin':'כל עבודות הנגרות כוללות: חומרים, צבע, פרזול, זיגוג, הובלה והרכבה באתר, בהתאם לתכניות ולמפרט. על החומרים והצבעים לעמוד בדרישות יועץ הבטיחות. רכיבים המתומחרים בנפרד אינם כלולים במחיר הנגרות.',
'joinery.counterTop':'משטח הגשה ואכילה לדלפק, עשוי {חומר}, בעובי {עובי} ס"מ וברוחב {רוחב} ס"מ, עם קנט קדמי ואחורי, בגמר {גמר}, בהתאם לתכניות.',
'joinery.counterInner':'דופן פנימית לדלפק, עשויה {חומר}, בגובה {גובה} ס"מ, בגמר {גמר}, בהתאם לתכניות.',
'joinery.counterOuter':'דופן חיצונית לדלפק, עשויה {חומר}, בגובה {גובה} ס"מ, בגמר {גמר}, בהתאם לתכניות.',
'joinery.counterDoor':'דלת כניסה לדלפק, עשויה {חומר}, במידות {מידות} ס"מ, בגמר {גמר}, כולל צירים וסגירה, בהתאם לתכניות.',
'joinery.backBar':'בר תצוגה: מדפים וגב, עשויים {חומר}, במידות {מידות} ס"מ, בגמר {גמר}, בהתאם לתכניות.',
'joinery.waiter':'עמדת מלצרים, עשויה {חומר}, במידות {מידות} ס"מ, כולל משטחים, מגירות וגב, בגמר {גמר}, בהתאם לתכניות.',
'joinery.delivery':'עמדת משלוחים, עשויה {חומר}, במידות {מידות} ס"מ, בחלוקה ובגמר {מפרט}, בהתאם לתכניות.',
'joinery.serviceCabinet':'ארון שירות, עשוי {חומר}, במידות {מידות} ס"מ, בגמר {גמר}, בהתאם לתכניות. משטח עליון מתומחר בנפרד.',
'joinery.tableNote':'פלטות שולחן עשויות {חומר}, בגמר {גמר}, עם קנט {פרט} בהיקף, כולל הכנה לחיבור לרגליים.',
'joinery.tableA':'א. פלטת שולחן במידות {מידות א} ס"מ, לפי המפרט לעיל.',
'joinery.tableB':'ב. פלטת שולחן במידות {מידות ב} ס"מ, לפי המפרט לעיל.',
'joinery.tableC':'ג. פלטת שולחן במידות {מידות ג} ס"מ, לפי המפרט לעיל.',
'metalwork.nMetal':'כל עבודות המסגרות כוללות: חומרים, צבע יסוד, צבע גמר, הובלה והרכבה באתר, בהתאם לתכניות. על החומרים והצבעים לעמוד בדרישות יועץ הבטיחות.',
'metalwork.counterFrame':'שלד דלפק עשוי פרופילי מתכת {חתך}, בגובה ובחלוקה בהתאם לתכניות, כהכנה להתקנת גמרים. גמר צבע: {גוון}.',
'metalwork.metalShelf':'יחידת מדפי מתכת, עשויה פרופילים ומשטחים {מפרט}, במידות {מידות} ס"מ, בגמר {גמר}, כולל עיגון בהתאם לתכניות.',
'metalwork.metalSupport':'מסגרת תמיכה לפריט {זיהוי}, עשויה פרופיל {חתך}, במידות {מידות} ס"מ, בגמר {גמר}, כולל עיגון בהתאם לתכניות.',
'metalwork.metalPartition':'מחיצת מתכת דקורטיבית, עשויה פרופיל {חתך}, במידות {מידות} ס"מ, בגמר {גמר}, כהכנה למילוי לפי התכניות. המילוי מתומחר בנפרד.',
'glazing.nGlass':'עבודות האלומיניום והזיגוג כוללות: משקופים, זיגוג, איטום, הלבשות ופרזול, בהתאם לתכניות ולמפרט.',
'glazing.opening':'חלון, דלת או ויטרינה מטיפוס {זיהוי}.\nמידות וחלוקה: {מידות}.\nפרופיל: {סוג}.\nזיגוג: {סוג ועובי}.\nפתיחה, פרזול וגמר: {מפרט}.',
'glazing.glassPanel':'לוח זכוכית {סוג}, בעובי {עובי} מ"מ, במידות {מידות} ס"מ, כולל חיבורים ופרזול בהתאם לתכניות. שלד מסגרת מתומחר בנפרד.',
'glazing.mirror':'אספקת והתקנת מראה במידות {מידות} ס"מ ובעובי {עובי} מ"מ, עם גמר קצה {פרט}, בהתאם לתכניות.',
'surfaces.nSurface':'מחירי המשטחים כוללים: חומרים, חיתוכים, פתחים, קנטים, הובלה והרכבה באתר, בהתאם לתכניות.',
'surfaces.surfaceWork':'אספקת והתקנת משטח עבודה {חומר ודגם}, בעובי {עובי} מ"מ וברוחב {רוחב} ס"מ, על גבי הנגרות או הציוד, כולל פתחים וקנטים בהתאם לתכניות.',
'surfaces.surfaceCoping':'אספקת והתקנת קופינג או צוקל {חומר ודגם}, בחתך {מידות}, כולל קנטים ופינות בהתאם לתכניות.',
'surfaces.surfaceBath':'אספקת והתקנת משטח כיור {חומר ודגם}, במידות {מידות}, כולל פתחים וקנטים בהתאם לתכניות. אספקת כיור וברז: {כלולה או בנפרד}.',
'supplies.nSupply':'פרק זה כולל אספקה בלבד. ההתקנה מתומחרת בפרקי העבודות.',
'supplies.supplyTile':'אספקת אריחי ריצוף או חיפוי {חומר ודגם}, במידות {מידות} ס"מ, בגמר {גמר}.',
'supplies.supplySanitary':'אספקת כלי או אביזר סניטרי {סוג ודגם}, בגמר {גמר}, כולל האביזרים הנלווים.',
'supplies.supplyLight':'אספקת גוף תאורה {סוג ודגם}, כולל ספק, דרייבר ואביזרים בהתאם למפרט.',
'hvac.nSpecial':'העבודות יבוצעו בהתאם לתכניות יועץ מיזוג ואוורור.',
'hvac.hvac':'אספקת והתקנת מערכת מיזוג ואוורור {מערכת}, כולל חיבור והפעלה, בהתאם לתכניות היועץ.',
'equipment.nSpecial':'הציוד יבוצע בהתאם לתכנית נירוסטה וציוד ולרשימת הציוד.',
'equipment.kitchenEquipment':'אספקת והתקנת פריט ציוד {זיהוי}, בהתאם לתכנית נירוסטה וציוד ולמפרט {מפרט}.',
'gas.nGas':'עבודות הגז יבוצעו בהתאם לתכניות ולמפרט היועץ, כולל בדיקות נדרשות.',
'gas.gasPoint':'ביצוע נקודת גז לציוד {זיהוי}, כולל צנרת, אביזרים וחיבור, בהתאם לתכניות.',
'safety.nSpecial':'העבודות יבוצעו בהתאם לתכניות יועץ בטיחות.',
'safety.fire':'התקנת מערכת כיבוי {סוג}, בהתאם לתכניות היועץ.',
'safety.detection':'התקנת מערכת גילוי והתרעה {סוג}, בהתאם לתכניות היועץ.',
'accessibility.nAccessible':'האביזרים יותקנו בהתאם לתכנית הנגישות.',
'accessibility.accessibleSet':'אספקת והתקנת אביזרי נגישות לחדר שירות: {רשימת אביזרים}, כולל עיגון בהתאם לתכנית.',
'signage.nSpecial':'השילוט יבוצע בהתאם לתכניות ולפרטי המיתוג.',
'signage.sign':'אספקת והתקנת שלט או אותיות {זיהוי}, במידות {מידות}, מחומר {חומר}, בגמר {גמר}. תאורה ואביזרים: {מפרט}.',
'furniture.nJoin':'מחירי הריהוט כוללים: חומרים, גמר, פרזול, הובלה והרכבה באתר, בהתאם לתכניות ולמפרט.',
'furniture.seating':'ספת ישיבה קבועה במידות {מידות} ס"מ, עשויה שלד {חומר}, ספוג וריפוד {סוג וגמר}, בהתאם לתכניות.',
'furniture.chair':'אספקת פריט ריהוט {סוג ודגם}, בגמר {גמר}, כולל הובלה והרכבה.',
}
rows=[r for c in t['chapters'] for r in c['rows']]
assert set(updates)=={r['sourceId'].removeprefix('restaurant.') for r in rows}
for r in rows:r['description']=updates[r['sourceId'].removeprefix('restaurant.')]
path.write_text(json.dumps(t,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
# Update only the commercial section so extraction reproduces the reviewed content.
sp=root/'docs/BOQ_TEMPLATE_SPEC.md';spec=sp.read_text(encoding='utf8');start=spec.index('## 4 תבנית מסעדה');end=spec.index('## 5 תבנית דוכן');section=spec[start:end]
for c in before['chapters']:
 cstart=section.index('מזהה פרק: '+c['sourceId'])
 cend=section.find('\n### ',cstart)
 if cend<0:cend=len(section)
 chunk=section[cstart:cend]
 for old in c['rows']:
  new=updates[old['sourceId'].removeprefix('restaurant.')]
  a=old['description'].replace('\n','<br>');b=new.replace('\n','<br>')
  assert a in chunk,old['sourceId'];chunk=chunk.replace(a,b,1)
 section=section[:cstart]+chunk+section[cend:]
spec=spec[:start]+section+spec[end:];sp.write_text(spec,encoding='utf8')
before_rows=[r for c in before['chapters'] for r in c['rows']]
report=['<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>עסק מסחרי — השוואת ניסוחים</title><style>body{font:16px Arial;max-width:1300px;margin:36px auto;padding:20px}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{border:1px solid #ccc;padding:12px;text-align:right;vertical-align:top;white-space:pre-wrap}th{background:#e8efeb}code{direction:ltr;display:block;font-size:12px;overflow-wrap:anywhere}h2{margin-top:40px}@media print{tr{break-inside:avoid}}</style><h1>עסק מסחרי — ניסוחים לבדיקת המשתמש</h1><p>מיסטר קורן הוא המקור המועדף; התבנית הקבועה משמשת להשלמות. מידות, גוונים ונתוני פרויקט לא הועתקו כברירות מחדל. נשמרו כל 22 הפרקים וכל 102 השורות, יחידותיהן ומצבי הפרקים. התוכן טרם הוחל על יתר התבניות.</p>']
for c,old_c in zip(t['chapters'],before['chapters']):
 report.append('<h2>'+html.escape(c['title'])+'</h2><table><tr><th style="width:18%">מזהה ויחידה</th><th>לפני</th><th>אחרי</th></tr>')
 for r,o in zip(c['rows'],old_c['rows']):report.append('<tr><td><code>'+r['sourceId']+'</code>'+html.escape(r['unit'] or 'הערה')+'</td><td>'+html.escape(o['description'])+'</td><td>'+html.escape(r['description'])+'</td></tr>')
 report.append('</table>')
(root/'outputs/qa-20261125/commercial-review.html').write_text(''.join(report)+'</html>',encoding='utf8')
print('Updated',len(rows),'rows; all IDs, kinds, units, chapters and active states preserved.')
print('Description characters:',sum(len(r['description']) for r in before_rows),'->',sum(len(r['description']) for r in rows))

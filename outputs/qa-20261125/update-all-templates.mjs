import fs from 'node:fs';
const read=id=>JSON.parse(fs.readFileSync(`src/data/${id}.json`,'utf8'));
const commercial=read('restaurant');
const key=r=>r.sourceId.split('.').slice(1).join('.');
const shared=new Map(commercial.chapters.flatMap(c=>c.rows.map(r=>[key(r),r])));
const originals=Object.fromEntries(['apartment','private_house','bfresh','oshi_oshi'].map(id=>[id,read(id)]));
const updated=structuredClone(originals);
const source=JSON.parse(fs.readFileSync('outputs/qa-20261125/network-sources.json','utf8'));
const sourceCell=(id,a)=>Object.values(source[id].sheets).flat().find(r=>a in r)?.[a];
const common={
 'partitions.partBlock':'בניית מחיצת פנים מבלוק {סוג}, בעובי {עובי} ס"מ ובגובה {גובה}, בהתאם לתכניות.',
 'doors.doorRestore':'שיפוץ דלת קיימת {זיהוי}, כולל תיקונים, החלפת פרזול {פרזול} וצביעת הכנף והמשקוף בגמר {גמר}.',
 'tiling.tileParquet':'אספקת והתקנת פרקט {סוג}, בגמר {גמר}, על תשתית {סוג תשתית}, כולל פנלים וסיומות בהתאם לתכניות.',
 'joinery.resKitchen':'מטבח עשוי {חומר}, בגמר {גמר}, במידות ובחלוקה בהתאם לתכניות, כולל ארונות, דלתות, מגירות ופרזול {פרזול}. משטח, כיור, ברז ומכשירים מתומחרים בנפרד.',
 'joinery.resWardrobe':'ארון אחסון עשוי {חומר}, בגמר {גמר}, במידות {מידות} ס"מ, כולל דלתות, מגירות ופרזול, בחלוקה בהתאם לתכניות.',
 'joinery.bathCabinet':'ארון חדר רחצה עשוי {חומר}, בגמר {גמר}, במידות {מידות} ס"מ, כולל מגירות ופרזול בהתאם לתכניות. משטח, כיור וברז מתומחרים בנפרד.',
 'plumbing.plumbGarden':'הכנת צנרת והתקנת ברזי גן בהתאם לתכנית פיתוח.',
 'waterproofing.sealRoof':'איטום גג או מרפסת {אזור} במערכת {מערכת איטום}, כולל רולקות, טיפול בנקזים ובחדירות וסיומות בפתחים, בהתאם לתכניות.',
 'tiling.stair':'התקנת מדרגות אבן, רום ושלח, על גבי גרם בטון, במידות {רום ושלח}, בהתאם לתכניות.',
 'tiling.landing':'התקנת פודסט אבן על גבי גרם בטון, במידות {מידות}, בהתאם לתכניות.',
 'shell.shellNote':'עבודות הבטון והפלדה יבוצעו בהתאם לתכניות ולמפרט מהנדס הפרויקט, כולל חומרים ואביזרים הנדרשים לביצוע.',
 'shell.shell':'ביצוע עבודות שלד {סוג והיקף}, בהתאם לתכניות ולכתב הכמויות של המהנדס.',
 'shell.exteriorWall':'בניית קירות חוץ מבלוק {סוג}, בעובי {עובי} ס"מ, כולל חגורות וקשרים בהתאם לתכניות האדריכל והמהנדס.',
 'exterior.shellNote':'עבודות הפיתוח יבוצעו בהתאם לתכניות ולמפרט, כולל תשתית, חיבורים וגמר כמפורט בכל סעיף.',
 'exterior.fence':'בניית גדר ופילרים מבלוק {סוג}, בעובי {עובי} ס"מ ובגובה {גובה}, כולל יסוד וחגורת בטון בהתאם לתכניות מהנדס.',
 'exterior.outsideFloor':'ריצוף רחבות ושבילים באריחי {חומר}, במידות {מידות} ס"מ, עם פוגות {רוחב} מ"מ ורובה {גוון}, בהתאם לתכניות.',
 'exterior.paintExterior':'שליכט צבעוני {סוג}, בגוון {גוון}, על קירות חוץ, כולל הכנת התשתית ועד כיסוי מלא, בהתאם לתכניות.',
 'demolition.demCounter':'פירוק מעטפת דלפק {זיהוי}, כולל חיפויים, משטחים ודפנות המיועדים לפירוק, בהתאם לתכנית.',
 'partitions.partFullHeight':'הקמת מחיצת פנים בגובה מלא, מלוחות {סוג} על קונסטרוקציה, בגובה {גובה} ובעובי {עובי}, כולל בידוד {סוג}, בהתאם לתכניות.',
 'electrical.elecSign':'ביצוע הזנת חשמל והפעלה לשלט {זיהוי}, כולל צנרת, חיווט וחיבור בהתאם לתכניות. השלט וספקו מתומחרים בנפרד.',
 'ceilings.gypsumCeiling':'אספקה והתקנת הנמכת תקרת גבס מלוחות {סוג}, בגבהים ובחלוקה בהתאם לתכניות.',
 'joinery.counterSubstrate':'לוחות תשתית לדופן דלפק, עשויים {חומר} בעובי {עובי} מ"מ, כהכנה לחיפוי בהתאם לתכניות. החיפוי מתומחר בנפרד.',
};
const chainChapters=new Set(['tiling','painting','joinery','metalwork','surfaces']);
for(const [id,t]of Object.entries(updated)){
 t.instructions=commercial.instructions;
 for(const c of t.chapters)for(const r of c.rows){
  const k=key(r),base=shared.get(k),chain=['bfresh','oshi_oshi'].includes(id);
  if(base&&(!chain||!chainChapters.has(k.split('.')[0])))r.description=base.description;
  if(common[k])r.description=common[k];
 }
 const elec=t.chapters.find(c=>c.sourceId.endsWith('.electrical'));
 for(const name of ['elecExtra','elecInstall']){const r=elec.rows.find(r=>r.sourceId.endsWith('.'+name));if(r){r.kind='note';r.description=shared.get('electrical.'+name).description;}}
 const prep=structuredClone(shared.get('electrical.elecLightPreparation'));prep.sourceId=`${id}.electrical.elecLightPreparation`;
 elec.rows.splice(elec.rows.findIndex(r=>r.sourceId.endsWith('.elecLight'))+1,0,prep);
 const plumb=t.chapters.find(c=>c.sourceId.endsWith('.plumbing'));
 const ranking=['nPlumb','plumbMain','plumbHeater','plumbHotCold','plumbCold','plumbDrain','plumbAC','plumbCistern','plumbChannel','plumbGarden'];
 plumb.rows.sort((a,b)=>ranking.indexOf(a.sourceId.split('.').at(-1))-ranking.indexOf(b.sourceId.split('.').at(-1)));
 for(const group of ['joinery','metalwork']){
  const c=t.chapters.find(c=>c.sourceId.endsWith('.'+group));const newRow=structuredClone(shared.get(group+(group==='joinery'?'.nJoinSpecification':'.nMetalSpecification')));
  newRow.sourceId=newRow.sourceId.replace('restaurant.',id+'.');c.rows.splice(1,0,newRow);
 }
}
const set=(id,changes)=>{for(const [k,description]of Object.entries(changes)){const r=updated[id].chapters.flatMap(c=>c.rows).find(r=>key(r)===k);if(!r)throw Error(id+'.'+k);r.description=description;}};
for(const id of ['apartment','private_house'])set(id,{
 'plumbing.nPlumb':sourceCell('ganot','B122'),
 'plumbing.plumbMain':'ביצוע מערכת צנרת מים ודלוחין, כולל שוחות, תאי ביוב לבקרה, מחסומי ריח וחיבור למערכת העירונית, בהתאם לתכנית יועץ אינסטלציה.',
 'plumbing.plumbHeater':'אספקה והתקנת מערכת חימום מים {סוג מערכת}, בקיבול {קיבול} ליטר, כולל בידוד תרמי, ברזי סגירה ובטיחות, צנרת וחיבור חשמל, בהתאם לתכניות. במערכת גז תבוצע צנרת חיבור המים בלבד.',
 'plumbing.plumbCold':'ביצוע נקודת מים קרים ודלוחין בהתאם לתכנית.',
 'joinery.nJoin':'כללי:\nכל עבודות הנגרות כוללות: חומרים, צבע, פרזול, זיגוג, הובלה והרכבה באתר, בהתאם לתכניות.',
});
const generalJoin='כללי:\nכל עבודות הנגרות כוללות: חומרים, צבע, פרזול, זיגוג, הובלה והרכבה באתר. על החומרים והצבעים לעמוד בתקני אש בהתאם להנחיות יועץ בטיחות.';
const generalMetal=shared.get('metalwork.nMetal').description;
set('bfresh',{
 'tiling.nTile':shared.get('tiling.nTile').description,
 'tiling.tileWork':'ריצוף שטחי העבודה וההגבהות בדלפק באריחי גרניט פורצלן אנטיסליפ 30×30 ס״מ, פוגות 3 מ״מ ורובה אפוקסית שחורה. דרגת החלקה: {דרגה}.',
 'tiling.tilePublic':'ריצוף אזור הישיבה והדלפק באריחי גרניט פורצלן דמוי טרצו 80×80 ס״מ, פוגות 2 מ״מ ורובה אפורה, בהתאם לתכניות.',
 'tiling.tileCounterOut':'חיפוי דופן חיצונית לדלפק באריחי {חומר ודגם}, במידות {מידות}, בגמר {גמר}, בהתאם לפרט.',
 'tiling.tileCounterIn':'חיפוי פנים דלפק באריחי קרמיקה לבנה 30×60 ס״מ, פוגות 3 מ״מ ורובה כחולה. גובה בהתאם לתכניות. חיפוי פורמייקה אינו נכלל באותו שטח.',
 'tiling.tileKitchenWall':'חיפוי קירות מטבח באריחי קרמיקה לבנה מבריקה 30×60 ס״מ, פוגות 2 מ״מ ורובה לבנה, בגובה בהתאם לתכניות.',
 'tiling.tileConcreteWall':'חיפוי קיר באזור {אזור}, באריחים דמויי בטון 120×60 ס"מ, בגובה בהתאם לתכניות. פוגות ורובה: {מפרט}.',
 'tiling.tileSkirt':'חיפוי פנל קרמיקה תואם לריצוף, בגובה {גובה} ס"מ, לאורך הקירות והנגרות הקבועה.',
 'ceilings.ceilingTray':'אספקת והתקנת תקרת מגשים ברוחב 30 ס״מ, בגמר לבן RAL 9010 ופרופיל L, בשטח המטבח והמחסן, בגובה בהתאם לתכניות.',
 'painting.nPaint':shared.get('painting.nPaint').description,
 'painting.paintWall':'צביעת קירות בסופרקריל, שתי שכבות לפחות ועד כיסוי מלא, בגוון אפור Dunn Edwards Paints DE6374, כולל הכנת התשתית ושכבת יסוד מתאימה.',
 'painting.paintCeiling':'צביעת תקרות גבס והנמכות בסופרקריל, שתי שכבות לפחות ועד כיסוי מלא, בגוון אפור Dunn Edwards Paints DE6374, כולל שכבת יסוד ושפכטל עד החלקה.',
 'joinery.nJoin':generalJoin,
 'joinery.nJoinSpecification':'א. לוחות עץ לבוד בעובי 18 מ"מ בציפוי פורמייקה בירמן 1100.\nב. עץ מסיבי במבוק בגמר לכה מט משי 15% ברק.\nג. לוחות וסרגלי MDF בגמר כחול RAL 5012, בהתאם לתכניות.',
 'joinery.counterTop':'משטח מדורג להגשה, עשוי עץ מסיבי במבוק בעובי 2 ס״מ וברוחב 26 ס״מ, עם קנט קדמי ואחורי, בגמר לכה מט משי 15% ברק. אורך ומפלסים בהתאם לתכניות. שלד וקוריאן בנפרד.',
 'joinery.counterInner':'דופן פנימית לדלפק, מלוחות עץ לבוד בעובי 18 מ"מ בציפוי פורמייקה בירמן 1100, בגובה ובחלוקה בהתאם לתכניות. שלד מתומחר בנפרד; אין לכלול חיפוי קרמי באותו שטח.',
 'joinery.counterOuter':'דופן דקורטיבית לדלפק, עשויה לוחות וסרגלי MDF בגמר כחול RAL 5012, בגובה ובחלוקה בהתאם לתכניות. שלד ואריחים מתומחרים בנפרד.',
 'joinery.counterDoor':'שער כניסה לדלפק, עשוי MDF בגמר לבן ופס עליון מעץ מסיבי במבוק 4×5 ס״מ, בגמר לכה מט משי 15% ברק, כולל צירים וסגירה. מידות בהתאם לתכניות.',
 'joinery.brandBacking':'רקע לקיר מיתוג, עשוי MDF פריק על קורות עץ 40×40 מ״מ, בחלוקה לריבועים בסרגלי MDF ‏60×20 מ״מ, בגמר כחול RAL 5012. מידות בהתאם לתכניות. אותיות ותאורה בנפרד.',
 'metalwork.nMetal':generalMetal,
 'metalwork.nMetalSpecification':'א. שלד דלפק: פרופיל פלדה 40×40 מ״מ, בגמר שחור מט RAL 9005.\nב. שלד מעטפת: פרופיל מגולוון 40×40 מ״מ, בגמר טבעי.\nג. אלוקובונד כחול RAL 5012 ופרופילי הפרדה לבנים RAL 9003.\nד. עובי דופן, חיבורים ועיגון בהתאם לתכניות.',
 'metalwork.counterFrame':'שלד דלפק מפרופילי פלדה 40×40 מ״מ, בגמר שחור מט RAL 9005, בגובה ובחלוקה בהתאם לתכניות, כולל עיגון והכנות לתשתיות. נגרות, קוריאן וזכוכית בנפרד.',
 'metalwork.metalShelf':'מדפי מתכת מפרופילים ומשטחים {מפרט}, בגמר {גמר}, במידות {מידות}, כולל תלייה ועיגון בהתאם לתכניות.',
 'metalwork.metalSupport':shared.get('metalwork.metalSupport').description,
 'metalwork.brandFrame':'מסגרת לתמיכת שילוט מפרופילים {חתך}, בגמר {גמר}, בהתאם לתכניות. אותיות, תאורה ושלט גמר בנפרד.',
 'metalwork.aluminumFrame':'שלד מגולוון 40×40 מ״מ, בגמר טבעי, לתמיכת מעטפת אלוקובונד, במידות ובעיגון בהתאם לתכנית מהנדס. לוחות הגמר בנפרד.',
 'metalwork.alucobondSmooth':'לוחות אלוקובונד חלקים ברוחב 42 ס״מ, נתק 2 ס״מ, בגמר כחול RAL 5012, על שלד נפרד. גובה ואורך בהתאם לתכניות. פרספקס ותאורה בנפרד.',
 'metalwork.alucobondPerforated':'לוחות אלוקובונד מחוררים ברוחב 42 ס״מ, נתק 2 ס״מ, בגמר כחול RAL 5012, על שלד נפרד. גובה ואורך בהתאם לתכניות. פרספקס ותאורה בנפרד.',
 'metalwork.aluminumSeparation':'פרופילי הפרדה מאלומיניום מכופף 80×50 מ״מ, בגמר לבן RAL 9003, באורכים בהתאם לתכניות.',
 'glazing.glassCanopy':'חופת זכוכית מחוסמת שקופה בעובי 10 מ״מ, ברוחב 60 ס״מ ובגובה 40 ס״מ, כולל דפנות ופרזול, באורך בהתאם לתכניות. מדף פנימי בנפרד.',
 'glazing.glassShelf':'מדף זכוכית מחוסמת שקופה בעובי 10 מ״מ וברוחב 35 ס״מ, כולל תמיכות, באורך ובגובה בהתאם לתכניות.',
 'glazing.perspexBacking':'לוחות פרספקס חלבי 4 מ״מ, בגובה 80 ס״מ, בגב אלוקובונד מחורר כהכנה לתאורת LED. אורך בהתאם לתכניות. תאורה ושלד בנפרד.',
 'surfaces.nSurface':'המשטחים והדפנות עשויים Corian Glacier White. המחירים כוללים חיתוכים, פתחים, קנטים, פינות מעוגלות, הובלה והרכבה בהתאם לתכניות.',
 'surfaces.surfaceWork':'משטח עבודה Corian Glacier White בעובי 8 מ״מ וברוחב 65–70 ס״מ, בפנים הדלפק, כולל פתחים והתאמות לציוד. אורך בהתאם לתכניות.',
 'surfaces.surfaceCoping':'קופינג Corian Glacier White בעובי 40 מ״מ וברוחב 20 ס״מ, עם פינות מעוגלות, על מחיצה בהיקף הדלפק. אורך בהתאם לתכניות. התשתית בנפרד.',
});
for(const [suffix,width]of [['surfaceFascia',26],['surfaceFascia29',29],['surfaceFascia32',32]])set('bfresh',{['surfaces.'+suffix]:`דופן מדורגת Corian Glacier White בעובי 12 מ״מ וברוחב ${width} ס״מ, עם פינות מעוגלות, על מסגרת מתכת נפרדת. אורך ותוואי בהתאם לתכניות.`});
// Explicitly excluded by the user as a Dubai-only detail.
updated.bfresh.chapters.find(c=>c.sourceId==='bfresh.painting').rows=updated.bfresh.chapters.find(c=>c.sourceId==='bfresh.painting').rows.filter(r=>!r.sourceId.endsWith('.paintWave'));
set('oshi_oshi',{
 'tiling.nTile':shared.get('tiling.nTile').description,
 'tiling.tilePublic':'ריצוף באריחי גרניט פורצלן שחור משופשף 120×60 ס״מ, בשטח האולם והדלפק, פוגות 2 מ״מ ורובה אפוקסית שחורה, בהתאם לתכניות.',
 'tiling.tileWork':'ריצוף מטבח באריחי גרניט פורצלן אנטיסליפ 30×30 ס״מ, פוגות 3 מ״מ ורובה אפוקסית שחורה, בהתאם לתכניות. דרגת החלקה: {דרגה}.',
 'tiling.tileWall':'חיפוי קירות באריחי גרניט פורצלן בטון משופשף 120×60 ס״מ, פוגות 6 מ״מ ורובה טמבור אפור כהה 120, כולל פינות בגרונג. גובה בהתאם לתכניות.',
 'tiling.tileWallRust':'חיפוי קירות ועמודים בגרניט פורצלן חלודה משופשף 120×60 ס״מ, בשילוב פרופילי אלומיניום מוזהב שקועים ברוחב 2 ס״מ, רובה טמבור חום 105 ופינות בגרונג. גובה בהתאם לתכניות.',
 'tiling.tileCounterOut':'חיפוי דופן חיצונית לדלפק באריחי קרמיקה דקורטיבית משולבת פסי פליז 100×10 ס״מ, ללא פוגות, בהתאם לתכניות. מידות האריחים ניתנות להתאמה לפרט.',
 'tiling.tileCounterIn':'חיפוי פנים דלפק באריחי קרמיקה שחורה 20×20 ס״מ, פוגות 2 מ״מ ורובה שחורה, בגובה בהתאם לתכניות. אין לכלול פורמייקה באותו שטח.',
 'tiling.tileSkirt':'חיפוי פנל קרמיקה בגובה 7 ס״מ, לאורך הקירות והנגרות הקבועה, בהתאם לתכניות.',
 'ceilings.ceilingTray':'אספקת והתקנת תקרת מגשי פח ברוחב 30 ס״מ, בגמר לבן RAL 9010 ופרופיל L, בשטח המטבח והמחסן, בגובה בהתאם לתכניות.',
 'ceilings.ceilingAcoustic':'התקנת אריחים אקוסטיים מצמר עץ Troldtekt במידות 60×120 ס״מ, בגמר שחור, על גבי תשתית התקרה, בגבהים ובחלוקה בהתאם לתכניות.',
 'painting.nPaint':shared.get('painting.nPaint').description,
 'painting.paintWall':'צביעת נישה או קטע קיר בסופרקריל, שתי שכבות לפחות ועד כיסוי מלא, בגוון אפור טמבור 1537T, כולל הכנת התשתית ושכבת יסוד מתאימה.',
 'painting.paintCeiling':'צביעת תקרות גבס והנמכות בסופרקריל, שתי שכבות לפחות ועד כיסוי מלא, בגוון שחור, כולל שכבת יסוד ושפכטל עד החלקה. קוד גוון וברק: {גוון וברק}.',
 'painting.paintDecor':'טיח אפקט בטון משופשף של טמבור בגוון 440, בשתי שכבות לפחות ועד כיסוי מלא, כולל הכנת התשתית, על קירות ועמודים בהתאם לתכניות.',
 'painting.paintWarehouse':'צביעת קירות מחסן בסופרקריל לבן, שתי שכבות לפחות ועד כיסוי מלא, כולל הכנת התשתית ושכבת יסוד מתאימה.',
 'joinery.nJoin':generalJoin,
 'joinery.nJoinSpecification':'א. לוחות עץ לבוד מצופים פורניר אלון שטרייף ועץ מסיבי אלון.\nב. בייץ בגוון 1067 GV.\nג. גמר לכה מט משי 15% ברק.\nד. פורמייקה פורמקס 3199.',
 'joinery.counterTop':'משטח הגשה ואכילה מעץ מסיבי אלון בעובי 2 ס״מ, עם קנט קדמי 8 ס״מ ואחורי 4 ס״מ, בגמר בייץ 1067 GV ולכה מט משי 15% ברק. מידות בהתאם לתכניות. שלד ודפנות בנפרד.',
 'joinery.counterInner':'דופן פנימית לדלפק מלוחות עץ לבוד בגמר פורמייקה פורמקס 3199, בגובה ובחלוקה בהתאם לתכניות. בשטח חיפוי קרמי מתמחרים תשתית בלבד והחיפוי בנפרד.',
 'joinery.counterOuter':'חיפוי נגרות לדלפק מלוחות עץ לבוד בגמר פורניר אלון שטרייף ועץ מסיבי אלון, בייץ 1067 GV ולכה מט משי 15% ברק. מידות בהתאם לתכניות. אינו כולל שטחים המחופים בקרמיקה.',
 'joinery.counterDoor':'דלת כניסה לדלפק מלוחות עץ לבוד בגמר פורניר אלון שטרייף, בייץ 1067 GV ולכה מט משי 15% ברק, כולל צירים וסגירה. מידות בהתאם לתכניות.',
 'joinery.backBar':'בר תצוגה אחורי, עשוי מדפי עץ לבוד בגמר פורניר אלון שטרייף, עם קנט קדמי מעץ מסיבי אלון ברוחב 4 ס״מ, בייץ 1067 GV ולכה מט משי 15% ברק. מידות וחלוקה בהתאם לתכניות. מסגרות ומראות בנפרד.',
 'joinery.waiter':'עמדת מלצרים מלוחות עץ לבוד, חזיתות ומשטחים בגמר בייץ שחור ופנים הארון בפורמייקה פורמקס 3199, כולל מגירות ופרזול. מידות וחלוקה בהתאם לתכניות.',
 'joinery.delivery':'עמדת משלוחים מלוחות עץ לבוד בגמר פורניר אלון שטרייף, בייץ 1067 GV ולכה מט משי 15% ברק, פנים בפורמייקה פורמקס 3199, כולל פרזול. מידות וחלוקה בהתאם לתכניות.',
 'joinery.serviceCabinet':'ארון שירות מלוחות עץ לבוד בגמר פורניר אלון שטרייף, בייץ 1067 GV ולכה מט משי 15% ברק, פנים בפורמייקה פורמקס 3199. מידות וחלוקה בהתאם לתכניות. משטח עליון בנפרד.',
 'joinery.tableNote':'פלטות שולחן מלוחות עץ לבוד בגמר פורניר אלון שטרייף וקנט עץ מסיבי אלון, בייץ 1067 GV ולכה מט משי 15% ברק, כולל הכנה לחיבור לרגליים.',
 'joinery.tableA':shared.get('joinery.tableA').description,
 'joinery.tableB':shared.get('joinery.tableB').description,
 'joinery.tableC':shared.get('joinery.tableC').description,
 'metalwork.nMetal':generalMetal,
 'metalwork.nMetalSpecification':'א. משטחים: פח שחור 3 מ״מ.\nב. פרופילי ברזל שחור בהתאם לפרט.\nג. כבלי נירוסטה 4 מ״מ.\nד. גמר שחור מט RAL 9005 או זהב מושחר מט RAL 1036, לפי הסעיף.\nה. זכוכית גלים 4 מ״מ במקומות המסומנים בתכניות.',
 'surfaces.nSurface':shared.get('surfaces.nSurface').description,
 'surfaces.surfaceWork':shared.get('surfaces.surfaceWork').description,
 'surfaces.surfaceCoping':shared.get('surfaces.surfaceCoping').description,
 'surfaces.surfaceBath':shared.get('surfaces.surfaceBath').description,
});
for(const [suffix,finish]of [['','שחור מט RAL 9005'],['Gold','זהב מושחר מט RAL 1036']])set('oshi_oshi',{
 ['metalwork.counterFrame'+suffix]:`שלד דלפק מפרופילי ברזל {חתך}, בגמר ${finish}, בגובה ובחלוקה בהתאם לתכניות, כולל עיגון והכנות לתשתיות. נגרות ומשטחים בנפרד.`,
 ['metalwork.metalShelf'+suffix]:`מדפי תצוגה מפרופילי ברזל 20×20 ו־20×50 מ״מ, פח שחור 3 מ״מ וכבלי נירוסטה 4 מ״מ, בגמר ${finish}, כולל עיגון בהתאם לתכניות. מידות: {מידות}.`,
 ['metalwork.metalSupport'+suffix]:`מסגרות לתמיכת מדפי עץ מפרופילי ברזל 20×20 מ״מ, בגמר ${finish}, מעוגנות לקירות בהתאם לתכניות. מדפי העץ בנפרד.`,
 ['metalwork.metalPartition'+suffix]:`מחיצת הפרדה מפרופילי ברזל 80×80 ו־30×80 מ״מ ופח שחור, בגמר ${finish}, כהכנה לחיפוי וזכוכית גלים. מידות בהתאם לתכניות. חיפוי וזיגוג בנפרד.`,
 ['metalwork.brandFrame'+suffix]:`מסגרת לתמיכת שילוט מפרופילי ברזל {חתך}, בגמר ${finish}, בהתאם לתכניות. אותיות ותאורה בנפרד.`,
});
const oTiling=updated.oshi_oshi.chapters.find(c=>c.sourceId.endsWith('.tiling'));
for(const [id,description]of [
 ['tileBackWall','חיפוי קיר דלפק אחורי ועמדת מלצרים באריחי קרמיקה ירוקה 13×13 ס״מ, פוגות 2 מ״מ ורובה טמבור אפור כהה 120. גובה בהתאם לתכניות.'],
 ['tileKitchenWall','חיפוי קירות מטבח באריחי קרמיקה לבנה מבריקה 20×20 ס״מ, פוגות 2 מ״מ ורובה לבנה. גובה בהתאם לתכניות.']
])oTiling.rows.push({sourceId:'oshi_oshi.tiling.'+id,kind:'item',description,unit:'מ"ר'});
for(const id of ['bfresh','oshi_oshi'])set(id,{'supplies.nSupply':'פרק זה כולל אספקה בלבד. מפרטי הריצוף והחיפוי הם לפי סעיפי הרשת; דגמי גופי התאורה יוגדרו בפרויקט. ההתקנה מתומחרת בפרקי העבודות.'});
// Union by professional identity: apartment defaults; additional private-house work stays optional.
const residential=structuredClone(updated.apartment);residential.id='residential';residential.name='מגורים';
for(const c of updated.private_house.chapters){
 const target=residential.chapters.find(x=>x.sourceId.split('.').at(-1)===c.sourceId.split('.').at(-1));
 if(!target){residential.chapters.push({...structuredClone(c),active:false});continue;}
 for(const r of c.rows)if(!target.rows.some(x=>key(x)===key(r)))target.rows.push(structuredClone(r));
}
for(const c of residential.chapters){c.sourceId=c.sourceId.replace(/^[^.]+/,'residential');for(const r of c.rows)r.sourceId=r.sourceId.replace(/^[^.]+/,'residential');}
// Reapply approved order after merging unique plumbing content.
const rPlumb=residential.chapters.find(c=>c.sourceId.endsWith('.plumbing'));
const rOrder=['nPlumb','plumbMain','plumbHeater','plumbHotCold','plumbCold','plumbDrain','plumbAC','plumbCistern','plumbChannel','plumbGarden'];
rPlumb.rows.sort((a,b)=>rOrder.indexOf(a.sourceId.split('.').at(-1))-rOrder.indexOf(b.sourceId.split('.').at(-1)));
updated.residential=residential;
let spec=fs.readFileSync('docs/BOQ_TEMPLATE_SPEC.md','utf8');
function chapterMarkdown(c,index){let n=0;return `### ${c.title}\n\nמזהה פרק: ${c.sourceId}. מצב: ${c.active?'פעיל':'כבוי'}.\n\n| סעיף | תיאור עבודה | יחידה | כמות | מחיר | סכום |\n| --- | --- | --- | --- | --- | --- |\n`+c.rows.map(r=>`| ${r.kind==='item'?`${index+1}.${String(++n).padStart(2,'0')}`:''} | ${r.description.replaceAll('\n','<br>')} | ${r.unit} | ${r.kind==='item'?'XX':''} |  |  |`).join('\n')+'\n\n'+c.rows.map((r,i)=>`- שורת תוכן ${i+1}: ${r.sourceId}; ${r.kind==='note'?'הערה':'סעיף'}; עדכון 25.11.2026 לפי הנוסח המאושר, מקורות הפרויקט והכרעות הרשת; ראו docs/TEMPLATE_REFRESH_20261125.md.`).join('\n')+'\n\n';}
for(const [id,t]of Object.entries(updated)){
 if(id==='residential')spec+='\n## 15 תבנית מגורים\n\n### שער והנחיות כלליות\n\n'+t.instructions+'\n\n'+t.chapters.map(chapterMarkdown).join('');
 else for(const [i,c]of t.chapters.entries()){
  const marker=spec.indexOf('מזהה פרק: '+c.sourceId+'.');
  const start=spec.lastIndexOf('### ',marker),next=spec.indexOf('\n### ',marker),section=spec.indexOf('\n## ',marker);
  const end=next<0?section:section<0?next:Math.min(next,section);
  spec=spec.slice(0,start)+chapterMarkdown(c,i)+spec.slice(end+1);
 }
 fs.writeFileSync(`src/data/${id}.json`,JSON.stringify(t,null,2)+'\n');
}
fs.writeFileSync('docs/BOQ_TEMPLATE_SPEC.md',spec);
fs.writeFileSync('outputs/qa-20261125/templates-before-refresh.json',JSON.stringify(originals,null,2));
for(const [id,t]of Object.entries(updated)){const rows=t.chapters.flatMap(c=>c.rows);console.log(id,t.chapters.length,t.chapters.filter(c=>c.active).length,rows.filter(r=>r.kind==='item').length,rows.filter(r=>r.kind==='note').length);}

import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const req=createRequire('C:/Users/Rom/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs');
const {FileBlob,SpreadsheetFile}=await import(pathToFileURL(req.resolve('@oai/artifact-tool')).href);
for (const engine of ['excel','google']) {
 const path=new URL(`./${engine}-roundtrip.xlsx`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
 const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(path));
 const preview=await wb.render({sheetName:'פרק פעיל',range:'A1:F11',scale:1.2});
 await fs.writeFile(new URL(`./preview-${engine}-roundtrip.png`,import.meta.url),new Uint8Array(await preview.arrayBuffer()));
 console.log(engine+': imported and rendered exported workbook without modifying it');
}

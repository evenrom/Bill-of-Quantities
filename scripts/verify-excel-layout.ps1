param(
  [string]$InputPath = 'outputs/implementation-20261027/browser-roundtrip.xlsx',
  [string]$OutputPath = 'outputs/review-20261027/excel-layout.pdf',
  [switch]$LargeAmounts,
  [string]$RoundtripOutput = ''
)
$ErrorActionPreference='Stop'
$source=(Resolve-Path -LiteralPath $InputPath).Path
$destination=[IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$excel=New-Object -ComObject Excel.Application
$excel.Visible=$false
$excel.DisplayAlerts=$false
try {
  $book=$excel.Workbooks.Open($source,0,$true)
  $excel.CalculateFull()
  # Mutate only the disposable in-memory copy. Confirm the live calculation chain.
  $chapter=$null
  foreach($candidate in $book.Worksheets){if($candidate.Visible -eq -1 -and $candidate.Range('H1').Value2 -eq 'chapter'){$chapter=$candidate;break}}
  if(!$chapter){throw 'No active chapter found'}
  $chapter.Activate()
  $summary=$book.Worksheets.Item($book.Worksheets.Count)
  $originalPrice=$chapter.Range('E4').Value2
  for($row=3;$row -le $chapter.UsedRange.Rows.Count;$row++){
    if($chapter.Range("H$row").Value2 -eq 'item'){
      $priceCell=$chapter.Range("E$row")
      if($priceCell.Font.Name -ne 'Assistant' -or $priceCell.VerticalAlignment -ne -4160){throw "Price style missing at E$row"}
    }
  }
  foreach($sample in @(10,10.5,0)){
    $chapter.Range('E4').Value2=[double]$sample
    $excel.CalculateFull()
    $digits=if($sample -eq [Math]::Truncate($sample)){'0'}else{'0.00'}
    $expectedText=$sample.ToString($digits,[Globalization.CultureInfo]::InvariantCulture)+[char]0x20aa
    if($chapter.Range('E4').Text -ne $expectedText){throw "Currency text failed for ${sample}: $($chapter.Range('E4').Text)"}
  }
  $chapter.Range('E4').Value2=20
  $excel.CalculateFull()
  if([Math]::Abs($chapter.Range('F4').Value2-10) -gt 0.000001){throw 'Item recalculation failed'}
  if([Math]::Abs($summary.Range('E3').Value2-10) -gt 0.000001){throw 'Summary link failed'}
  if([Math]::Abs($summary.Range('E14').Value2-1.8) -gt 0.000001){throw 'VAT recalculation failed'}
  if([Math]::Abs($summary.Range('E15').Value2-11.8) -gt 0.000001){throw 'Grand total recalculation failed'}
  $chapter.Range('E4').Value2=$originalPrice
  if($RoundtripOutput){$excel.CalculateFull();$roundtrip=[IO.Path]::GetFullPath((Join-Path (Get-Location) $RoundtripOutput));$book.SaveCopyAs($roundtrip)}
  foreach($address in @('A4','B4','C4','D4','E4','F4')){
    if($chapter.Range($address).VerticalAlignment -ne -4160){throw "Expected top alignment: $address"}
  }
  if($LargeAmounts){$chapter.Range('E4').Value2=2469135.78}
  $excel.CalculateFull()
  $book.ExportAsFixedFormat(0,$destination)
  $report=@()
  $expectedPage=1
  foreach($sheet in $book.Worksheets){
    if($sheet.Visible -eq -1){
      $sheet.Activate()
      $pages=$excel.ExecuteExcel4Macro('GET.DOCUMENT(50)')
      if($expectedPage -gt 1 -and $sheet.PageSetup.FirstPageNumber -ne $expectedPage){throw 'Printed page numbers do not match planned pagination'}
      $report+=@{sheet=$sheet.Name;pages=$pages;firstPage=$sheet.PageSetup.FirstPageNumber;printArea=$sheet.PageSetup.PrintArea}
      $expectedPage+=$pages
    }
  }
  $report | ConvertTo-Json -Depth 4
  $book.Close($false)
} finally { $excel.Quit();[void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }


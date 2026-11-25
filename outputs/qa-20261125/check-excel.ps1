$ErrorActionPreference = 'Stop'
$excelCheck = $null
$checkBook = $null
try {
  $excelCheck = New-Object -ComObject Excel.Application
  $excelCheck.Visible = $false
  $excelCheck.DisplayAlerts = $false
  $checkBook = $excelCheck.Workbooks.Open('C:\Users\Rom\Documents\GitHub\Bill-of-Quantities\outputs\qa-20261125\commercial-followup.xlsx', 0, $true)
  $checkSheet = $checkBook.Worksheets.Item('אינסטלציה')
  $checkSheet.Range('D4').Value2 = 2
  $checkSheet.Range('E4').Value2 = 0
  $excelCheck.CalculateFull()
  if ($checkSheet.Range('F4').Text -ne '') { throw 'Zero total was not hidden' }
  if ($checkSheet.Range('E4').Text -ne '') { throw 'Zero price was not hidden' }
  $checkSheet.Range('E4').Value2 = 12.5
  $excelCheck.CalculateFull()
  if ($checkSheet.Range('F4').Value2 -ne 25) { throw 'Positive total did not recalculate' }
  if ($checkSheet.Range('F4').Text -notmatch '25') { throw 'Positive total not displayed' }
  $checkElectrical = $checkBook.Worksheets.Item('חשמל ותקשורת')
  $checkElectrical.Range('D5').Value2 = 3
  $checkElectrical.Range('E5').Value2 = 20
  $excelCheck.CalculateFull()
  if ($checkElectrical.Range('F5').Value2 -ne 60) { throw 'Lighting note did not calculate' }
  if ($checkElectrical.Range('A5').Text -ne '') { throw 'Lighting note was numbered' }
  Write-Output 'Excel native check passed: zero price/total blank; 2 x 12.5 = 25 visible; unnumbered lighting note 3 x 20 = 60.'
} finally {
  if ($checkBook) { $checkBook.Close($false) }
  if ($excelCheck) { $excelCheck.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excelCheck) }
}

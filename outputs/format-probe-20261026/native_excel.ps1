$ErrorActionPreference = 'Stop'
$probeDir = $PSScriptRoot
$excelProbe = $null
$bookProbe = $null
try {
    $excelProbe = New-Object -ComObject Excel.Application
    $excelProbe.Visible = $false
    $excelProbe.DisplayAlerts = $false
    $excelProbe.AutomationSecurity = 3
    $bookProbe = $excelProbe.Workbooks.Open((Join-Path $probeDir 'baseline.xlsx'), 0, $false)
    $sheetProbe = $bookProbe.Worksheets.Item('פרק פעיל')
    $before = @($sheetProbe.Range('F2').Value2, $sheetProbe.Range('F5').Value2, $sheetProbe.Range('F10').Value2)
    $sheetProbe.Range('B2').Value2 = "דלת נערכה בתוכנה חיצונית`nמידות: 90×210"
    $sheetProbe.Range('D2').Value2 = 4.0
    $sheetProbe.Range('E4').Value2 = 20.0
    $excelProbe.CalculateFullRebuild()
    $after = @($sheetProbe.Range('F2').Value2, $sheetProbe.Range('F4').Value2, $sheetProbe.Range('F11').Value2)
    $bookProbe.SaveAs((Join-Path $probeDir 'excel-roundtrip.xlsx'), 51)
    @{engine='Microsoft Excel'; version=$excelProbe.Version; build=$excelProbe.Build; before=$before; after=$after; result='saved'} | ConvertTo-Json | Set-Content (Join-Path $probeDir 'excel-result.json') -Encoding utf8
    $bookProbe.Close($false)
    $bookProbe = $null
} catch {
    @{engine='Microsoft Excel'; result='failed'; error=$_.Exception.Message} | ConvertTo-Json | Set-Content (Join-Path $probeDir 'excel-result.json') -Encoding utf8
    throw
} finally {
    if ($null -ne $bookProbe) { $bookProbe.Close($false) }
    if ($null -ne $excelProbe) { $excelProbe.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excelProbe) }
}

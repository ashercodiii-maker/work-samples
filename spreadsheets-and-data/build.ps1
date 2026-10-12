# Builds sales_cleanup_dashboard.xlsx: a messy raw export, the cleaned table,
# a formula-driven dashboard with a chart, and a cleaning log.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $here 'sales_cleanup_dashboard.xlsx'
$chartPng = Join-Path $here 'chart.png'
$rng = New-Object System.Random 42

$customerRegion = [ordered]@{
  'Acme Corp' = 'North'; 'Blue Harbor Ltd' = 'South'; 'Cedar & Co' = 'East'; 'Delta Foods' = 'West'
  'Evergreen Retail' = 'North'; 'Fjord Supplies' = 'East'; 'Granite Labs' = 'South'; 'Horizon Media' = 'West'
}
$customers = @($customerRegion.Keys)
$regionVariants = @{
  'North' = @('North', 'north', ' NORTH', 'N.'); 'South' = @('South', 'south ', 'S.', 'SOUTH')
  'East' = @('East', 'east', 'E.', ' East'); 'West' = @('West', 'west ', 'W.', 'WEST')
}
$products = @(
  @{ Name = 'Standard License'; Price = 120 }, @{ Name = 'Pro License'; Price = 340 },
  @{ Name = 'Support Plan'; Price = 90 }, @{ Name = 'Onboarding'; Price = 450 }
)
$start = Get-Date '2026-01-01'

# --- generate clean orders, then a messy export of them ---
$orders = for ($i = 0; $i -lt 180; $i++) {
  $c = $customers[$rng.Next($customers.Count)]
  $p = $products[$rng.Next($products.Count)]
  [pscustomobject]@{
    Id = 'SO-' + (1001 + $i); Date = $start.AddDays($rng.Next(0, 181)); Customer = $c
    Region = $customerRegion[$c]; Product = $p.Name; Units = $rng.Next(1, 6); Price = $p.Price
  }
}
$stats = @{ names = 0; regions = 0; dates = 0; units = 0 }
function Get-Messy($o) {
  $name = switch ($rng.Next(5)) { 0 { $o.Customer } 1 { $o.Customer.ToLower() } 2 { $o.Customer.ToUpper() } 3 { '  ' + $o.Customer } 4 { $o.Customer + '   ' } }
  if ($name -cne $o.Customer) { $stats.names++ }
  $region = $regionVariants[$o.Region][$rng.Next(4)]
  if ($region -cne $o.Region) { $stats.regions++ }
  $date = switch ($rng.Next(3)) { 0 { $o.Date.ToString('yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture) } 1 { $o.Date.ToString('dd/MM/yyyy', [Globalization.CultureInfo]::InvariantCulture) } 2 { $o.Date.ToString('MMM d yyyy', [Globalization.CultureInfo]::InvariantCulture) } }
  $stats.dates++
  $units = if ($rng.Next(6) -eq 0) { $stats.units++; "$($o.Units) units" } else { "$($o.Units)" }
  ,@($o.Id, $date, $name, $region, $o.Product, $units, "$($o.Price)")
}
$raw = New-Object System.Collections.ArrayList
foreach ($o in $orders) { [void]$raw.Add((Get-Messy $o)) }
$dupes = 14
for ($d = 0; $d -lt $dupes; $d++) { [void]$raw.Insert($rng.Next($raw.Count), (Get-Messy $orders[$rng.Next($orders.Count)])) }

function ConvertTo-Array2D($rows, $cols) {
  $a = New-Object 'object[,]' $rows.Count, $cols
  for ($r = 0; $r -lt $rows.Count; $r++) { for ($c = 0; $c -lt $cols; $c++) { $a[$r, $c] = $rows[$r][$c] } }
  ,$a
}
function Format-Header($range) {
  $range.Font.Bold = $true; $range.Font.Color = 0xFFFFFF; $range.Interior.Color = 0x5E3A1F  # BGR: dark navy
}

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false; $xl.DefaultSheetDirection = -5003  # left-to-right even on Hebrew Excel
try {
  $wb = $xl.Workbooks.Add()
  while ($wb.Worksheets.Count -lt 4) { [void]$wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) }
  foreach ($ws in $wb.Worksheets) { $ws.DisplayRightToLeft = $false }
  $wsDash = $wb.Worksheets.Item(1); $wsDash.Name = 'Dashboard'
  $wsClean = $wb.Worksheets.Item(2); $wsClean.Name = 'Clean Data'
  $wsRaw = $wb.Worksheets.Item(3); $wsRaw.Name = 'Raw Export'
  $wsLog = $wb.Worksheets.Item(4); $wsLog.Name = 'Cleaning Log'

  # Raw export, kept as text exactly as it arrived
  $rawHeader = @('Order ID', 'Order Date', 'Customer', 'Region', 'Product', 'Units', 'Unit Price')
  $wsRaw.Range('A1:G' + ($raw.Count + 1)).NumberFormat = '@'
  $wsRaw.Range('A1:G1').Value2 = (ConvertTo-Array2D @(, $rawHeader) 7)
  $wsRaw.Range('A2:G' + ($raw.Count + 1)).Value2 = (ConvertTo-Array2D $raw 7)
  Format-Header $wsRaw.Range('A1:G1')
  [void]$wsRaw.Columns('A:G').AutoFit()

  # Clean data: deduplicated, typed, sorted; Month and Revenue are formulas
  $sorted = $orders | Sort-Object Date, Id
  $n = $sorted.Count
  $cleanHeader = @('Order ID', 'Order Date', 'Month', 'Customer', 'Region', 'Product', 'Units', 'Unit Price', 'Revenue')
  $wsClean.Range('A1:I1').Value2 = (ConvertTo-Array2D @(, $cleanHeader) 9)
  $rows = foreach ($o in $sorted) { ,@($o.Id, $o.Date.ToOADate(), $null, $o.Customer, $o.Region, $o.Product, $o.Units, $o.Price) }
  $wsClean.Range("A2:H$($n + 1)").Value2 = (ConvertTo-Array2D $rows 8)
  $wsClean.Range("C2:C$($n + 1)").Formula = '=DATE(YEAR(B2),MONTH(B2),1)'
  $wsClean.Range("I2:I$($n + 1)").Formula = '=G2*H2'
  $wsClean.Range("B2:B$($n + 1)").NumberFormat = 'yyyy-mm-dd'
  $wsClean.Range("C2:C$($n + 1)").NumberFormat = '[$-409]mmm yyyy'
  $wsClean.Range("H2:I$($n + 1)").NumberFormat = '$#,##0'
  Format-Header $wsClean.Range('A1:I1')
  [void]$wsClean.ListObjects.Add(1, $wsClean.Range("A1:I$($n + 1)"), [Type]::Missing, 1)
  [void]$wsClean.Columns('A:I').AutoFit()

  # Dashboard
  $wsDash.Range('A1').Value2 = 'Sales Dashboard - H1 2026'
  $wsDash.Range('A1').Font.Size = 18; $wsDash.Range('A1').Font.Bold = $true
  $wsDash.Range('A2').Value2 = 'Every number below is a live formula on the Clean Data sheet.'
  $wsDash.Range('A2').Font.Italic = $true
  $kpi = @(
    @('Total revenue', "=SUM('Clean Data'!I:I)", '$#,##0'),
    @('Orders', "=COUNTA('Clean Data'!A:A)-1", '0'),
    @('Avg order value', '=B4/B5', '$#,##0'),
    @('Top customer', '=INDEX(H14:H21,MATCH(MAX(I14:I21),I14:I21,0))', '@')
  )
  for ($k = 0; $k -lt $kpi.Count; $k++) {
    $r = 4 + $k
    $wsDash.Range("A$r").Value2 = $kpi[$k][0]; $wsDash.Range("A$r").Font.Bold = $true
    $wsDash.Range("B$r").Formula = $kpi[$k][1]
    if ($kpi[$k][2] -ne '@') { $wsDash.Range("B$r").NumberFormat = $kpi[$k][2] }
  }
  $wsDash.Range('A10:F10').Value2 = (ConvertTo-Array2D @(, @('Month', 'North', 'South', 'East', 'West', 'Total')) 6)
  Format-Header $wsDash.Range('A10:F10')
  for ($m = 0; $m -lt 6; $m++) {
    $r = 11 + $m
    $wsDash.Range("A$r").Value2 = $start.AddMonths($m).ToOADate()
    $wsDash.Range("B${r}:E$r").Formula = "=SUMIFS('Clean Data'!`$I:`$I,'Clean Data'!`$C:`$C,`$A$r,'Clean Data'!`$E:`$E,B`$10)"
    $wsDash.Range("F$r").Formula = "=SUM(B${r}:E$r)"
  }
  $wsDash.Range('A11:A16').NumberFormat = '[$-409]mmm yyyy'
  $wsDash.Range('B11:F16').NumberFormat = '$#,##0'
  # Revenue by customer (feeds "Top customer")
  $wsDash.Range('H13:I13').Value2 = (ConvertTo-Array2D @(, @('Customer', 'Revenue')) 2)
  Format-Header $wsDash.Range('H13:I13')
  for ($c = 0; $c -lt $customers.Count; $c++) {
    $r = 14 + $c
    $wsDash.Range("H$r").Value2 = $customers[$c]
    $wsDash.Range("I$r").Formula = "=SUMIFS('Clean Data'!`$I:`$I,'Clean Data'!`$D:`$D,H$r)"
  }
  $wsDash.Range('I14:I21').NumberFormat = '$#,##0'
  [void]$wsDash.Range('A4:I21').Columns.AutoFit()

  $co = $wsDash.ChartObjects().Add(20, 340, 620, 300)
  $co.Chart.ChartType = 51  # clustered column
  $co.Chart.SetSourceData($wsDash.Range('B10:E16'), 2)
  foreach ($sr in $co.Chart.SeriesCollection()) { $sr.XValues = $wsDash.Range('A11:A16') }
  $co.Chart.Axes(1).CategoryType = 2
  $co.Chart.Axes(1).TickLabels.NumberFormat = '[$-409]mmm'
  $co.Chart.HasTitle = $true; $co.Chart.ChartTitle.Text = 'Monthly revenue by region'
  $tmpPng = Join-Path $env:TEMP 'xl_chart_tmp.png'; [void]$co.Chart.Export($tmpPng)

  # Cleaning log
  $log = @(
    @('Step', 'Rows affected'),
    @('Rows in raw export', $raw.Count),
    @('Duplicate orders removed (same Order ID)', $dupes),
    @('Customer names trimmed / re-cased', $stats.names),
    @('Region labels standardized (e.g. "N.", " north" -> North)', $stats.regions),
    @('Text dates in 3 formats converted to real dates', $stats.dates),
    @('Units stored as text ("3 units") converted to numbers', $stats.units),
    @('Clean orders', $n)
  )
  $wsLog.Range('A1:B' + $log.Count).Value2 = (ConvertTo-Array2D $log 2)
  Format-Header $wsLog.Range('A1:B1')
  [void]$wsLog.Columns('A:B').AutoFit()

  $wsDash.Activate()
  $tmpXlsx = Join-Path $env:TEMP 'xl_sales_tmp.xlsx'; $wb.SaveAs($tmpXlsx, 51)
  $wb.Close($false)
  "raw=$($raw.Count) dupes=$dupes clean=$n names=$($stats.names) regions=$($stats.regions) dates=$($stats.dates) units=$($stats.units)"
} finally {
  $xl.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
}
Move-Item -Force $tmpXlsx $out
Move-Item -Force $tmpPng $chartPng



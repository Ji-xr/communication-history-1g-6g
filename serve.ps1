$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$stopFile = Join-Path $root '.stop-server'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8765)
$types = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'
  '.json'='application/json; charset=utf-8'; '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'
  '.jpeg'='image/jpeg'; '.webp'='image/webp'; '.ico'='image/x-icon'; '.txt'='text/plain; charset=utf-8'
}
try {
  $listener.Start()
  while ($listener.Pending() -or -not (Test-Path -LiteralPath $stopFile)) {
    if (Test-Path -LiteralPath $stopFile) { break }
    if (-not $listener.Pending()) { Start-Sleep -Milliseconds 100; continue }
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while ($reader.ReadLine() -ne '') { }
      $status = '200 OK'
      $bytes = [byte[]]@()
      $contentType = 'text/plain; charset=utf-8'
      try {
        $parts = $requestLine.Split(' ')
        if ($parts.Count -lt 2 -or ($parts[0] -ne 'GET' -and $parts[0] -ne 'HEAD')) { throw 'Not found' }
        $url = [System.Uri]::new('http://127.0.0.1' + $parts[1])
        $relative = [System.Uri]::UnescapeDataString($url.AbsolutePath.TrimStart('/')).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
        $path = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
        if (-not $path.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Not found' }
        if (Test-Path -LiteralPath $path -PathType Container) { $path = Join-Path $path 'index.html' }
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'Not found' }
        $extension = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
        if ($types.ContainsKey($extension)) { $contentType = $types[$extension] }
        $bytes = [System.IO.File]::ReadAllBytes($path)
        if ($parts[0] -eq 'HEAD') { $bytes = [byte[]]@() }
      } catch {
        $status = '404 Not Found'
        $contentType = 'text/plain; charset=utf-8'
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      }
      $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      if ($bytes.Length -gt 0) { $stream.Write($bytes, 0, $bytes.Length) }
      $stream.Flush()
      $reader.Dispose()
    } finally { $client.Dispose() }
  }
} finally {
  $listener.Stop()
  if (Test-Path -LiteralPath $stopFile) { Remove-Item -LiteralPath $stopFile -Force }
}

$ErrorActionPreference = "Stop"

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\dist"))
$port = 4173

if (-not (Test-Path -LiteralPath (Join-Path $root "index.html"))) {
    Write-Host "The production site is missing. Run npm install and npm run build first." -ForegroundColor Red
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
}

$listener = [System.Net.Sockets.TcpListener]::new(
    [System.Net.IPAddress]::Loopback,
    $port
)

try {
    $listener.Start()
} catch {
    Start-Process "http://localhost:$port"
    Write-Host "The portfolio is already available at http://localhost:$port"
    exit 0
}

Start-Process "http://localhost:$port"
Write-Host ""
Write-Host "Portfolio opened at http://localhost:$port" -ForegroundColor Green
Write-Host "Keep this window open while viewing the site. Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()

            while ($reader.ReadLine()) {}

            if (-not $requestLine) { continue }
            $requestPath = ($requestLine -split " ")[1]
            $requestPath = [System.Uri]::UnescapeDataString(($requestPath -split "\?")[0])
            if ($requestPath -eq "/") { $requestPath = "/index.html" }

            $relativePath = $requestPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))

            if (-not $filePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
                $filePath = Join-Path $root "index.html"
            }

            if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                $filePath = Join-Path $root "index.html"
            }

            $content = [System.IO.File]::ReadAllBytes($filePath)
            $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
            $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }
            $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($content.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($content, 0, $content.Length)
            $stream.Flush()
        } finally {
            $client.Dispose()
        }
    }
} finally {
    $listener.Stop()
}

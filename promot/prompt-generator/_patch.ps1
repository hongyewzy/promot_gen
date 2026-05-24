$path = 'D:\桌面\promot\promot\prompt-generator\src\app\api\style\route.ts'
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1. Add hotOpts fetch block before the bodyPool line
$hotOptsBlock = @"
    // 获取热门选项
    let hotOpts: Record<string, string[]> | null = null;
    try {
      const baseUrl = req.headers.get('host') || 'localhost:3000';
      const hotRes = await fetch(`http://${baseUrl}/api/hot-options`);
      if (hotRes.ok) hotOpts = await hotRes.json();
    } catch { /* 使用写死 pool */ }

"@

$content = $content.Replace(
    "    const bodyPool = [`",
    $hotOptsBlock + "    const bodyPool = hotOpts?.body ?? [`"
)

# 2. Replace expressionPool
$content = $content.Replace(
    "    const expressionPool = [`",
    "    const expressionPool = hotOpts?.expression ?? [`"
)

# 3. Replace cameraPool
$content = $content.Replace(
    "    const cameraPool = [`",
    "    const cameraPool = hotOpts?.camera ?? [`"
)

# 4. Replace topPool
$content = $content.Replace(
    "    const topPool = [`",
    "    const topPool = hotOpts?.top ?? [`"
)

# 5. Replace bottomPool
$content = $content.Replace(
    "    const bottomPool = [`",
    "    const bottomPool = hotOpts?.bottom ?? [`"
)

# 6. Replace shoesPool
$content = $content.Replace(
    "    const shoesPool = [`",
    "    const shoesPool = hotOpts?.shoes ?? [`"
)

# 7. Replace accessoryPool
$content = $content.Replace(
    "    const accessoryPool = [`",
    "    const accessoryPool = hotOpts?.accessory ?? [`"
)

# 8. Replace backgroundPool
$content = $content.Replace(
    "    const backgroundPool = [`",
    "    const backgroundPool = hotOpts?.background ?? [`"
)

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output 'Done'
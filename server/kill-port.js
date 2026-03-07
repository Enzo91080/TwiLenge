// Libere le port 3001 de facon synchrone avant le demarrage du serveur
import { execSync } from 'child_process'

const PORT = 3001

try {
  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "` +
      `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue ` +
      `| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: 'ignore' },
    )
  } else {
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' })
  }
  // Laisser le temps au port d'etre libere
  execSync('node -e "setTimeout(()=>{},400)"')
} catch {}

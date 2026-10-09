# MCP Plugins & Tools — DinusNexus

Dokumen ini menjelaskan plugin dan tools yang dikonfigurasi untuk development DinusNexus. Konfigurasi berada di [`opencode.json`](../opencode.json).

## Status Plugin

| Plugin | Status | Konfigurasi | Catatan |
|---|---|---|---|
| **Context7** | Terhubung | Remote: `https://mcp.context7.com/mcp` | Dokumentasi library terkini (Next.js, React, Tailwind, dll) |
| **GitHub** | Terhubung | Local: `@modelcontextprotocol/server-github` | Memerlukan `GITHUB_PERSONAL_ACCESS_TOKEN` |
| **Playwright** | Terhubung | Local: `@playwright/mcp@latest` | Browser automation untuk testing UI |
| **Figma** | Perlu API Key | Remote: `https://mcp.figma.com/mcp` | Memerlukan `FIGMA_API_KEY` |
| **Azure CLI** | Tool terpisah | Instalasi command-line | Bukan MCP server; diinstal manual |

## Setup Environment Variables

1. Salin `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```
2. Isi variabel yang diperlukan (lihat `.env.example`).
3. **Jangan commit file `.env`.** File ini sudah masuk `.gitignore`.

## Detail Plugin

### 1. Context7 (wajib untuk coding)

Memberikan dokumentasi library terkini kepada AI. Otomatis tersedia saat mengerjakan Next.js, React, Tailwind, dan sejenisnya.

### 2. GitHub (wajib)

Membaca repo, mengelola issue, dan memeriksa pull request.

1. Buat Personal Access Token di https://github.com/settings/tokens
2. Permissions: `repo`, `read:org`, `read:user`
3. Set `GITHUB_PERSONAL_ACCESS_TOKEN` di `.env`

### 3. Playwright (wajib untuk demo)

Menguji dashboard melalui browser: navigasi, form, tampilan responsif, dan alur demo end-to-end. Terinstal otomatis via npx saat pertama digunakan.

### 4. Figma (opsional — desain UI/UX)

Menghubungkan desain Figma dengan implementasi. Set `FIGMA_API_KEY` di `.env`. Tidak wajib jika waktu terbatas.

### 5. Azure CLI (wajib untuk deployment)

Bukan MCP server, melainkan tool command-line.

```powershell
winget install -e --id Microsoft.AzureCLI
az --version
az login
```

Catatan: jangan membuat resource berbayar tanpa persetujuan tim. Kredit Azure diperkirakan sekitar US$100. Localhost tetap dapat dipakai untuk demo jika deployment berisiko.

## Cek Status Plugin

```bash
opencode mcp list
```

Atau gunakan `/mcps` di dalam OpenCode.

## Troubleshooting

- **GitHub tidak terkoneksi:** pastikan `GITHUB_PERSONAL_ACCESS_TOKEN` diset, restart OpenCode setelah mengubah `.env`.
- **Figma unauthorized:** pastikan `FIGMA_API_KEY` valid; abaikan jika tidak memakai Figma.
- **Playwright gagal:** pastikan Node.js terinstal, jalankan `npx playwright install`.
- **Azure CLI tidak ditemukan:** instal lalu restart terminal.

## Keamanan

- Jangan pernah commit `.env`, API key, atau credential ke repository.
- Gunakan environment variables untuk semua secret.
- Jika secret terlanjur ter-commit, cabut/rotate secret tersebut.

## Referensi

- [OpenCode MCP Documentation](https://opencode.ai/v2/docs/mcp-servers)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [GitHub MCP Server](https://github.com/modelcontextprotocol/servers)
- [Azure CLI Documentation](https://learn.microsoft.com/cli/azure/)
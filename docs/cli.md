# WARO CLI

Herramienta de línea de comandos para la API pública de WaRo Colombia. Construida en **Rust** — rápida, confiable y scriptable.

---

## Instalación

### Binario precompilado — recomendado

```bash
curl -fsSL https://raw.githubusercontent.com/uno0uno/waro-cli/main/install.sh | sh
```

Si quieres revisar el script antes de ejecutarlo:

```bash
curl -fsSL https://raw.githubusercontent.com/uno0uno/waro-cli/main/install.sh > install.sh
cat install.sh
sh install.sh
```

Se instala en `/usr/local/bin/waro` (o `~/.local/bin/waro` si no hay permisos de escritura).

### Plataformas soportadas

| Sistema | Arquitectura |
|---------|-------------|
| macOS | ARM64 (Apple Silicon) |
| macOS | Intel x86_64 |
| Linux | x86_64 |
| Linux | ARM64 |

### Desde el código fuente (requiere Rust)

```bash
git clone https://github.com/uno0uno/waro-cli
cd waro-cli
cargo build --release
cp target/release/waro ~/.local/bin/waro
```

### Actualizar

Vuelve a ejecutar el instalador — siempre descarga el último release:

```bash
curl -fsSL https://raw.githubusercontent.com/uno0uno/waro-cli/main/install.sh | sh
```

---

## Configuración

Exporta tu API key como variable de entorno:

```bash
export WARO_API_URL=https://api.warocol.com
export WARO_API_KEY=waro_sk_tu_key_aqui
```

O usando un archivo `.env`:

```bash
cp .env.example .env
# Edita .env y agrega tu WARO_API_KEY
```

Genera tu API key en el panel de WaRo bajo **Configuración → API Tokens**.

---

## Uso

```bash
waro --help

# Ventas
waro sales list --limit 20 --fields id,status,total
waro sales list --date-from 2026-03-01 --date-to 2026-03-31 --status completed
waro sales metrics --group-by date --date-from 2026-03-01
waro sales detail --order-id <uuid>

# Menú
waro menu products --fields id,name,price
waro menu recipes
waro menu modifiers

# Salida en tabla
waro --output table sales list --fields id,status,total --limit 10

# Auto-paginación (NDJSON, un objeto por línea)
waro sales list --all --fields id,status,total
waro menu products --all | wc -l

# Inspeccionar schema de un endpoint (no requiere API key)
waro schema
waro schema sales list
waro schema sales detail | jq '.params[] | select(.required == true)'

# Dry run — valida sin hacer la llamada
waro sales list --dry-run

# Ver configuración actual
waro config
```

---

## Perfiles

Trabaja con múltiples entornos (staging, producción, local) usando perfiles nombrados:

```toml
# ~/.waro/config.toml
[profiles.staging]
api_url = "https://staging-api.warocol.com"
api_key  = "waro_sk_staging_xxx"

[profiles.prod]
api_url  = "https://api.warocol.com"
api_key  = "waro_sk_prod_xxx"
```

```bash
waro --profile staging sales list
waro --profile prod sales metrics --group-by date

# O con variable de entorno
export WARO_PROFILE=staging
waro sales list
```

Si no hay perfil configurado, usa `WARO_API_KEY` / `WARO_API_URL` del entorno.

---

## Autocompletado de shell

```bash
# zsh (recomendado)
waro completions zsh > ~/.zsh/completions/_waro
exec zsh

# bash
waro completions bash | sudo tee /etc/bash_completion.d/waro

# fish
waro completions fish > ~/.config/fish/completions/waro.fish
```

Shells soportados: `bash` · `zsh` · `fish` · `powershell` · `elvish`

---

## Flags globales

| Flag | Descripción |
|------|-------------|
| `--output json\|table` | Formato de salida (default: json) |
| `--fields id,name,...` | Retorna solo estos campos |
| `--no-color` | Desactiva colores en la salida |
| `--profile <nombre>` | Usa un perfil de `~/.waro/config.toml` |

---

## Repositorio

[github.com/uno0uno/waro-cli](https://github.com/uno0uno/waro-cli)

# Testing GitHub Actions Workflows with Act

Esta guía proporciona instrucciones para probar localmente los workflows de GitHub Actions usando [act](https://github.com/nektos/act).

## Prerequisitos

1. Instalar Docker (requerido por act)
2. Instalar act:
   ```bash
   # macOS
   brew install act
   
   # Linux/Windows
   curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
   ```

## Workflows Disponibles

### 1. Test Workflow (`test.yml`)
Ejecuta las pruebas en múltiples sistemas operativos y versiones de Node.js.

```bash
# Ejecutar todo el workflow
act -W .github/workflows/test.yml

# Ejecutar solo en Ubuntu con Node 20
act -W .github/workflows/test.yml -j "test" -P ubuntu-latest=node:20

# Con verbose para debugging
act -W .github/workflows/test.yml -v
```

### 2. PR Checks Workflow (`pr-checks.yml`)
Valida los pull requests ejecutando tests y verificaciones de código.

```bash
# Simular un PR
act pull_request -W .github/workflows/pr-checks.yml

# Con evento personalizado
act pull_request -W .github/workflows/pr-checks.yml -e - << EOF
{
  "pull_request": {
    "number": 123,
    "head": {
      "ref": "feature-branch",
      "sha": "abc123"
    },
    "base": {
      "ref": "main"
    }
  }
}
EOF
```

### 3. Publish Workflow (`publish.yml`)
Publica la extensión cuando se crea un release.

```bash
# Simular un release
act release -W .github/workflows/publish.yml -e - << EOF
{
  "release": {
    "tag_name": "v1.0.0",
    "name": "Release v1.0.0",
    "prerelease": false
  }
}
EOF

# Probar con secrets (crear archivo .secrets)
echo "VSCE_PAT=tu-token-aqui" > .secrets
act release -W .github/workflows/publish.yml --secret-file .secrets
```

### 4. Test Publish Local (`test-publish-local.yml`)
Prueba el proceso de empaquetado localmente.

```bash
# Ejecutar con push a main
act push -W .github/workflows/test-publish-local.yml -e - << EOF
{
  "ref": "refs/heads/main"
}
EOF

# Ejecutar con PR
act pull_request -W .github/workflows/test-publish-local.yml
```

### 5. Auto Version Deploy (`auto-version-deploy.yml`)
Automatiza el versionado y despliegue.

```bash
# Simular push a main con cambios
act push -W .github/workflows/auto-version-deploy.yml -e - << EOF
{
  "ref": "refs/heads/main",
  "head_commit": {
    "message": "feat: nueva funcionalidad"
  }
}
EOF

# Con secrets necesarios
cat > .secrets << EOF
GH_PAT=tu-github-token
VSCE_PAT=tu-vscode-token
EOF

act push -W .github/workflows/auto-version-deploy.yml --secret-file .secrets
```

## Comandos Útiles de Act

### Listar todos los workflows
```bash
act -l
```

### Ejecutar con plataforma específica
```bash
# Ubuntu
act -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest

# macOS
act -P macos-latest=ghcr.io/catthehacker/macos:act-latest

# Windows
act -P windows-latest=ghcr.io/catthehacker/windows:act-latest
```

### Ejecutar con caché local
```bash
# Habilitar caché para acelerar las ejecuciones
act --artifact-server-path /tmp/artifacts
```

### Debugging
```bash
# Modo verbose
act -v

# Modo debug (muy detallado)
act -vv

# Ejecutar solo un job específico
act -j nombre-del-job

# Dry run (no ejecutar, solo mostrar)
act -n
```

## Configuración de Entorno

### Archivo `.actrc`
Crea un archivo `.actrc` en la raíz del proyecto para configuración persistente:

```
-P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest
-P macos-latest=ghcr.io/catthehacker/macos:act-latest
-P windows-latest=ghcr.io/catthehacker/windows:act-latest
--artifact-server-path /tmp/artifacts
```

### Variables de Entorno
```bash
# Configurar variables para un workflow
act -W .github/workflows/test.yml \
  --env NODE_ENV=test \
  --env CI=true
```

### Secrets
Nunca commitear el archivo `.secrets`. Agrégalo a `.gitignore`:

```bash
echo ".secrets" >> .gitignore
```

## Solución de Problemas Comunes

### 1. Error de permisos en Docker
```bash
# Linux: agregar usuario al grupo docker
sudo usermod -aG docker $USER
# Reiniciar sesión después
```

### 2. Workflow falla por falta de token
```bash
# Crear token temporal para pruebas
act --secret GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### 3. Diferencias con GitHub Actions real
- Act no soporta todas las características de GitHub Actions
- Algunos contextos como `github.event` pueden necesitar ser simulados
- Las imágenes de Docker pueden diferir ligeramente

### 4. Memoria insuficiente
```bash
# Aumentar memoria asignada a Docker
# En Docker Desktop: Settings > Resources > Memory
```

### 5. Tests fallan con "Expected 0 arguments" pero localmente funcionan
Este error ocurre cuando hay cambios en los archivos de test que no están comprometidos en git.
Act usa la versión comprometida del código, no los cambios locales sin guardar.

**Solución:**
```bash
# Verificar cambios sin commit
git status

# Si hay cambios en tests o mocks, hacer commit
git add tests/__mocks__/* tests/**/*.test.ts
git commit -m "fix: update test files"

# Ahora ejecutar act
act -W .github/workflows/test.yml
```

**Tip:** Para probar cambios temporalmente sin afectar tu historial:
```bash
# Crear commit temporal
git add .
git commit -m "temp: testing with act"

# Ejecutar act
act -W .github/workflows/test.yml

# Si quieres deshacer el commit después
git reset --soft HEAD~1
```

## Ejemplos de Pruebas Completas

### Simular flujo completo de PR
```bash
# 1. Crear rama
git checkout -b test-feature

# 2. Hacer cambios y commit
echo "test" > test.txt
git add test.txt
git commit -m "test: añadir archivo de prueba"

# 3. Probar PR checks
act pull_request -W .github/workflows/pr-checks.yml

# 4. Si pasa, probar merge a main
act push -W .github/workflows/auto-version-deploy.yml
```

### Probar release completo
```bash
# 1. Preparar secrets
cat > .secrets << EOF
VSCE_PAT=vsce-token-aqui
GH_PAT=github-token-aqui
EOF

# 2. Simular release
act release -W .github/workflows/publish.yml \
  --secret-file .secrets \
  -e - << EOF
{
  "release": {
    "tag_name": "v1.2.3",
    "name": "Release v1.2.3",
    "body": "## Cambios\n- Nueva funcionalidad\n- Corrección de bugs"
  }
}
EOF
```

## Notas Importantes

1. **Seguridad**: Nunca subas archivos `.secrets` o tokens a Git
2. **Rendimiento**: La primera ejecución descarga imágenes Docker (~1GB)
3. **Compatibilidad**: No todas las acciones de GitHub funcionan en act
4. **Debugging**: Usa `-v` o `-vv` para más información cuando algo falle

## Referencias

- [Documentación oficial de act](https://github.com/nektos/act)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [act-cli FAQ](https://github.com/nektos/act#faq)
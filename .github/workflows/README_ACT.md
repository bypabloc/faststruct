# Pruebas Locales de GitHub Actions con Act

Este documento explica cómo probar los workflows de GitHub Actions localmente usando [nektos/act](https://github.com/nektos/act).

## ¿Qué es Act?

Act es una herramienta que permite ejecutar GitHub Actions localmente usando Docker. Esto proporciona retroalimentación rápida sin necesidad de hacer commits y push constantemente.

## Instalación

### Opción 1: Script de instalación (Linux/macOS)
```bash
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Opción 2: Homebrew (macOS)
```bash
brew install act
```

### Opción 3: Instalación manual (Linux)
```bash
curl -L https://github.com/nektos/act/releases/download/v0.2.77/act_Linux_x86_64.tar.gz -o act.tar.gz
tar xzvf act.tar.gz
sudo mv act /usr/local/bin/
sudo chmod +x /usr/local/bin/act
```

### Opción 4: Desde código fuente
```bash
# Requiere Go 1.20+
git clone git@github.com:nektos/act.git
cd act
make install
```

### Verificar instalación
```bash
act --version
```

## Comandos Básicos

### Listar workflows disponibles
```bash
# Listar todos los workflows
act -l

# Listar workflows para un evento específico
act workflow_dispatch -l
```

### Ejecutar workflows

#### Ejecutar el workflow de prueba local
```bash
# Ejecutar el workflow de prueba (simula publicación sin credenciales)
act -W .github/workflows/test-publish-local.yml

# Ejecutar con salida detallada
act -W .github/workflows/test-publish-local.yml -v

# Modo dry-run (ver qué pasaría sin ejecutar)
act -W .github/workflows/test-publish-local.yml -n
```

#### Probar el workflow de publicación real
```bash
# Ejecutar el workflow publish.yml (requiere token)
act -W .github/workflows/publish.yml -s GITHUB_TOKEN=[tu-token-aquí]

# O dejar en blanco para entrada segura
act -W .github/workflows/publish.yml -s GITHUB_TOKEN
```

#### Probar publicación de VS Code Extension con VSCE_PAT
```bash
# Ejecutar con el token de VS Code Marketplace
act workflow_dispatch -W .github/workflows/publish.yml -s VSCE_PAT=[tu-token-aquí]

# O usar entrada interactiva para mayor seguridad
act workflow_dispatch -W .github/workflows/publish.yml -s VSCE_PAT

# Con evento push específico
act push -W .github/workflows/publish.yml -s VSCE_PAT=[tu-token-aquí]

# Ejecutar job específico con secreto
act push -j deploy -W .github/workflows/publish.yml -s VSCE_PAT=[tu-token-aquí]
```

### Ejecutar jobs específicos
```bash
# Ejecutar solo el job 'test-deploy'
act -j test-deploy -W .github/workflows/test-publish-local.yml

# Ejecutar job específico con evento
act push -j verify -W .github/workflows/verify-pr.yml -s GITHUB_TOKEN=""

# Ejecutar job con modo offline (sin descargar acciones)
act push --action-offline-mode -j verify -W .github/workflows/verify-pr.yml -s GITHUB_TOKEN=""
```

### Comandos con eventos específicos
```bash
# Ejecutar workflow con evento push
act push

# Ejecutar con evento push y archivo JSON personalizado
act push -e path/to/event.json

# Ejecutar con evento workflow_dispatch
act workflow_dispatch

# Ejecutar con evento pull_request
act pull_request
```

## Flujo de Trabajo Recomendado

1. **Desarrollo inicial**: Usa el workflow de prueba local
   ```bash
   act -W .github/workflows/test-publish-local.yml
   ```

2. **Depuración**: Ejecuta con modo verbose
   ```bash
   act -W .github/workflows/test-publish-local.yml -v
   ```

3. **Validación final**: Prueba el workflow real con dry-run
   ```bash
   act -W .github/workflows/publish.yml -n
   ```

## Configuración Avanzada

### Usar imágenes Docker personalizadas
```bash
# Si necesitas una imagen específica de Ubuntu
act -P ubuntu-latest=ubuntu:22.04

# Usar imagen completa con más herramientas preinstaladas
act -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest

# Especificar múltiples runners
act -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest -P ubuntu-20.04=ghcr.io/catthehacker/ubuntu:full-20.04
```

### Opciones adicionales de ejecución
```bash
# Reconstruir imagen Docker
act push --rebuild

# Forzar pull de nuevas imágenes
act push --pull

# Usar caché de Docker
act push --reuse

# Modo verbose para debugging
act push -v

# Modo dry-run (no ejecutar, solo mostrar)
act push -n

# Especificar arquitectura del contenedor
act push --container-architecture linux/amd64
```

### Archivo de configuración .actrc
Crea un archivo `.actrc` en el directorio del proyecto:
```
-P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest
--container-architecture linux/amd64
--pull=false
--reuse
```

### Manejo de secretos
```bash
# Pasar un secreto individual
act push -s MY_SECRET=value

# Pasar múltiples secretos
act push -s SECRET1=value1 -s SECRET2=value2

# Cargar secretos desde archivo .env
act push --env-file .env

# Cargar secretos desde archivo .secrets
act push --secret-file .secrets

# Ejemplo de archivo .secrets
# VSCE_PAT=vsce-token-here
# GITHUB_TOKEN=ghp_token-here
```

## Solución de Problemas

### Error: "Command not found" en el contenedor
Algunas herramientas pueden no estar disponibles en las imágenes predeterminadas de act. Soluciones:
- Usa imágenes más completas: `act -P ubuntu-latest=catthehacker/ubuntu:full-20.04`
- Agrega pasos de instalación en el workflow

### Error con pnpm
Si encuentras problemas con pnpm:
```bash
# Limpiar caché de Docker
docker system prune -a

# Ejecutar con nueva imagen
act -W .github/workflows/test-publish-local.yml --pull
```

### Gestión de imágenes Docker
```bash
# Ver todas las imágenes de Act
docker images | grep catthehacker

# Eliminar imágenes específicas de catthehacker
docker rmi $(docker images 'catthehacker/ubuntu*' -q) -f

# Limpiar todo el sistema Docker (¡precaución!)
docker system prune -a --volumes
```

### Limitaciones de Act
- No soporta todas las características de GitHub Actions
- Algunos secretos y contextos pueden no estar disponibles
- Las acciones que dependen de servicios externos pueden fallar

## Ejemplos de Uso Común

### Probar cambios en el workflow
```bash
# 1. Edita el workflow
# 2. Prueba localmente
act -W .github/workflows/test-publish-local.yml

# 3. Si funciona, prueba el workflow real
act -W .github/workflows/publish.yml -s GITHUB_TOKEN
```

### Prueba completa de publicación de VS Code Extension
```bash
# 1. Verificar sintaxis del workflow (dry-run)
act workflow_dispatch -W .github/workflows/publish.yml -n

# 2. Probar sin secretos (fallará en el paso de publicación)
act workflow_dispatch -W .github/workflows/publish.yml

# 3. Probar con VSCE_PAT real
act workflow_dispatch -W .github/workflows/publish.yml -s VSCE_PAT=your-vsce-pat-token

# 4. Comando completo con todas las opciones
act push --action-offline-mode -j deploy -W .github/workflows/publish.yml \
  -s VSCE_PAT=your-token \
  -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest \
  --container-architecture linux/amd64
```

### Debug de fallos en CI
```bash
# Simular el entorno exacto de CI
act push -W .github/workflows/publish.yml -v

# Con logs detallados y secretos
act push -W .github/workflows/publish.yml -v -s VSCE_PAT
```

### Validar antes de PR
```bash
# Ejecutar todos los checks localmente
act -W .github/workflows/test-publish-local.yml

# Verificar workflow de PR
act pull_request -W .github/workflows/verify-pr.yml
```

## Notas Importantes

- El workflow `test-publish-local.yml` está diseñado para pruebas locales sin necesidad de secretos
- El workflow `publish.yml` requiere un token de VS Code Marketplace (VSCE_PAT) para publicar
- Act usa Docker, así que asegúrate de tenerlo instalado y ejecutándose
- Los tiempos de ejecución pueden ser más lentos que en GitHub Actions real
- **IMPORTANTE**: Para publicar en VS Code Marketplace necesitas:
  - Un Personal Access Token (PAT) de Azure DevOps con permisos de Marketplace
  - El token debe tener scope "Marketplace (Manage)"
  - Puedes crear uno en: https://dev.azure.com/[tu-organización]/_usersSettings/tokens

## Flujo Completo para Publicar Extension

```bash
# 1. Primero, asegúrate de tener tu VSCE_PAT
export VSCE_PAT="tu-token-aquí"  # O guárdalo en .env o .secrets

# 2. Verifica que el workflow funciona sin publicar
act -W .github/workflows/test-publish-local.yml

# 3. Prueba el workflow completo con dry-run
act workflow_dispatch -W .github/workflows/publish.yml -n

# 4. Ejecuta el workflow completo con tu token
act workflow_dispatch -W .github/workflows/publish.yml -s VSCE_PAT=$VSCE_PAT

# 5. Si hay errores, ejecuta con modo verbose
act workflow_dispatch -W .github/workflows/publish.yml -s VSCE_PAT=$VSCE_PAT -v
```
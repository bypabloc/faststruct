# Configuración del Personal Access Token (PAT)

Para que el workflow de auto-versionado funcione correctamente, necesitas crear un Personal Access Token en GitHub.

## Pasos para crear el PAT:

1. Ve a tu perfil de GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - O directamente: https://github.com/settings/tokens

2. Click en "Generate new token" → "Generate new token (classic)"

3. Configura el token:
   - **Note**: `FastStruct Auto Version`
   - **Expiration**: Selecciona el tiempo que prefieras (recomendado: 90 días o No expiration)
   - **Scopes**: Marca los siguientes permisos:
     - ✅ `repo` (completo - incluye todos los sub-permisos)
     - ✅ `workflow` (necesario para modificar workflows)

4. Click en "Generate token" al final de la página

5. **IMPORTANTE**: Copia el token inmediatamente (solo se muestra una vez)

## Agregar el PAT como Secret en el repositorio:

1. Ve a tu repositorio → Settings → Secrets and variables → Actions

2. Click en "New repository secret"

3. Configura el secret:
   - **Name**: `PAT`
   - **Secret**: Pega el token que copiaste

4. Click en "Add secret"

## Verificación:

El workflow ahora podrá:
- Hacer commits con el bump de versión
- Push a main/master
- Cherry-pick a la rama dev

## Nota de seguridad:

- Nunca compartas tu PAT
- Si sospechas que fue comprometido, revócalo inmediatamente
- Considera usar tokens con fecha de expiración y renovarlos periódicamente
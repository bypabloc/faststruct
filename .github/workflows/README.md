# GitHub Actions - Configuración para Deploy Automático

## Configuración Requerida

Para que el workflow de publicación automática funcione correctamente, necesitas configurar un **Personal Access Token (PAT)** de VS Code Marketplace como secreto en tu repositorio de GitHub.

### Pasos para configurar:

1. **Obtener el Personal Access Token de VS Code:**
   - Ve a https://dev.azure.com/
   - Inicia sesión con tu cuenta de Microsoft (la misma que usas para el Marketplace)
   - Ve a User Settings > Personal Access Tokens
   - Crea un nuevo token con los siguientes permisos:
     - **Marketplace**: Manage
   - Copia el token generado

2. **Agregar el token como secreto en GitHub:**
   - Ve a tu repositorio en GitHub
   - Settings > Secrets and variables > Actions
   - Click en "New repository secret"
   - Nombre: `VSCE_PAT`
   - Valor: [Pega el token que copiaste]
   - Click en "Add secret"

3. **Verificar tu publisher:**
   - Asegúrate de que el campo `publisher` en tu `package.json` coincida con tu ID de publisher en el Marketplace

## Funcionamiento del Workflow

El workflow se ejecutará automáticamente cuando:
- Se haga push a la rama `master` o `main`

El proceso incluye:
1. Instalación de dependencias con pnpm
2. Ejecución de tests
3. Compilación del proyecto
4. Empaquetado de la extensión
5. Publicación al VS Code Marketplace

## Troubleshooting

Si el workflow falla:
- Verifica que el token tenga los permisos correctos
- Asegúrate de que el campo `publisher` en package.json sea correcto
- Revisa que la versión en package.json sea mayor a la publicada actualmente

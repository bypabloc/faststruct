# Guía de Debug - FastStruct

## 🔍 Problema: Los logs no aparecen en producción

Si has instalado FastStruct desde el marketplace y no ves los logs a pesar de tener debug habilitado, aquí está la solución.

## ✅ Configuración correcta del Debug Mode

### 1. **Configuración en settings.json**

La configuración debe estar estructurada **exactamente** así:

```json
{
  "faststruct.config": {
    "debug": true,
    // ... otras configuraciones
  }
}
```

⚠️ **NO** así:
```json
{
  "faststruct.config.debug": true  // ❌ Incorrecto
}
```

### 2. **Verificar que la configuración esté activa**

1. Ejecuta el comando: `FastStruct: Health Check`
2. Verás un mensaje indicando si Debug Mode está `ENABLED ✓` o `DISABLED ✗`
3. En el panel Output siempre verás al menos un mensaje de error de prueba

### 3. **Ver los logs**

1. Abre el panel de Output: `View > Output` (o `Ctrl+Shift+U`)
2. En el dropdown, selecciona `FastStruct Debug`
3. Si debug está habilitado, verás todos los logs de la extensión

## 📝 Tipos de logs

- **Logger.error()**: Siempre se muestra (incluso con debug: false)
- **Logger.info()**: Solo con debug: true
- **Logger.debug()**: Solo con debug: true
- **Logger.warn()**: Solo con debug: true

## 🛠️ Comando Health Check mejorado

El comando `FastStruct: Health Check` ahora:
- Muestra el estado del debug mode
- Fuerza la apertura del canal de output
- Imprime logs de prueba para verificar que funciona
- Muestra la configuración completa en la consola del desarrollador

## 💡 Tips para debugging

1. **Consola del desarrollador**: `Help > Toggle Developer Tools`
   - Busca mensajes que empiecen con `[FastStruct]`
   
2. **Health Check**: Úsalo para diagnosticar problemas
   - Te dirá si debug está habilitado
   - Te mostrará cuántos comandos están registrados
   - Abrirá automáticamente el panel de Output

3. **Configuración por workspace**: Puedes tener debug habilitado solo en proyectos específicos
   - Workspace settings: `.vscode/settings.json`
   - Global settings: User settings

## 🐛 Si aún no ves logs

1. Verifica que la extensión esté activa (ejecuta cualquier comando FastStruct)
2. Reinicia VS Code después de cambiar la configuración
3. Asegúrate de estar mirando el canal correcto: `FastStruct Debug`
4. Ejecuta Health Check para forzar la creación del canal de output
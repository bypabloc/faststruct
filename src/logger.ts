import * as vscode from 'vscode';

/**
 * Utilidad de logging para FastStruct con soporte de debug condicional.
 * 
 * @author Pablo Contreras
 * @created 2025/01/30
 */
export class Logger {
    private static outputChannel: vscode.OutputChannel | undefined;
    private static readonly CHANNEL_NAME = 'FastStruct Debug';
    
    /**
     * Obtiene o crea el canal de salida para los logs.
     * 
     * @returns Canal de salida de VS Code
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    private static getOutputChannel(): vscode.OutputChannel {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel(this.CHANNEL_NAME);
        }
        return this.outputChannel;
    }
    
    /**
     * Verifica si el modo debug está habilitado.
     * 
     * @returns true si debug está habilitado
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    private static isDebugEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('faststruct');
        const faststructConfig = config.get('config', {}) as any;
        return faststructConfig.debug === true;
    }
    
    /**
     * Formatea el mensaje con timestamp y nivel.
     * 
     * @param level - Nivel del log (INFO, WARN, ERROR, DEBUG)
     * @param message - Mensaje a formatear
     * @param data - Datos adicionales opcionales
     * @returns Mensaje formateado
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    private static formatMessage(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data !== undefined) {
            try {
                formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
            } catch (e) {
                formattedMessage += `\n[No se pudo serializar los datos: ${e}]`;
            }
        }
        
        return formattedMessage;
    }
    
    /**
     * Registra un mensaje de información.
     * 
     * @param message - Mensaje a registrar
     * @param data - Datos adicionales opcionales
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    public static info(message: string, data?: any): void {
        if (!this.isDebugEnabled()) return;
        
        const formattedMessage = this.formatMessage('INFO', message, data);
        console.log(`FastStruct: ${formattedMessage}`);
        this.getOutputChannel().appendLine(formattedMessage);
    }
    
    /**
     * Registra un mensaje de advertencia.
     * 
     * @param message - Mensaje a registrar
     * @param data - Datos adicionales opcionales
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    public static warn(message: string, data?: any): void {
        if (!this.isDebugEnabled()) return;
        
        const formattedMessage = this.formatMessage('WARN', message, data);
        console.warn(`FastStruct: ${formattedMessage}`);
        this.getOutputChannel().appendLine(formattedMessage);
    }
    
    /**
     * Registra un mensaje de error.
     * 
     * @param message - Mensaje a registrar
     * @param error - Error o datos adicionales
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    public static error(message: string, error?: any): void {
        // Los errores siempre se muestran, independientemente del debug
        const formattedMessage = this.formatMessage('ERROR', message, error);
        console.error(`FastStruct: ${formattedMessage}`);
        this.getOutputChannel().appendLine(formattedMessage);
        
        // Si debug está habilitado, mostrar el canal
        if (this.isDebugEnabled()) {
            this.getOutputChannel().show();
        }
    }
    
    /**
     * Registra un mensaje de debug detallado.
     * 
     * @param message - Mensaje a registrar
     * @param data - Datos adicionales opcionales
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    public static debug(message: string, data?: any): void {
        if (!this.isDebugEnabled()) return;
        
        const formattedMessage = this.formatMessage('DEBUG', message, data);
        console.log(`FastStruct: ${formattedMessage}`);
        this.getOutputChannel().appendLine(formattedMessage);
    }
    
    /**
     * Muestra el canal de salida.
     * 
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    public static show(): void {
        this.getOutputChannel().show();
    }
    
    /**
     * Fuerza mostrar un mensaje en el canal de salida independientemente del modo debug.
     * Útil para mensajes importantes que siempre deben ser visibles.
     * 
     * @param message - Mensaje a mostrar
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    public static forceShow(message: string): void {
        const formattedMessage = this.formatMessage('INFO', message);
        console.log(`FastStruct: ${formattedMessage}`);
        this.getOutputChannel().appendLine(formattedMessage);
        this.getOutputChannel().show();
    }
    
    /**
     * Limpia el canal de salida.
     * 
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    public static clear(): void {
        this.getOutputChannel().clear();
    }
    
    /**
     * Registra el inicio de una función o proceso.
     * 
     * @param functionName - Nombre de la función
     * @param args - Argumentos de la función
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    public static functionStart(functionName: string, args?: any): void {
        if (!this.isDebugEnabled()) return;
        
        this.debug(`→ Iniciando ${functionName}`, args);
    }
    
    /**
     * Registra el fin de una función o proceso.
     * 
     * @param functionName - Nombre de la función
     * @param result - Resultado de la función
     * @author Pablo Contreras
     * @created 2025/01/30
     */
    public static functionEnd(functionName: string, result?: any): void {
        if (!this.isDebugEnabled()) return;
        
        this.debug(`← Finalizando ${functionName}`, result);
    }
}
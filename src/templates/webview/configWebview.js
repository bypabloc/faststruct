/**
 * Script principal del webview de configuración de FastStruct.
 * Versión modularizada para mejor mantenibilidad.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */

(function() {
    'use strict';
    
    // API de VS Code
    const vscode = acquireVsCodeApi();
    
    // Estado de la aplicación
    const state = {
        currentConfig: {},
        isLoading: false,
        hasUnsavedChanges: false
    };
    
    // Módulo de logging
    const Logger = {
        info: (message, data) => {
            console.log(`[INFO] ${message}`, data);
            vscode.postMessage({
                command: 'log',
                level: 'info',
                message: message,
                data: data
            });
        },
        
        warn: (message, data) => {
            console.warn(`[WARN] ${message}`, data);
            vscode.postMessage({
                command: 'log',
                level: 'warn',
                message: message,
                data: data
            });
        },
        
        error: (message, data) => {
            console.error(`[ERROR] ${message}`, data);
            vscode.postMessage({
                command: 'log',
                level: 'error',
                message: message,
                data: data
            });
        }
    };
    
    // Módulo de navegación
    const Navigation = {
        init: function() {
            const navItems = document.querySelectorAll('.nav-item');
            const sections = document.querySelectorAll('.content-section');
            
            navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetSection = item.dataset.section;
                    
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                    
                    sections.forEach(section => {
                        section.classList.remove('active');
                        if (section.id === targetSection + '-section') {
                            section.classList.add('active');
                        }
                    });
                });
            });
        },
        
        initTabs: function() {
            const tabs = document.querySelectorAll('.tab');
            const tabContents = document.querySelectorAll('.tab-content');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const targetTab = tab.dataset.tab;
                    
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                        if (content.dataset.tabContent === targetTab) {
                            content.classList.add('active');
                        }
                    });
                });
            });
        },
        
        initMobileMenu: function() {
            const mobileMenuToggle = document.getElementById('mobileMenuToggle');
            const sidebar = document.getElementById('sidebar');
            
            if (mobileMenuToggle && sidebar) {
                mobileMenuToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('mobile-open');
                });
            }
        }
    };
    
    // Módulo de manejo de configuración
    const ConfigManager = {
        updateUI: function() {
            Logger.info('Actualizando UI');
            
            try {
                // Opciones de salida
                this.updateOutputOptions();
                
                // Debug
                const debugCheckbox = document.getElementById('debug');
                if (debugCheckbox) {
                    debugCheckbox.checked = state.currentConfig.debug || false;
                }
                
                // Listas de exclusión
                this.updateExclusionLists();
                
            } catch (error) {
                Logger.error('Error actualizando UI', error);
            }
        },
        
        updateOutputOptions: function() {
            const options = {
                includeContent: state.currentConfig.output?.includeContent !== false,
                includeEmptyFolders: state.currentConfig.output?.includeEmptyFolders !== false,
                includeFileSize: state.currentConfig.output?.includeFileSize === true,
                includeLastModified: state.currentConfig.output?.includeLastModified === true
            };
            
            Object.entries(options).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.checked = value;
            });
        },
        
        updateExclusionLists: function() {
            const lists = {
                'excludeFolders': state.currentConfig.exclude?.folders || [],
                'excludeFiles': state.currentConfig.exclude?.files || [],
                'advancedPatterns': state.currentConfig.exclude?.advanced?.patterns || [],
                'specificFiles': state.currentConfig.exclude?.advanced?.specificFiles || [],
                'specificFolders': state.currentConfig.exclude?.advanced?.specificFolders || [],
                'regexPatterns': state.currentConfig.exclude?.advanced?.regexPatterns || [],
                'contentFiles': state.currentConfig.excludeContent?.files || [],
                'contentFolders': state.currentConfig.excludeContent?.folders || [],
                'contentPatterns': state.currentConfig.excludeContent?.patterns || []
            };
            
            Object.entries(lists).forEach(([id, items]) => {
                ListManager.updateList(id, items);
            });
        },
        
        save: function() {
            Logger.info('Guardando configuración');
            
            const debugCheckbox = document.getElementById('debug');
            if (debugCheckbox) {
                state.currentConfig.debug = debugCheckbox.checked;
            }
            
            vscode.postMessage({
                command: 'saveConfig',
                config: state.currentConfig
            });
        },
        
        reset: function() {
            Logger.info('Restableciendo configuración');
            vscode.postMessage({ command: 'resetConfig' });
        },
        
        export: function() {
            const dataStr = JSON.stringify(state.currentConfig, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportAnchor = document.createElement('a');
            exportAnchor.setAttribute('href', dataUri);
            exportAnchor.setAttribute('download', 'faststruct-config.json');
            exportAnchor.click();
            
            NotificationManager.show('Configuración exportada', 'success');
        },
        
        import: function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = event => {
                    try {
                        const importedConfig = JSON.parse(event.target.result);
                        state.currentConfig = importedConfig;
                        ConfigManager.updateUI();
                        NotificationManager.show('Configuración importada exitosamente', 'success');
                        vscode.postMessage({ command: 'getStats' });
                    } catch (error) {
                        Logger.error('Error al parsear JSON', error);
                        NotificationManager.show('Error al importar la configuración', 'error');
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
        }
    };
    
    // Módulo de manejo de listas
    const ListManager = {
        updateList: function(containerId, items) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = '';
            
            if (items.length === 0) {
                container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">No hay elementos</div>';
                return;
            }
            
            items.forEach((item, index) => {
                const itemEl = document.createElement('div');
                itemEl.className = 'enhanced-list-item';
                
                let icon = '📄';
                if (containerId.includes('Folder')) {
                    icon = '📁';
                } else if (containerId.includes('Pattern') || containerId.includes('Regex')) {
                    icon = '🎯';
                }
                
                itemEl.innerHTML = `
                    <div class="item-content">
                        <span class="item-icon">${icon}</span>
                        <span class="item-text">${item}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon remove-btn danger" title="Eliminar">🗑️</button>
                    </div>
                `;
                container.appendChild(itemEl);
            });
        },
        
        addItem: function(listId, inputId) {
            const input = document.getElementById(inputId);
            if (!input) return;
            
            const value = input.value.trim();
            if (!value) {
                NotificationManager.show('El valor no puede estar vacío', 'warning');
                return;
            }
            
            const path = this.getConfigPath(listId);
            const currentList = this.getNestedProperty(state.currentConfig, path) || [];
            
            if (currentList.includes(value)) {
                NotificationManager.show('Este valor ya existe en la lista', 'warning');
                return;
            }
            
            currentList.push(value);
            this.setNestedProperty(state.currentConfig, path, currentList);
            
            this.updateList(listId, currentList);
            input.value = '';
            
            NotificationManager.show('Item agregado', 'success');
            vscode.postMessage({ command: 'getStats' });
        },
        
        removeItem: function(listId, index) {
            const path = this.getConfigPath(listId);
            const currentList = this.getNestedProperty(state.currentConfig, path) || [];
            
            currentList.splice(index, 1);
            this.setNestedProperty(state.currentConfig, path, currentList);
            
            this.updateList(listId, currentList);
            NotificationManager.show('Item eliminado', 'info');
            vscode.postMessage({ command: 'getStats' });
        },
        
        getConfigPath: function(listId) {
            const paths = {
                'excludeFolders': 'exclude.folders',
                'excludeFiles': 'exclude.files',
                'advancedPatterns': 'exclude.advanced.patterns',
                'specificFiles': 'exclude.advanced.specificFiles',
                'specificFolders': 'exclude.advanced.specificFolders',
                'regexPatterns': 'exclude.advanced.regexPatterns',
                'contentFiles': 'excludeContent.files',
                'contentFolders': 'excludeContent.folders',
                'contentPatterns': 'excludeContent.patterns'
            };
            return paths[listId];
        },
        
        getNestedProperty: function(obj, path) {
            return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
        },
        
        setNestedProperty: function(obj, path, value) {
            const parts = path.split('.');
            const last = parts.pop();
            const target = parts.reduce((curr, prop) => {
                if (!curr[prop]) curr[prop] = {};
                return curr[prop];
            }, obj);
            target[last] = value;
        }
    };
    
    // Módulo de notificaciones
    const NotificationManager = {
        show: function(message, type) {
            const container = document.getElementById('notificationContainer');
            if (!container) return;
            
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.style.cssText = `
                background-color: var(--vscode-${type === 'error' ? 'editorError' : type === 'warning' ? 'editorWarning' : 'editorInfo'}-background);
                border: 1px solid var(--vscode-${type === 'error' ? 'editorError' : type === 'warning' ? 'editorWarning' : 'editorInfo'}-border);
                color: var(--vscode-${type === 'error' ? 'editorError' : type === 'warning' ? 'editorWarning' : 'editorInfo'}-foreground);
            `;
            
            const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
            notification.innerHTML = `<span>${icon}</span><span>${message}</span>`;
            
            container.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    };
    
    // Módulo de estadísticas
    const StatsManager = {
        update: function(stats) {
            const statsGrid = document.getElementById('statsGrid');
            if (statsGrid && stats) {
                statsGrid.innerHTML = `
                    <div class="stat-card">
                        <p class="stat-value">${stats.totalFiles.toLocaleString()}</p>
                        <p class="stat-label">Archivos Totales</p>
                    </div>
                    <div class="stat-card">
                        <p class="stat-value">${stats.excludedFiles.toLocaleString()}</p>
                        <p class="stat-label">Archivos Excluidos</p>
                    </div>
                    <div class="stat-card">
                        <p class="stat-value">${stats.totalFolders.toLocaleString()}</p>
                        <p class="stat-label">Carpetas Totales</p>
                    </div>
                    <div class="stat-card">
                        <p class="stat-value">${stats.excludedFolders.toLocaleString()}</p>
                        <p class="stat-label">Carpetas Excluidas</p>
                    </div>
                `;
                
                // Actualizar barras de progreso
                document.getElementById('filesProgress').style.width = stats.percentExcludedFiles + '%';
                document.getElementById('foldersProgress').style.width = stats.percentExcludedFolders + '%';
                document.getElementById('sizeProgress').style.width = stats.percentExcludedSize + '%';
            }
        }
    };
    
    // Módulo de herramientas
    const ToolsManager = {
        cleanDuplicates: function() {
            let duplicatesRemoved = 0;
            
            const removeDuplicates = (arr) => {
                const originalLength = arr.length;
                const unique = [...new Set(arr)];
                duplicatesRemoved += originalLength - unique.length;
                return unique;
            };
            
            // Limpiar todas las listas
            state.currentConfig.exclude.folders = removeDuplicates(state.currentConfig.exclude.folders);
            state.currentConfig.exclude.files = removeDuplicates(state.currentConfig.exclude.files);
            state.currentConfig.exclude.advanced.patterns = removeDuplicates(state.currentConfig.exclude.advanced.patterns);
            state.currentConfig.exclude.advanced.specificFiles = removeDuplicates(state.currentConfig.exclude.advanced.specificFiles);
            state.currentConfig.exclude.advanced.specificFolders = removeDuplicates(state.currentConfig.exclude.advanced.specificFolders);
            state.currentConfig.exclude.advanced.regexPatterns = removeDuplicates(state.currentConfig.exclude.advanced.regexPatterns);
            state.currentConfig.excludeContent.files = removeDuplicates(state.currentConfig.excludeContent.files);
            state.currentConfig.excludeContent.folders = removeDuplicates(state.currentConfig.excludeContent.folders);
            state.currentConfig.excludeContent.patterns = removeDuplicates(state.currentConfig.excludeContent.patterns);
            
            ConfigManager.updateUI();
            
            if (duplicatesRemoved > 0) {
                NotificationManager.show(`Se eliminaron ${duplicatesRemoved} duplicados`, 'success');
            } else {
                NotificationManager.show('No se encontraron duplicados', 'info');
            }
        },
        
        sortPatterns: function() {
            state.currentConfig.exclude.folders.sort();
            state.currentConfig.exclude.files.sort();
            state.currentConfig.exclude.advanced.patterns.sort();
            state.currentConfig.exclude.advanced.specificFiles.sort();
            state.currentConfig.exclude.advanced.specificFolders.sort();
            state.currentConfig.exclude.advanced.regexPatterns.sort();
            state.currentConfig.excludeContent.files.sort();
            state.currentConfig.excludeContent.folders.sort();
            state.currentConfig.excludeContent.patterns.sort();
            
            ConfigManager.updateUI();
            NotificationManager.show('Patrones ordenados alfabéticamente', 'success');
        },
        
        applyTemplate: function(templateName) {
            const templates = {
                node: {
                    folders: ['node_modules', '.git', 'dist', 'build', 'coverage', '.npm', '.yarn'],
                    files: ['*.log', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*', 'package-lock.json', 'yarn.lock'],
                    patterns: ['**/*.min.js', '**/*.map', '**/bundle.js']
                },
                python: {
                    folders: ['__pycache__', '.git', 'venv', 'env', '.pytest_cache', '.mypy_cache', 'build', 'dist'],
                    files: ['*.pyc', '*.pyo', '*.pyd', '.Python', '*.so', '*.egg-info'],
                    patterns: ['**/__pycache__/**', '**/*.egg-info/**']
                },
                java: {
                    folders: ['.git', 'target', 'out', 'build', '.gradle', '.idea', '.mvn'],
                    files: ['*.class', '*.jar', '*.war', '*.ear', '.classpath', '.project'],
                    patterns: ['**/target/**', '**/build/**']
                },
                dotnet: {
                    folders: ['.git', 'bin', 'obj', '.vs', 'packages', 'TestResults'],
                    files: ['*.dll', '*.exe', '*.pdb', '*.user', '*.cache'],
                    patterns: ['**/bin/**', '**/obj/**']
                }
            };
            
            const template = templates[templateName];
            if (!template) return;
            
            state.currentConfig.exclude.folders = [
                ...new Set([...state.currentConfig.exclude.folders, ...template.folders])
            ];
            state.currentConfig.exclude.files = [
                ...new Set([...state.currentConfig.exclude.files, ...template.files])
            ];
            state.currentConfig.exclude.advanced.patterns = [
                ...new Set([...state.currentConfig.exclude.advanced.patterns, ...template.patterns])
            ];
            
            ConfigManager.updateUI();
            NotificationManager.show(`Plantilla "${templateName}" aplicada`, 'success');
            vscode.postMessage({ command: 'getStats' });
        }
    };
    
    // Módulo de búsqueda
    const SearchManager = {
        init: function() {
            const searchInputs = document.querySelectorAll('.search-input');
            
            searchInputs.forEach(input => {
                input.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const targetListId = e.target.id.replace('search', '').charAt(0).toLowerCase() + e.target.id.replace('search', '').slice(1);
                    const listItems = document.querySelectorAll(`#${targetListId} .enhanced-list-item`);
                    
                    listItems.forEach(item => {
                        const text = item.querySelector('.item-text')?.textContent.toLowerCase() || '';
                        item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
                    });
                });
            });
        }
    };
    
    // Manejador de mensajes
    const MessageHandler = {
        init: function() {
            window.addEventListener('message', event => {
                const message = event.data;
                Logger.info('Mensaje recibido', message);
                
                switch (message.command) {
                    case 'loadConfig':
                        state.currentConfig = message.config;
                        ConfigManager.updateUI();
                        this.updateConfigSource(message.source);
                        break;
                        
                    case 'configSaved':
                        if (message.success) {
                            NotificationManager.show('Configuración guardada exitosamente', 'success');
                            vscode.postMessage({ command: 'loadConfig' });
                        } else {
                            NotificationManager.show('Error al guardar la configuración', 'error');
                        }
                        break;
                        
                    case 'gitignoreImported':
                        this.handleGitignoreImport(message.data);
                        break;
                        
                    case 'patternTestResult':
                        this.displayPatternTestResults(message.pattern, message.matches, message.hasMore);
                        break;
                        
                    case 'statsLoaded':
                        StatsManager.update(message.stats);
                        break;
                }
            });
        },
        
        updateConfigSource: function(source) {
            const sourceEl = document.getElementById('configSource');
            if (sourceEl) {
                let sourceText = '';
                let sourceIcon = '';
                switch (source) {
                    case 'workspace':
                        sourceIcon = '📁';
                        sourceText = 'Proyecto';
                        break;
                    case 'global':
                        sourceIcon = '🌐';
                        sourceText = 'Global';
                        break;
                    case 'default':
                        sourceIcon = '📋';
                        sourceText = 'Por defecto';
                        break;
                }
                sourceEl.innerHTML = `${sourceIcon} ${sourceText}`;
            }
        },
        
        handleGitignoreImport: function(data) {
            if (!data) return;
            
            const { patterns, folders, files } = data;
            
            if (patterns.length > 0) {
                state.currentConfig.exclude.advanced.patterns = [
                    ...new Set([...state.currentConfig.exclude.advanced.patterns, ...patterns])
                ];
            }
            if (folders.length > 0) {
                state.currentConfig.exclude.folders = [
                    ...new Set([...state.currentConfig.exclude.folders, ...folders])
                ];
            }
            if (files.length > 0) {
                state.currentConfig.exclude.files = [
                    ...new Set([...state.currentConfig.exclude.files, ...files])
                ];
            }
            
            ConfigManager.updateUI();
            NotificationManager.show('Patrones importados desde .gitignore', 'success');
        },
        
        displayPatternTestResults: function(pattern, matches, hasMore) {
            const resultsEl = document.getElementById('patternTestResults');
            if (!resultsEl) return;
            
            if (matches.length === 0) {
                resultsEl.innerHTML = '<div style="color: var(--vscode-descriptionForeground);">No se encontraron coincidencias</div>';
            } else {
                let html = '<div style="margin-bottom: 10px;">Coincidencias encontradas:</div>';
                matches.forEach(match => {
                    html += `<div class="test-match">${match}</div>`;
                });
                if (hasMore) {
                    html += '<div style="color: var(--vscode-descriptionForeground); margin-top: 10px;">...y más</div>';
                }
                resultsEl.innerHTML = html;
            }
        }
    };
    
    // Inicialización
    function init() {
        Logger.info('Script de webview iniciado');
        
        // Inicializar módulos
        Navigation.init();
        Navigation.initTabs();
        Navigation.initMobileMenu();
        SearchManager.init();
        MessageHandler.init();
        
        // Event listeners
        setupEventListeners();
        
        // Cargar configuración inicial
        vscode.postMessage({ command: 'loadConfig' });
        vscode.postMessage({ command: 'getStats' });
    }
    
    // Configurar event listeners
    function setupEventListeners() {
        // Botones de agregar
        document.getElementById('addExcludeFolder')?.addEventListener('click', () => ListManager.addItem('excludeFolders', 'newExcludeFolder'));
        document.getElementById('addExcludeFile')?.addEventListener('click', () => ListManager.addItem('excludeFiles', 'newExcludeFile'));
        document.getElementById('addAdvancedPattern')?.addEventListener('click', () => ListManager.addItem('advancedPatterns', 'newAdvancedPattern'));
        document.getElementById('addSpecificFile')?.addEventListener('click', () => ListManager.addItem('specificFiles', 'newSpecificFile'));
        document.getElementById('addSpecificFolder')?.addEventListener('click', () => ListManager.addItem('specificFolders', 'newSpecificFolder'));
        document.getElementById('addRegexPattern')?.addEventListener('click', () => ListManager.addItem('regexPatterns', 'newRegexPattern'));
        document.getElementById('addContentFile')?.addEventListener('click', () => ListManager.addItem('contentFiles', 'newContentFile'));
        document.getElementById('addContentFolder')?.addEventListener('click', () => ListManager.addItem('contentFolders', 'newContentFolder'));
        document.getElementById('addContentPattern')?.addEventListener('click', () => ListManager.addItem('contentPatterns', 'newContentPattern'));
        
        // Botones principales
        document.getElementById('saveButton')?.addEventListener('click', () => ConfigManager.save());
        document.getElementById('resetConfigBtn')?.addEventListener('click', () => ConfigManager.reset());
        document.getElementById('exportButton')?.addEventListener('click', () => ConfigManager.export());
        document.getElementById('importButton')?.addEventListener('click', () => ConfigManager.import());
        
        // Herramientas
        document.getElementById('importGitignoreBtn')?.addEventListener('click', () => vscode.postMessage({ command: 'importGitignore' }));
        document.getElementById('cleanDuplicatesBtn')?.addEventListener('click', () => ToolsManager.cleanDuplicates());
        document.getElementById('sortPatternsBtn')?.addEventListener('click', () => ToolsManager.sortPatterns());
        
        // Test de patrones
        document.getElementById('testPatternBtn')?.addEventListener('click', () => {
            const pattern = document.getElementById('testPattern').value;
            if (pattern) {
                vscode.postMessage({ 
                    command: 'testPattern',
                    pattern: pattern,
                    type: 'glob'
                });
            }
        });
        
        // Plantillas
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => ToolsManager.applyTemplate(btn.dataset.template));
        });
        
        // Toggle switches
        document.getElementById('includeContent')?.addEventListener('change', (e) => {
            if (!state.currentConfig.output) state.currentConfig.output = {};
            state.currentConfig.output.includeContent = e.target.checked;
        });
        
        document.getElementById('includeEmptyFolders')?.addEventListener('change', (e) => {
            if (!state.currentConfig.output) state.currentConfig.output = {};
            state.currentConfig.output.includeEmptyFolders = e.target.checked;
        });
        
        document.getElementById('includeFileSize')?.addEventListener('change', (e) => {
            if (!state.currentConfig.output) state.currentConfig.output = {};
            state.currentConfig.output.includeFileSize = e.target.checked;
        });
        
        document.getElementById('includeLastModified')?.addEventListener('change', (e) => {
            if (!state.currentConfig.output) state.currentConfig.output = {};
            state.currentConfig.output.includeLastModified = e.target.checked;
        });
        
        document.getElementById('debug')?.addEventListener('change', (e) => {
            state.currentConfig.debug = e.target.checked;
        });
        
        // Exclusiones comunes
        document.getElementById('addCommonExclusionsBtn')?.addEventListener('click', () => {
            const commonExclusions = {
                folders: ['node_modules', '.git', 'dist', 'build', '.tmp', 'out'],
                files: ['*.log', '*.lock', 'package-lock.json', 'yarn.lock'],
                patterns: ['**/*.min.js', '**/*.map', '**/.DS_Store']
            };
            
            state.currentConfig.exclude.folders = [
                ...new Set([...state.currentConfig.exclude.folders, ...commonExclusions.folders])
            ];
            state.currentConfig.exclude.files = [
                ...new Set([...state.currentConfig.exclude.files, ...commonExclusions.files])
            ];
            state.currentConfig.exclude.advanced.patterns = [
                ...new Set([...state.currentConfig.exclude.advanced.patterns, ...commonExclusions.patterns])
            ];
            
            ConfigManager.updateUI();
            NotificationManager.show('Exclusiones comunes agregadas', 'success');
        });
        
        // Event delegation para botones de eliminar
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('remove-btn')) {
                const listItem = e.target.closest('.enhanced-list-item');
                if (!listItem) return;
                
                const container = listItem.parentElement;
                if (!container) return;
                
                const containerId = container.id;
                const index = Array.from(container.children).indexOf(listItem);
                
                ListManager.removeItem(containerId, index);
            }
        });
    }
    
    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
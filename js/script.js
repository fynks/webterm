/**
 * Modern Web Terminal Emulator
 * Features: Auto-completion, command suggestions, theme switching, file system simulation
 * Dynamic configuration loading for multiple Linux distributions
 */

class WebTerminal {
    constructor() {
        // Core properties
        this.distroManager = {};
        this.currentDistro = null;
        this.config = {};
        this.commandHistory = [];
        this.historyIndex = 0;
        this.currentPath = '/home/user';
        this.commandCount = 0;
        this.startTime = Date.now();
        this.currentTheme = 'dark';
        
        // DOM elements
        this.elements = {};
        this.initializeElements();
        
        // State management
        this.isLoading = true;
        this.suggestions = [];
        this.selectedSuggestionIndex = -1;
        
        // Debounced functions
        this.debouncedShowSuggestions = this.debounce(this.showSuggestions.bind(this), 300);
        
        // File system simulation (will be loaded from config)
        this.fileSystem = {};
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.updateUptime = this.updateUptime.bind(this);
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            terminal: document.getElementById('terminal'),
            terminalOutput: document.getElementById('terminal-output'),
            prompt: document.getElementById('prompt'),
            commandInput: document.getElementById('command-input'),
            suggestions: document.getElementById('suggestions'),
            suggestionsPanel: document.getElementById('suggestions-panel'),
            suggestionsList: document.getElementById('suggestions-list'),
            themeToggle: document.getElementById('theme-toggle'),
            distroSelector: document.getElementById('distro-selector'),
            currentPath: document.getElementById('current-path'),
            commandCount: document.getElementById('command-count'),
            uptime: document.getElementById('uptime'),
            sessionInfo: document.getElementById('session-info'),
            loadingScreen: document.getElementById('loading-screen')
        };
    }

    /**
     * Initialize the terminal
     */
    async init() {
        try {
            this.showLoadingMessage('Loading distribution manager...');
            await this.loadDistroManager();
            
            // Check for URL parameter to override distro
            const urlParams = new URLSearchParams(window.location.search);
            const distroParam = urlParams.get('distro');
            
            // Get saved distro preference or use URL param or default
            const savedDistro = localStorage.getItem('terminal-distro');
            this.currentDistro = distroParam || savedDistro || this.distroManager.defaultDistro;
            
            // Validate distro exists
            if (!this.distroManager.distributions[this.currentDistro]) {
                console.warn(`Unknown distro: ${this.currentDistro}, falling back to default`);
                this.currentDistro = this.distroManager.defaultDistro;
            }
            
            // Save distro preference
            localStorage.setItem('terminal-distro', this.currentDistro);
            
            this.showLoadingMessage(`Loading ${this.distroManager.distributions[this.currentDistro].name}...`);
            await this.loadConfig();
            
            this.showLoadingMessage('Setting up environment...');
            await this.sleep(500); // Simulate setup time
            
            this.setupEventListeners();
            this.initializeUI();
            this.displayMotd();
            this.renderNewPromptLine();
            this.startUptimeCounter();
            
            // Hide loading screen
            this.elements.loadingScreen.classList.add('hidden');
            this.isLoading = false;
            
            // Focus input after loading
            setTimeout(() => {
                this.elements.commandInput.focus();
            }, 300);
            
        } catch (error) {
            console.error('Failed to initialize terminal:', error);
            this.renderLine('❌ Error: Could not initialize terminal. Please refresh the page.', 'output-error');
            this.elements.loadingScreen.classList.add('hidden');
        }
    }

    /**
     * Load distribution manager configuration
     */
    async loadDistroManager() {
        const response = await fetch('config/distro_manager.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.distroManager = await response.json();
    }

    /**
     * Load configuration from JSON file based on current distro
     */
    async loadConfig() {
        const distroConfig = this.distroManager.distributions[this.currentDistro];
        const response = await fetch(distroConfig.configFile);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.config = await response.json();
        
        // Set up filesystem from config
        this.setupFileSystemFromConfig();
        
        // Set current path based on user
        this.currentPath = `/home/${this.config.system.user}`;
        
        // Enhance config with additional commands
        this.enhanceConfig();
        
        // Update UI elements with distro-specific information
        this.updateUIForDistro();
    }

    /**
     * Set up file system from configuration
     */
    setupFileSystemFromConfig() {
        this.fileSystem = {};
        const user = this.config.system.user;
        
        // Create file system structure from config
        for (const [path, contents] of Object.entries(this.config.filesystem)) {
            const fullPath = path.replace('~', `/home/${user}`);
            
            this.fileSystem[fullPath] = {
                type: 'directory',
                contents: contents.filter(item => !item.endsWith('/')).map(item => item.replace('/', '')),
                parent: this.getParentPath(fullPath)
            };
            
            // Create subdirectories
            contents.filter(item => item.endsWith('/')).forEach(dir => {
                const dirName = dir.replace('/', '');
                const dirPath = `${fullPath}/${dirName}`;
                this.fileSystem[dirPath] = {
                    type: 'directory',
                    contents: [],
                    parent: fullPath
                };
            });
        }
        
        // Create files from config
        for (const [filename, content] of Object.entries(this.config.files)) {
            const filePath = `/home/${user}/${filename}`;
            this.fileSystem[filePath] = {
                type: 'file',
                content: content,
                parent: `/home/${user}`
            };
        }
    }

    /**
     * Get parent path for a given path
     */
    getParentPath(path) {
        const parts = path.split('/').filter(part => part !== '');
        if (parts.length <= 1) return '/';
        return '/' + parts.slice(0, -1).join('/');
    }

    /**
     * Update UI elements for the current distribution
     */
    updateUIForDistro() {
        const distroInfo = this.distroManager.distributions[this.currentDistro];
        
        // Update title
        document.title = `WebTerm - ${distroInfo.name}`;
        const titleElement = document.querySelector('.title-text');
        if (titleElement) {
            titleElement.textContent = `WebTerm - ${distroInfo.name}`;
        }
        
        // Update current path display
        if (this.elements.currentPath) {
            this.elements.currentPath.textContent = this.currentPath;
        }
        
        // Populate and update distro selector
        this.populateDistroSelector();
    }

    /**
     * Populate the distribution selector dropdown
     */
    populateDistroSelector() {
        if (!this.elements.distroSelector) return;
        
        this.elements.distroSelector.innerHTML = '';
        
        for (const [key, distro] of Object.entries(this.distroManager.distributions)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${distro.icon} ${distro.name}`;
            option.selected = key === this.currentDistro;
            this.elements.distroSelector.appendChild(option);
        }
    }

    /**
     * Enhance the configuration with additional commands and features
     */
    enhanceConfig() {
        // Add distro switching command
        this.config.commands['switch-distro'] = {
            description: 'Switch to a different Linux distribution',
            action: 'switchDistro'
        };
        
        // Add list distros command
        this.config.commands['list-distros'] = {
            description: 'List available Linux distributions',
            action: 'listDistros'
        };
        
        // Ensure core commands exist with proper actions
        const coreCommands = {
            'cd': {
                description: 'Change the current directory',
                action: 'changeDirectory'
            },
            'mkdir': {
                description: 'Create a new directory',
                action: 'makeDirectory'
            },
            'touch': {
                description: 'Create a new file',
                action: 'createFile'
            },
            'rm': {
                description: 'Remove files or directories',
                action: 'removeFile'
            },
            'date': {
                description: 'Display the current date and time',
                action: 'showDate'
            },
            'history': {
                description: 'Show command history',
                action: 'showHistory'
            },
            'theme': {
                description: 'Toggle between light and dark themes',
                action: 'toggleTheme'
            },
            'clear': {
                description: 'Clear the terminal screen',
                action: 'clearScreen'
            }
        };

        // Merge core commands, but don't override existing config commands
        for (const [cmd, info] of Object.entries(coreCommands)) {
            if (!this.config.commands[cmd]) {
                this.config.commands[cmd] = info;
            }
        }
        
        // Update dynamic commands with current config values
        if (this.config.commands['whoami']) {
            this.config.commands['whoami'].output = this.config.system.user;
        }
        if (this.config.commands['pwd']) {
            this.config.commands['pwd'].output = this.currentPath;
        }
    }

    /**
     * Render the prompt based on current config
     */
    renderPrompt() {
        const user = this.config.system?.user || 'user';
        const host = this.config.system?.host || 'localhost';
        const pathDisplay = this.currentPath.replace(`/home/${user}`, '~');
        
        this.elements.prompt.innerHTML = `<span class="prompt-user">${user}</span><span class="prompt-separator">@</span><span class="prompt-host">${host}</span><span class="prompt-separator">:</span><span class="prompt-path">${pathDisplay}</span><span class="prompt-symbol">$</span> `;
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Terminal click focus
        this.elements.terminal.addEventListener('click', () => {
            this.elements.commandInput.focus();
        });

        // Input events
        this.elements.commandInput.addEventListener('keydown', this.handleKeyDown);
        this.elements.commandInput.addEventListener('input', this.handleInput);

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Distribution selector
        if (this.elements.distroSelector) {
            this.elements.distroSelector.addEventListener('change', (e) => {
                const selectedDistro = e.target.value;
                if (selectedDistro && selectedDistro !== this.currentDistro) {
                    this.switchDistro(selectedDistro);
                }
            });
        }

        // Window controls (cosmetic)
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleWindowControl(btn.className);
            });
        });

        // Global shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                this.interruptCommand();
            }
        });
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        this.updatePath();
        this.updateCommandCount();
        this.applyTheme(this.currentTheme);
        this.populateSuggestionsPanel();
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                if (this.selectedSuggestionIndex >= 0) {
                    this.applySuggestion();
                } else {
                    this.processCommand();
                }
                break;
            
            case 'Tab':
                event.preventDefault();
                this.handleTabCompletion();
                break;
            
            case 'ArrowUp':
                event.preventDefault();
                if (this.suggestions.length > 0 && this.elements.suggestions.classList.contains('show')) {
                    this.navigateSuggestions('up');
                } else {
                    this.navigateHistory('up');
                }
                break;
            
            case 'ArrowDown':
                event.preventDefault();
                if (this.suggestions.length > 0 && this.elements.suggestions.classList.contains('show')) {
                    this.navigateSuggestions('down');
                } else {
                    this.navigateHistory('down');
                }
                break;
            
            case 'Escape':
                event.preventDefault();
                this.hideSuggestions();
                break;
        }
    }

    /**
     * Handle input events for auto-suggestions
     */
    handleInput(event) {
        const value = event.target.value;
        if (value.length > 0) {
            this.debouncedShowSuggestions(value);
        } else {
            this.hideSuggestions();
        }
    }

    /**
     * Process entered command
     */
    processCommand() {
        const fullCommand = this.elements.commandInput.value.trim();
        
        // Render the command with prompt
        const promptText = this.elements.prompt.textContent;
        this.renderLine(`${promptText} ${fullCommand}`, 'output-command');

        if (fullCommand) {
            // Update history
            if (this.commandHistory[this.commandHistory.length - 1] !== fullCommand) {
                this.commandHistory.push(fullCommand);
            }
            this.historyIndex = this.commandHistory.length;
            this.commandCount++;
            this.updateCommandCount();

            // Parse and execute command
            const [command, ...args] = fullCommand.split(/\s+/);
            this.executeCommand(command, args, fullCommand);
        }

        // Clear input and hide suggestions
        this.elements.commandInput.value = '';
        this.hideSuggestions();
        this.scrollToBottom();
    }

    /**
     * Execute a command
     */
    executeCommand(command, args = [], fullCommand = '') {
        // Check for exact full command match first
        if (this.config.commands[fullCommand]) {
            this.handleCommand(this.config.commands[fullCommand], args, fullCommand);
            return;
        }

        // Check for base command
        if (this.config.commands[command]) {
            this.handleCommand(this.config.commands[command], args, command);
            return;
        }

        // Command not found
        const notFound = this.config.system.commandNotFound.replace('{cmd}', command);
        this.renderLine(notFound, 'output-error');
    }

    /**
     * Handle command execution
     */
    handleCommand(cmdObj, args, command) {
        // Handle special action commands
        if (cmdObj.action) {
            switch (cmdObj.action) {
                case 'clearScreen':
                    this.clearScreen();
                    return;
                case 'showDate':
                    this.renderLine(new Date().toString());
                    return;
                case 'showHistory':
                    this.showHistory();
                    return;
                case 'toggleTheme':
                    this.toggleTheme();
                    return;
                case 'changeDirectory':
                    this.changeDirectory(args[0]);
                    return;
                case 'makeDirectory':
                    this.makeDirectory(args[0]);
                    return;
                case 'createFile':
                    this.createFile(args[0]);
                    return;
                case 'removeFile':
                    this.removeFile(args[0]);
                    return;
                case 'switchDistro':
                    this.switchDistro(args[0]);
                    return;
                case 'listDistros':
                    this.listDistros();
                    return;
            }
        }

        // Handle built-in commands
        switch (command) {
            case 'help':
                this.showHelp();
                break;
            case 'echo':
                this.renderLine(args.join(' '));
                break;
            case 'cat':
                this.handleCat(args);
                break;
            case 'ls':
                this.handleLs(args);
                break;
            case 'pwd':
                this.renderLine(this.currentPath);
                break;
            default:
                // Handle standard output from config
                if (cmdObj.output) {
                    if (Array.isArray(cmdObj.output)) {
                        cmdObj.output.forEach(line => this.renderLine(line));
                    } else {
                        this.renderLine(cmdObj.output);
                    }
                }
        }
    }

    /**
     * Show help command with enhanced formatting
     */
    showHelp() {
        this.renderLine('📋 Available Commands:', 'output-success');
        this.renderLine('─'.repeat(50));
        
        const commands = Object.entries(this.config.commands);
        commands.forEach(([cmd, info]) => {
            const padding = ' '.repeat(Math.max(0, 15 - cmd.length));
            this.renderLine(`  ${cmd}${padding}${info.description || 'No description'}`);
        });
        
        this.renderLine('');
        this.renderLine('💡 Tips:');
        this.renderLine('  • Use Tab for auto-completion');
        this.renderLine('  • Use ↑/↓ arrows for command history');
        this.renderLine('  • Type "theme" to toggle dark/light mode');
    }

    /**
     * List available distributions
     */
    listDistros() {
        this.renderLine('🐧 Available Linux Distributions:', 'output-success');
        this.renderLine('─'.repeat(50));
        
        for (const [key, distro] of Object.entries(this.distroManager.distributions)) {
            const current = key === this.currentDistro ? ' (current)' : '';
            const status = key === this.currentDistro ? 'output-success' : '';
            this.renderLine(`  ${distro.icon} ${distro.name}${current}`, status);
            this.renderLine(`     ${distro.description}`);
            this.renderLine(`     Command: switch-distro ${key}`);
            this.renderLine('');
        }
        
        this.renderLine('💡 Usage: switch-distro <distro-name>');
        this.renderLine('   Example: switch-distro ubuntu');
    }

    /**
     * Switch to a different distribution
     */
    switchDistro(distroName) {
        if (!distroName) {
            this.renderLine('❌ Usage: switch-distro <distro-name>', 'output-error');
            this.renderLine('💡 Available distros: ' + Object.keys(this.distroManager.distributions).join(', '));
            return;
        }

        if (!this.distroManager.distributions[distroName]) {
            this.renderLine(`❌ Unknown distribution: ${distroName}`, 'output-error');
            this.renderLine('💡 Use "list-distros" to see available options');
            return;
        }

        if (distroName === this.currentDistro) {
            this.renderLine(`✅ Already using ${this.distroManager.distributions[distroName].name}`, 'output-success');
            return;
        }

        this.renderLine(`🔄 Switching to ${this.distroManager.distributions[distroName].name}...`, 'output-success');
        
        // Save preference and reload
        localStorage.setItem('terminal-distro', distroName);
        
        // Add URL parameter and reload
        const url = new URL(window.location);
        url.searchParams.set('distro', distroName);
        window.history.pushState({}, '', url);
        
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    /**
     * Handle cat command
     */
    handleCat(args) {
        if (args.length === 0) {
            this.renderLine('cat: missing file operand', 'output-error');
            return;
        }

        const fileName = args[0];
        const filePath = this.resolvePath(fileName);
        const fileObj = this.fileSystem[filePath];

        if (!fileObj) {
            this.renderLine(`cat: ${fileName}: No such file or directory`, 'output-error');
            return;
        }

        if (fileObj.type !== 'file') {
            this.renderLine(`cat: ${fileName}: Is a directory`, 'output-error');
            return;
        }

        this.renderLine(fileObj.content);
    }

    /**
     * Handle ls command with enhanced formatting
     */
    handleLs(args) {
        const targetPath = args.length > 0 ? this.resolvePath(args[0]) : this.currentPath;
        const dirObj = this.fileSystem[targetPath];

        if (!dirObj) {
            this.renderLine(`ls: cannot access '${args[0] || '.'}': No such file or directory`, 'output-error');
            return;
        }

        if (dirObj.type !== 'directory') {
            this.renderLine(`ls: ${args[0]}: Not a directory`, 'output-error');
            return;
        }

        if (dirObj.contents.length === 0) {
            return; // Empty directory
        }

        // Format the output with colors and icons
        const items = dirObj.contents.map(item => {
            const itemPath = `${targetPath}/${item}`.replace('//', '/');
            const itemObj = this.fileSystem[itemPath];
            
            if (itemObj && itemObj.type === 'directory') {
                return `📁 ${item}/`;
            } else {
                return `📄 ${item}`;
            }
        });

        this.renderLine(items.join('  '));
    }

    /**
     * Change directory
     */
    changeDirectory(path) {
        if (!path || path === '~') {
            this.currentPath = '/home/user';
            this.updatePath();
            return;
        }

        const targetPath = this.resolvePath(path);
        const dirObj = this.fileSystem[targetPath];

        if (!dirObj) {
            this.renderLine(`cd: ${path}: No such file or directory`, 'output-error');
            return;
        }

        if (dirObj.type !== 'directory') {
            this.renderLine(`cd: ${path}: Not a directory`, 'output-error');
            return;
        }

        this.currentPath = targetPath;
        this.updatePath();
    }

    /**
     * Resolve relative paths to absolute paths
     */
    resolvePath(path) {
        if (!path) return this.currentPath;
        
        if (path.startsWith('/')) {
            return path;
        }
        
        if (path === '..') {
            const currentObj = this.fileSystem[this.currentPath];
            return currentObj ? (currentObj.parent || this.currentPath) : this.currentPath;
        }
        
        if (path === '.') {
            return this.currentPath;
        }
        
        return `${this.currentPath}/${path}`.replace('//', '/');
    }

    /**
     * Show command history
     */
    showHistory() {
        if (this.commandHistory.length === 0) {
            this.renderLine('No commands in history');
            return;
        }

        this.renderLine('📜 Command History:');
        this.commandHistory.forEach((cmd, index) => {
            this.renderLine(`  ${(index + 1).toString().padStart(3)} ${cmd}`);
        });
    }

    /**
     * Show auto-suggestions
     */
    showSuggestions(input) {
        const matches = this.getCommandSuggestions(input);
        this.suggestions = matches;

        if (matches.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.renderSuggestions(matches);
    }

    /**
     * Get command suggestions based on input
     */
    getCommandSuggestions(input) {
        const commands = Object.keys(this.config.commands);
        return commands
            .filter(cmd => cmd.startsWith(input.toLowerCase()))
            .slice(0, 5)
            .map(cmd => ({
                command: cmd,
                description: this.config.commands[cmd].description || 'No description'
            }));
    }

    /**
     * Render suggestions dropdown
     */
    renderSuggestions(suggestions) {
        const suggestionsEl = this.elements.suggestions;
        suggestionsEl.innerHTML = '';

        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <span class="suggestion-command">${suggestion.command}</span>
                <span class="suggestion-description">${suggestion.description}</span>
            `;
            
            item.addEventListener('click', () => {
                this.selectedSuggestionIndex = index;
                this.applySuggestion();
            });

            suggestionsEl.appendChild(item);
        });

        suggestionsEl.classList.add('show');
        this.selectedSuggestionIndex = -1;
    }

    /**
     * Hide suggestions dropdown
     */
    hideSuggestions() {
        this.elements.suggestions.classList.remove('show');
        this.suggestions = [];
        this.selectedSuggestionIndex = -1;
    }

    /**
     * Navigate through suggestions
     */
    navigateSuggestions(direction) {
        const items = this.elements.suggestions.querySelectorAll('.suggestion-item');
        
        if (items.length === 0) return;

        // Remove previous selection
        if (this.selectedSuggestionIndex >= 0) {
            items[this.selectedSuggestionIndex].classList.remove('selected');
        }

        // Update index
        if (direction === 'up') {
            this.selectedSuggestionIndex = this.selectedSuggestionIndex <= 0 
                ? items.length - 1 
                : this.selectedSuggestionIndex - 1;
        } else {
            this.selectedSuggestionIndex = this.selectedSuggestionIndex >= items.length - 1 
                ? 0 
                : this.selectedSuggestionIndex + 1;
        }

        // Add new selection
        items[this.selectedSuggestionIndex].classList.add('selected');
    }

    /**
     * Apply selected suggestion
     */
    applySuggestion() {
        if (this.selectedSuggestionIndex >= 0 && this.suggestions[this.selectedSuggestionIndex]) {
            this.elements.commandInput.value = this.suggestions[this.selectedSuggestionIndex].command;
            this.hideSuggestions();
        }
    }

    /**
     * Handle tab completion
     */
    handleTabCompletion() {
        const input = this.elements.commandInput.value;
        const suggestions = this.getCommandSuggestions(input);
        
        if (suggestions.length === 1) {
            this.elements.commandInput.value = suggestions[0].command;
            this.hideSuggestions();
        } else if (suggestions.length > 1) {
            this.showSuggestions(input);
        }
    }

    /**
     * Navigate command history
     */
    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        if (direction === 'up') {
            if (this.historyIndex > 0) this.historyIndex--;
        } else {
            if (this.historyIndex < this.commandHistory.length) this.historyIndex++;
        }

        const command = this.commandHistory[this.historyIndex] || '';
        this.elements.commandInput.value = command;
        
        // Move cursor to end
        setTimeout(() => {
            const input = this.elements.commandInput;
            input.selectionStart = input.selectionEnd = input.value.length;
        }, 0);
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.currentTheme);
        this.renderLine(`🎨 Switched to ${this.currentTheme} theme`, 'output-success');
    }

    /**
     * Apply theme
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.elements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        
        // Save preference
        localStorage.setItem('terminal-theme', theme);
    }

    /**
     * Clear screen
     */
    clearScreen() {
        this.elements.terminalOutput.innerHTML = '';
    }

    /**
     * Interrupt current command (Ctrl+C simulation)
     */
    interruptCommand() {
        this.renderLine('^C', 'output-warning');
        this.elements.commandInput.value = '';
        this.hideSuggestions();
    }

    /**
     * Handle window control buttons (cosmetic)
     */
    handleWindowControl(className) {
        if (className.includes('close')) {
            this.renderLine('❌ Terminal session ended', 'output-error');
            this.elements.commandInput.disabled = true;
        } else if (className.includes('minimize')) {
            this.renderLine('⬇️ Terminal minimized (simulated)', 'output-warning');
        } else if (className.includes('maximize')) {
            this.renderLine('⬆️ Terminal maximized (simulated)', 'output-success');
        }
    }

    /**
     * Display Message of the Day
     */
    displayMotd() {
        if (!this.config.motd) return;
        this.config.motd.forEach(line => this.renderLine(line));
        
        // Add distribution switching info
        this.renderLine('');
        this.renderLine('💡 Distribution Commands:', 'output-success');
        this.renderLine('   • list-distros     - Show available distributions');
        this.renderLine('   • switch-distro    - Switch to different distribution');
        this.renderLine('   • Use dropdown in header for quick switching');
        this.renderLine(''); // Add spacing
    }

    /**
     * Render a line to the terminal output
     */
    renderLine(text, className = '') {
        const line = document.createElement('div');
        line.textContent = text;
        line.className = 'output-line';
        if (className) {
            line.classList.add(className);
        }
        this.elements.terminalOutput.appendChild(line);
        this.scrollToBottom();
    }

    /**
     * Update the prompt line
     */
    renderNewPromptLine() {
        const { user, host } = this.config.system;
        const userHomePath = `/home/${user}`;
        const pathDisplay = this.currentPath === userHomePath ? '~' : this.currentPath.replace(userHomePath, '~');
        this.elements.prompt.innerHTML = `<span class="prompt-user">${user}</span><span class="prompt-separator">@</span><span class="prompt-host">${host}</span><span class="prompt-separator">:</span><span class="prompt-path">${pathDisplay}</span><span class="prompt-symbol">$</span> `;
    }

    /**
     * Update current path display
     */
    updatePath() {
        const { user } = this.config.system;
        const userHomePath = `/home/${user}`;
        const pathDisplay = this.currentPath === userHomePath ? '~' : this.currentPath.replace(userHomePath, '~');
        this.elements.currentPath.textContent = pathDisplay;
        this.renderNewPromptLine();
    }

    /**
     * Update command count display
     */
    updateCommandCount() {
        this.elements.commandCount.textContent = `Commands: ${this.commandCount}`;
    }

    /**
     * Start uptime counter
     */
    startUptimeCounter() {
        this.updateUptime();
        this.uptimeInterval = setInterval(this.updateUptime, 1000);
    }

    /**
     * Update uptime display
     */
    updateUptime() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        let uptimeStr = '';
        if (hours > 0) uptimeStr += `${hours}h `;
        if (minutes > 0) uptimeStr += `${minutes}m `;
        uptimeStr += `${seconds}s`;
        
        this.elements.uptime.textContent = `Uptime: ${uptimeStr}`;
    }

    /**
     * Populate suggestions panel
     */
    populateSuggestionsPanel() {
        const commands = Object.entries(this.config.commands);
        this.elements.suggestionsList.innerHTML = commands
            .map(([cmd, info]) => `
                <div class="suggestion-item">
                    <span class="suggestion-command">${cmd}</span>
                    <span class="suggestion-description">${info.description || 'No description'}</span>
                </div>
            `).join('');
    }

    /**
     * Scroll terminal to bottom
     */
    scrollToBottom() {
        this.elements.terminal.scrollTop = this.elements.terminal.scrollHeight;
    }

    /**
     * Show loading message
     */
    showLoadingMessage(message) {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    /**
     * Utility: Sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // File system operations (mock)
    makeDirectory(name) {
        if (!name) {
            this.renderLine('mkdir: missing operand', 'output-error');
            return;
        }
        this.renderLine(`📁 Created directory: ${name}`, 'output-success');
    }

    createFile(name) {
        if (!name) {
            this.renderLine('touch: missing operand', 'output-error');
            return;
        }
        this.renderLine(`📄 Created file: ${name}`, 'output-success');
    }

    removeFile(name) {
        if (!name) {
            this.renderLine('rm: missing operand', 'output-error');
            return;
        }
        this.renderLine(`🗑️ Removed: ${name}`, 'output-warning');
    }
}

// Initialize terminal when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('terminal-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Create and initialize terminal
    const terminal = new WebTerminal();
    terminal.currentTheme = savedTheme;
    
    // Make terminal globally accessible for debugging
    window.terminal = terminal;
    
    await terminal.init();
});
# WebTerm - Dynamic Multi-Distribution Web Terminal

A modern, interactive web terminal emulator that dynamically loads configurations for different Linux distributions. Experience various Linux environments through a beautiful, feature-rich web interface.

## 🚀 Features

### Dynamic Distribution Support
- **Multi-Distribution Support**: Switch between Arch Linux, Ubuntu, Fedora, and Debian
- **Dynamic Configuration Loading**: Each distro loads its own commands, filesystem, and behavior
- **Easy Distro Switching**: Use commands or the dropdown in the header
- **Persistent Preferences**: Your distribution choice is remembered across sessions

### Terminal Features
- **Auto-completion**: Tab completion for commands and file paths
- **Command History**: Navigate through command history with ↑/↓ arrows
- **Theme Switching**: Toggle between light and dark themes
- **File System Simulation**: Each distro has its own simulated filesystem
- **Package Manager Simulation**: Distro-specific package management commands

### Modern UI
- **Glassmorphism Design**: Beautiful modern interface with glass effects
- **Responsive Layout**: Works on desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support
- **Realistic Terminal Feel**: Authentic Linux terminal experience

## 🐧 Supported Distributions

### Arch Linux
- **Package Manager**: `pacman` (simulated)
- **Features**: Rolling release simulation, AUR references
- **Unique Commands**: `pacman`, `systemctl`, `neofetch`

### Ubuntu
- **Package Manager**: `apt` and `snap` (simulated)
- **Features**: LTS release info, Unity/GNOME desktop references
- **Unique Commands**: `apt`, `snap`, `ubuntu-bug`, `lsb_release`

### Fedora Linux
- **Package Manager**: `dnf` and `flatpak` (simulated)
- **Features**: Latest software simulation, SELinux references
- **Unique Commands**: `dnf`, `rpm`, `firewall-cmd`, `getenforce`

### Debian GNU/Linux
- **Package Manager**: `apt` and `dpkg` (simulated)
- **Features**: Stability focus, extensive package repository
- **Unique Commands**: `apt-cache`, `dpkg`, `update-alternatives`

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/fynks/webterm.git
   cd webterm
   ```

2. **Serve the files**:
   - **Python**: `python -m http.server 8000`
   - **Node.js**: `npx serve .`
   - **PHP**: `php -S localhost:8000`

3. **Open in browser**:
   Navigate to `http://localhost:8000`

## 🎮 Usage

### Basic Commands
```bash
help                    # Show all available commands
ls                      # List files and directories
cd <directory>          # Change directory
cat <file>              # Display file contents
clear                   # Clear terminal screen
theme                   # Toggle light/dark theme
```

### Distribution Management
```bash
list-distros            # Show available distributions
switch-distro ubuntu    # Switch to Ubuntu
switch-distro fedora    # Switch to Fedora
switch-distro debian    # Switch to Debian
switch-distro arch      # Switch back to Arch Linux
```

### URL Parameters
You can specify a distribution directly in the URL:
- `?distro=ubuntu` - Load Ubuntu configuration
- `?distro=fedora` - Load Fedora configuration
- `?distro=debian` - Load Debian configuration
- `?distro=arch` - Load Arch Linux configuration

## 🔧 Configuration

### Adding New Distributions

1. **Create a configuration file**:
   ```bash
   cp config/arch_config.json config/mynewdistro_config.json
   ```

2. **Edit the configuration**:
   - Update `system` information (name, user, host, package manager)
   - Modify `filesystem` structure
   - Add distro-specific `commands`
   - Customize `motd` (Message of the Day)
   - Update `files` content

3. **Register the distribution**:
   Edit `config/distro_manager.json`:
   ```json
   {
     "distributions": {
       "mynewdistro": {
         "name": "My New Distro",
         "configFile": "config/mynewdistro_config.json",
         "icon": "🚀",
         "description": "My custom Linux distribution"
       }
     }
   }
   ```

### Configuration Structure

#### Distribution Manager (`config/distro_manager.json`)
```json
{
  "defaultDistro": "arch",
  "distributions": {
    "distro-key": {
      "name": "Display Name",
      "configFile": "path/to/config.json",
      "icon": "🐧",
      "description": "Description of the distribution"
    }
  }
}
```

#### Distribution Config (`config/*_config.json`)
```json
{
  "system": {
    "name": "Distribution Name",
    "user": "username",
    "host": "hostname",
    "commandNotFound": "bash: {cmd}: command not found",
    "packageManager": "package-manager-name"
  },
  "filesystem": {
    "~": ["file1.txt", "directory/"],
    "~/directory/": ["subfile.txt"]
  },
  "files": {
    "file1.txt": "Content of the file..."
  },
  "motd": [
    "Welcome message line 1",
    "Welcome message line 2"
  ],
  "commands": {
    "command-name": {
      "description": "Command description",
      "output": "Command output or array of lines",
      "action": "special-action-name"
    }
  }
}
```

## 🎨 Customization

### Themes
- Toggle between light and dark themes using the `theme` command
- Themes are automatically saved and restored
- Customize CSS variables in `css/style.css`

### File System
- Each distribution has its own simulated file system
- Files and directories are defined in the distribution's config file
- File contents are stored in the `files` section of the config

### Commands
- Commands can have static output or trigger special actions
- Add new commands by editing the distribution config files
- Use the `action` property for commands that need custom logic

## 🔗 API Reference

### WebTerminal Class
- `switchDistro(distroName)` - Switch to a different distribution
- `listDistros()` - Display available distributions
- `loadConfig()` - Load configuration for current distribution
- `executeCommand(command, args)` - Execute a terminal command

### Configuration Loading
The terminal automatically loads:
1. Distribution manager configuration
2. Selected distribution configuration
3. File system structure
4. Available commands
5. UI customizations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-distro`
3. Add your distribution configuration
4. Test the functionality
5. Submit a pull request

### Contributing New Distributions
We welcome contributions of new Linux distribution configurations! Please ensure:
- Accurate command outputs and behaviors
- Proper file system structure
- Distribution-specific package manager commands
- Appropriate theming and branding

## 📱 Browser Support

- **Chrome/Chromium**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile browsers**: Responsive design included

## 🐛 Known Issues

- File system operations are simulated and don't persist
- Package manager commands are simulated for demonstration
- Some complex shell features are not implemented

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Font: [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- Icons: Unicode emoji characters
- Design inspiration: Modern terminal applications
- Linux distributions: Arch Linux, Ubuntu, Fedora, Debian communities

## 🔮 Future Plans

- More Linux distributions (CentOS, openSUSE, Manjaro, etc.)
- Plugin system for custom commands
- Real-time collaboration features
- Enhanced file system persistence
- Container integration
- SSH simulation

---

**WebTerm** - Experience the power of Linux distributions in your browser! 🚀
Arch linux simulated terminal in browser

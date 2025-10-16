# Contributing to AI Video Generation App

Thank you for your interest in contributing to the AI Video Generation App! This project is open source and we welcome contributions from the community.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- API keys for video generation providers (see SETUP.md)

### Development Setup
1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/ai-video-generation-app.git
   cd ai-video-generation-app
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment variables** (see SETUP.md for details)
5. **Start the development server**:
   ```bash
   npm run dev
   ```

## 🛠️ How to Contribute

### 1. Choose What to Work On
- **Bug fixes**: Fix issues reported in the Issues tab
- **New features**: Add new video providers or improve existing functionality
- **Documentation**: Improve README, setup guides, or code comments
- **UI/UX improvements**: Enhance the user interface and experience

### 2. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Make Your Changes
- Write clean, well-commented code
- Follow the existing code style
- Add tests if applicable
- Update documentation as needed

### 4. Test Your Changes
```bash
# Run linting
npm run lint

# Run build
npm run build

# Test the application
npm run dev
```

### 5. Commit Your Changes
```bash
git add .
git commit -m "Add: Brief description of your changes"
```

### 6. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```
Then create a Pull Request on GitHub.

## 📝 Code Style Guidelines

- Use TypeScript for all new code
- Follow the existing naming conventions
- Add JSDoc comments for complex functions
- Use meaningful variable and function names
- Keep functions small and focused

## 🐛 Reporting Issues

When reporting issues, please include:
- **Description**: What happened vs what you expected
- **Steps to reproduce**: Clear steps to reproduce the issue
- **Environment**: OS, Node.js version, browser
- **Screenshots**: If applicable
- **Error messages**: Full error messages from console

## 💡 Feature Requests

We welcome feature requests! Please:
- Check existing issues first
- Describe the feature clearly
- Explain why it would be useful
- Consider if it fits the project's scope

## 🔧 Adding New Video Providers

To add a new video generation provider:

1. **Add provider configuration** in `lib/video-providers.ts`
2. **Implement generation logic** in `lib/video-provider-service.ts`
3. **Add API key handling** in `app/api/generate-video/route.ts`
4. **Update documentation** in README.md and SETUP.md
5. **Test thoroughly** with the new provider

## 📚 Documentation

Help improve documentation by:
- Fixing typos and unclear instructions
- Adding examples and use cases
- Improving setup guides
- Adding troubleshooting sections

## 🤝 Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Focus on constructive feedback
- Follow the golden rule: treat others as you'd like to be treated

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general help
- **Pull Requests**: For code contributions

## 🎉 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to open-source AI video generation! 🚀

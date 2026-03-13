# Contributing to SmartPark

Thank you for your interest in contributing to SmartPark! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Follow project conventions and standards

## Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Write/update tests
5. Commit with clear messages
6. Push to your fork
7. Create a Pull Request

## Development Setup

See [SETUP.md](SETUP.md) for detailed development environment setup.

## Code Standards

### Python Code (Backend & ML Engine)
- Follow PEP 8
- Use type hints
- Write docstrings for functions and classes
- Minimum test coverage: 80%

Example:
```python
def calculate_occupancy(occupied: int, total: int) -> float:
    """Calculate parking lot occupancy percentage.
    
    Args:
        occupied: Number of occupied spaces
        total: Total number of spaces
    
    Returns:
        Occupancy percentage (0-100)
    """
    if total == 0:
        return 0.0
    return (occupied / total) * 100
```

### JavaScript/React Native Code
- Use ES6+ syntax
- Follow React best practices
- Component names in PascalCase
- Constants in UPPER_SNAKE_CASE

## Testing Requirements

**Backend**:
```bash
cd backend
pytest tests/
pytest --cov=app tests/  # Check coverage
```

**ML Engine**:
```bash
cd ml-engine
pytest tests/
```

**Mobile App**:
```bash
cd mobile
npm test
```

## Commit Messages

Use clear, descriptive commit messages:
```
[Component] Brief description

Optional longer explanation of changes

Related to #issue_number
```

Examples:
- `[Backend] Add occupancy endpoint`
- `[ML] Improve YOLOv8 detection accuracy`
- `[Mobile] Fix occupancy statistics display`

## Pull Request Process

1. Update documentation for any new features
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

## Areas for Contribution

### Backend
- [ ] Implement remaining API endpoints
- [ ] Add WebSocket support for real-time updates
- [ ] Implement authentication/authorization
- [ ] Add database migrations

### ML Engine
- [ ] Custom YOLOv8 model training
- [ ] License plate recognition
- [ ] Multi-camera support
- [ ] Performance optimization

### Mobile App
- [ ] Parking map visualization
- [ ] Booking system UI
- [ ] Push notifications
- [ ] Offline functionality

### Documentation
- [ ] Setup guides for different platforms
- [ ] API examples and tutorials
- [ ] Architecture documentation
- [ ] User guides

## Reporting Issues

Use GitHub Issues with:
- Clear title
- Detailed description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable

## Questions?

- Check existing issues and documentation
- Create a discussion or issue
- Contact maintainers

Happy contributing! 🚗

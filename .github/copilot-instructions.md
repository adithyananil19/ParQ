# SmartPark Copilot Instructions

This file provides custom instructions for Copilot when working on the SmartPark project.

## Project Overview

SmartPark is a full-stack intelligent parking management system featuring:
- FastAPI backend with real-time data processing
- YOLOv8-based computer vision for parking detection
- React Native mobile application  
- Cloud-based occupancy tracking

## Development Guidelines

### Backend Development
- Use FastAPI for API endpoints
- Implement async/await patterns for performance
- Follow RESTful API design principles
- Include comprehensive error handling and logging
- Write unit tests for all endpoints

### ML Engine Development
- Use YOLOv8 for parking space detection
- Leverage OpenCV for image preprocessing
- Implement real-time streaming capabilities
- Include model performance benchmarks
- Document training procedures

### Mobile Development
- Use React Native with Expo for cross-platform support
- Follow mobile UX best practices
- Implement offline-first architecture where possible
- Use Redux for state management
- Optimize for performance and battery usage

### Code Standards
- Follow PEP 8 for Python code
- Use type hints throughout Python codebase
- Implement comprehensive logging
- Write descriptive commit messages
- Document all public APIs

## Project Structure Notes

Keep the three main components (backend, ml-engine, mobile) relatively independent but well-integrated through clear API contracts. Each component should have its own requirements.txt and test suite.

## Key Technologies

- **Python 3.10+** for backend and ML
- **FastAPI** for async REST API
- **YOLOv8** for object detection
- **React Native** with Expo
- **PostgreSQL** for persistent storage

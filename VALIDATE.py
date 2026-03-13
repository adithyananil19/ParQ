"""
SmartPark System Validation Script
Checks configuration, dependencies, and connectivity
"""

import sys
import json
import logging
from pathlib import Path
import subprocess

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

def check(desc: str, result: bool, details: str = ""):
    """Print check result"""
    status = f"{GREEN}✓{RESET}" if result else f"{RED}✗{RESET}"
    msg = f"{status} {desc}"
    if details:
        msg += f" {BLUE}({details}){RESET}"
    logger.info(msg)
    return result

def print_section(title: str):
    """Print section header"""
    logger.info(f"\n{BOLD}{BLUE}▶ {title}{RESET}")

def check_python_version():
    """Check Python version"""
    print_section("Python Environment")
    
    version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    result = sys.version_info >= (3, 10)
    check("Python Version", result, version)
    return result

def check_backend_dependencies():
    """Check backend Python dependencies"""
    print_section("Backend Dependencies")
    
    backend_dir = Path("backend")
    requirements_file = backend_dir / "requirements.txt"
    
    if not requirements_file.exists():
        check("requirements.txt", False, "file not found")
        return False
    
    check("requirements.txt", True)
    
    # Check key packages
    packages = ["fastapi", "uvicorn", "firebase-admin", "pydantic"]
    all_installed = True
    
    for package in packages:
        try:
            __import__(package.replace("-", "_"))
            check(f"  {package}", True)
        except ImportError:
            check(f"  {package}", False, "not installed")
            all_installed = False
    
    return all_installed

def check_ml_dependencies():
    """Check ML engine dependencies"""
    print_section("ML Engine Dependencies")
    
    packages = [
        ("torch", "PyTorch"),
        ("cv2", "OpenCV"),
        ("ultralytics", "Ultralytics YOLOv8")
    ]
    
    all_installed = True
    for import_name, display_name in packages:
        try:
            module = __import__(import_name)
            version = getattr(module, "__version__", "unknown")
            check(f"  {display_name}", True, f"v{version}")
        except ImportError:
            check(f"  {display_name}", False, "not installed")
            all_installed = False
    
    return all_installed

def check_mobile_dependencies():
    """Check mobile app dependencies"""
    print_section("Mobile App Dependencies")
    
    mobile_dir = Path("mobile")
    package_file = mobile_dir / "package.json"
    
    if not package_file.exists():
        check("package.json", False, "file not found")
        return False
    
    check("package.json", True)
    
    node_modules = mobile_dir / "node_modules"
    has_modules = node_modules.exists() and (node_modules / "react").exists()
    check("  node_modules installed", has_modules, 
          f"{'1000+' if has_modules else 'no'} packages")
    
    return has_modules

def check_firebase_setup():
    """Check Firebase configuration"""
    print_section("Firebase Configuration")
    
    service_account_file = Path("backend") / "serviceAccountKey.json"
    
    if service_account_file.exists():
        try:
            with open(service_account_file) as f:
                config = json.load(f)
            
            check("serviceAccountKey.json", True)
            project_id = config.get("project_id", "unknown")
            check(f"  Firebase Project", True, project_id)
            return True
        except Exception as e:
            check("serviceAccountKey.json", False, f"invalid JSON: {e}")
            return False
    else:
        check("serviceAccountKey.json", False, 
              "download from Firebase Console → Project Settings → Service Accounts")
        return False

def check_file_structure():
    """Check required directory structure"""
    print_section("Project Structure")
    
    required_dirs = [
        "backend",
        "backend/app",
        "ml-engine",
        "mobile",
        "mobile/src"
    ]
    
    all_exist = True
    for dir_name in required_dirs:
        exists = Path(dir_name).exists()
        check(f"  {dir_name}/", exists)
        all_exist = all_exist and exists
    
    required_files = [
        ("backend/main.py", "Backend entry point"),
        ("backend/firebase_db.py", "Firebase integration"),
        ("ml-engine/detector_v2.py", "ML detector"),
        ("ml-engine/camera_handler.py", "Camera handler"),
        ("ml-engine/integration.py", "ML-Backend integration"),
        ("mobile/App.js", "Mobile app entry"),
    ]
    
    for file_path, desc in required_files:
        exists = Path(file_path).exists()
        check(f"  {file_path}", exists, desc)
        all_exist = all_exist and exists
    
    return all_exist

def check_backend_health():
    """Check if backend can start"""
    print_section("Backend API Health")
    
    try:
        from backend.config import settings
        from backend.main import app
        
        # Check basic imports
        check("Config module", True)
        check("FastAPI app", True)
        
        # Check routes exist
        routes = len(app.routes)
        check("API routes", routes > 0, f"{routes} endpoints")
        
        return True
    except Exception as e:
        check("Backend imports", False, str(e)[:50])
        return False

def check_ml_detector():
    """Check if ML detector can initialize"""
    print_section("ML Detector")
    
    try:
        sys.path.insert(0, str(Path("ml-engine")))
        from detector_v2 import ParkingDetectorV2
        
        detector = ParkingDetectorV2()
        check("ParkingDetectorV2", True, "initialized")
        
        # Check model loaded
        check("  YOLOv8 model", hasattr(detector, 'model') and detector.model is not None)
        
        return True
    except Exception as e:
        check("ParkingDetectorV2", False, str(e)[:50])
        return False

def print_summary(results: dict):
    """Print summary of checks"""
    logger.info(f"\n{BOLD}{BLUE}▶ Summary{RESET}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    percentage = (passed / total) * 100
    
    logger.info(f"Passed {passed}/{total} checks ({percentage:.0f}%)\n")
    
    if percentage == 100:
        logger.info(f"{GREEN}{BOLD}✓ System ready! All components operational{RESET}\n")
        logger.info("Next steps:")
        logger.info("1. Create Firebase project (if not done)")
        logger.info("2. Download service account key → backend/serviceAccountKey.json")
        logger.info("3. Start backend: python backend/main.py")
        logger.info("4. Start ML engine: python ml-engine/integration.py --source 0")
        logger.info("5. Launch mobile app: cd mobile && npm start\n")
        return True
    else:
        logger.info(f"{RED}{BOLD}⚠ Some components missing{RESET}\n")
        logger.info("Missing components:")
        for name, passed in results.items():
            if not passed:
                logger.info(f"  - {name}")
        logger.info(f"\nRun '{BOLD}pip install -r requirements.txt{RESET}' in backend/ and ml-engine/\n")
        return False

def main():
    """Run all checks"""
    logger.info(f"{BOLD}{BLUE}SmartPark System Validation{RESET}\n")
    
    results = {
        "Python Environment": check_python_version(),
        "File Structure": check_file_structure(),
        "Backend Dependencies": check_backend_dependencies(),
        "ML Dependencies": check_ml_dependencies(),
        "Mobile Dependencies": check_mobile_dependencies(),
        "Firebase Configuration": check_firebase_setup(),
        "Backend Module": check_backend_health(),
        "ML Detector": check_ml_detector(),
    }
    
    success = print_summary(results)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())

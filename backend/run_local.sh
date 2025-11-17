#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Python 3 is installed
check_python() {
    print_status "Checking Python installation..."
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
        print_success "Python 3 found: $(python3 --version)"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
        print_success "Python found: $(python --version)"
    else
        print_error "Python 3 is not installed. Please install Python 3.8+ and try again."
        exit 1
    fi
}

# Check if pip is installed
check_pip() {
    print_status "Checking pip installation..."
    if command -v pip3 &> /dev/null; then
        PIP_CMD="pip3"
        print_success "pip3 found"
    elif command -v pip &> /dev/null; then
        PIP_CMD="pip"
        print_success "pip found"
    else
        print_error "pip is not installed. Please install pip and try again."
        exit 1
    fi
}

# Create or activate virtual environment
setup_venv() {
    print_status "Setting up virtual environment..."
    
    if [ -d "venv" ]; then
        print_status "Virtual environment found, activating..."
        source venv/bin/activate
        print_success "Virtual environment activated"
    else
        print_status "Creating new virtual environment..."
        $PYTHON_CMD -m venv venv
        if [ $? -eq 0 ]; then
            source venv/bin/activate
            print_success "Virtual environment created and activated"
        else
            print_error "Failed to create virtual environment"
            exit 1
        fi
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies from requirements.txt..."
    
    if [ -f "requirements.txt" ]; then
        $PIP_CMD install --upgrade pip
        $PIP_CMD install -r requirements.txt
        if [ $? -eq 0 ]; then
            print_success "Dependencies installed successfully"
        else
            print_error "Failed to install dependencies"
            exit 1
        fi
    else
        print_error "requirements.txt not found"
        exit 1
    fi
}

# Check if uvicorn is available
check_uvicorn() {
    print_status "Checking if uvicorn is available..."
    if $PYTHON_CMD -c "import uvicorn" 2>/dev/null; then
        print_success "uvicorn is available"
        return 0
    else
        print_warning "uvicorn not found, will use python main.py"
        return 1
    fi
}

# Run the application
run_app() {
    print_status "Starting FastAPI application..."
    
    if check_uvicorn; then
        print_status "Running with uvicorn..."
        $PYTHON_CMD -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    else
        print_status "Running with python main.py..."
        $PYTHON_CMD main.py
    fi
}

# Main execution
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  FastAPI Local Runner${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    
    # Check prerequisites
    check_python
    check_pip
    
    # Setup environment
    setup_venv
    install_dependencies
    
    # Run the application
    echo ""
    print_status "Starting application on http://localhost:8000"
    print_status "Press Ctrl+C to stop the application"
    echo ""
    
    run_app
}

# Handle script interruption
trap 'echo ""; print_warning "Application stopped by user"; exit 0' INT

# Run main function
main

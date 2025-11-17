#!/bin/bash

################################################################################
# Docker Management Script for ARDHI Backend
# 
# A comprehensive, platform-agnostic script for building, tagging, and running
# Docker containers with production-grade configurations.
#
# Usage:
#   ./docker.sh [command] [options]
#
# Commands:
#   build       - Build Docker image
#   run         - Run Docker container
#   stop        - Stop running container
#   restart     - Restart container
#   logs        - View container logs
#   shell       - Access container shell
#   clean       - Remove images and containers
#   compose     - Docker Compose operations
#
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="${APP_NAME:-ardhi-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"
CONTAINER_NAME="${CONTAINER_NAME:-ardhi-backend-container}"
PORT="${PORT:-8000}"
ENV_FILE="${ENV_FILE:-.env.production}"
DOCKERFILE="${DOCKERFILE:-Dockerfile.prod}"

# Detect OS
OS_TYPE="$(uname -s)"
case "$OS_TYPE" in
    Linux*) OS="Linux" ;;
    Darwin*) OS="Mac" ;;
    MINGW*|MSYS*|CYGWIN*) OS="Windows" ;;
    *) OS="UNKNOWN" ;;
esac

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}===============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===============================================${NC}"
    echo ""
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_success "Docker is installed: $(docker --version)"
}

# Check if Docker daemon is running
check_docker_daemon() {
    if ! docker ps &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    log_success "Docker daemon is running"
}

# Validate environment file
validate_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Environment file not found: $ENV_FILE"
        log_info "Using default environment variables"
    else
        log_success "Environment file loaded: $ENV_FILE"
    fi
}

################################################################################
# Build Functions
################################################################################

build_image() {
    print_header "Building Docker Image"
    
    local image_name="$APP_NAME:$IMAGE_TAG"
    if [ -n "$REGISTRY" ]; then
        image_name="$REGISTRY/$image_name"
    fi
    
    log_info "Building image: $image_name"
    log_info "Using Dockerfile: $DOCKERFILE"
    
    # Check if Dockerfile exists
    if [ ! -f "$DOCKERFILE" ]; then
        log_error "Dockerfile not found: $DOCKERFILE"
        exit 1
    fi
    
    docker build \
        -f "$DOCKERFILE" \
        -t "$image_name" \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        .
    
    log_success "Image built successfully: $image_name"
    
    # Show image info
    log_info "Image information:"
    docker images --filter "reference=$image_name" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
}

tag_image() {
    local source_tag="$1"
    local target_tag="$2"
    
    if [ -z "$source_tag" ] || [ -z "$target_tag" ]; then
        log_error "Usage: ./docker.sh tag <source-tag> <target-tag>"
        exit 1
    fi
    
    print_header "Tagging Image"
    
    local source_image="$APP_NAME:$source_tag"
    local target_image="$APP_NAME:$target_tag"
    
    if [ -n "$REGISTRY" ]; then
        source_image="$REGISTRY/$source_image"
        target_image="$REGISTRY/$target_image"
    fi
    
    log_info "Tagging $source_image as $target_image"
    docker tag "$source_image" "$target_image"
    
    log_success "Image tagged successfully"
}

push_image() {
    if [ -z "$REGISTRY" ]; then
        log_error "REGISTRY not set. Cannot push image without registry."
        exit 1
    fi
    
    print_header "Pushing Image to Registry"
    
    local image_name="$REGISTRY/$APP_NAME:$IMAGE_TAG"
    
    log_info "Pushing image: $image_name"
    docker push "$image_name"
    
    log_success "Image pushed successfully"
}

################################################################################
# Container Functions
################################################################################

run_container() {
    print_header "Running Docker Container"
    
    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_warning "Container already exists: $CONTAINER_NAME"
        log_info "Removing old container..."
        docker rm -f "$CONTAINER_NAME" || true
    fi
    
    local image_name="$APP_NAME:$IMAGE_TAG"
    if [ -n "$REGISTRY" ]; then
        image_name="$REGISTRY/$image_name"
    fi
    
    # Prepare Docker run command
    local docker_run_cmd="docker run -d"
    
    # Add container name
    docker_run_cmd="$docker_run_cmd --name $CONTAINER_NAME"
    
    # Add port mapping
    docker_run_cmd="$docker_run_cmd -p $PORT:8000"
    
    # Add environment file if it exists
    if [ -f "$ENV_FILE" ]; then
        docker_run_cmd="$docker_run_cmd --env-file $ENV_FILE"
    fi
    
    # Add volume mounts
    docker_run_cmd="$docker_run_cmd -v /app/logs:/app/logs"
    docker_run_cmd="$docker_run_cmd -v /app/secrets:/app/secrets"
    
    # Add restart policy
    docker_run_cmd="$docker_run_cmd --restart unless-stopped"
    
    # Add health check
    docker_run_cmd="$docker_run_cmd --health-cmd='curl -f http://localhost:8000/health || exit 1'"
    docker_run_cmd="$docker_run_cmd --health-interval=30s"
    docker_run_cmd="$docker_run_cmd --health-timeout=10s"
    docker_run_cmd="$docker_run_cmd --health-retries=3"
    
    # Add logging configuration
    docker_run_cmd="$docker_run_cmd --log-driver json-file"
    docker_run_cmd="$docker_run_cmd --log-opt max-size=10m"
    docker_run_cmd="$docker_run_cmd --log-opt max-file=3"
    
    # Add resource limits
    docker_run_cmd="$docker_run_cmd -m 1g"
    docker_run_cmd="$docker_run_cmd --cpus 2"
    
    # Add the image name
    docker_run_cmd="$docker_run_cmd $image_name"
    
    log_info "Starting container: $CONTAINER_NAME"
    log_info "Image: $image_name"
    log_info "Port: $PORT:8000"
    
    # Execute the docker run command
    eval "$docker_run_cmd"
    
    # Wait for container to be ready
    log_info "Waiting for container to be ready..."
    sleep 3
    
    # Check container status
    if docker ps --filter "name=$CONTAINER_NAME" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_success "Container started successfully"
        show_container_info
    else
        log_error "Failed to start container"
        show_container_logs
        exit 1
    fi
}

stop_container() {
    print_header "Stopping Docker Container"
    
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_warning "Container not found: $CONTAINER_NAME"
        return
    fi
    
    log_info "Stopping container: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME"
    log_success "Container stopped"
}

restart_container() {
    print_header "Restarting Docker Container"
    
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_warning "Container not found: $CONTAINER_NAME"
        log_info "Running container instead..."
        run_container
        return
    fi
    
    log_info "Restarting container: $CONTAINER_NAME"
    docker restart "$CONTAINER_NAME"
    
    sleep 2
    log_success "Container restarted"
    show_container_info
}

show_container_logs() {
    log_info "Fetching last 50 lines of logs..."
    docker logs --tail 50 "$CONTAINER_NAME" 2>/dev/null || log_warning "Could not fetch logs"
}

follow_container_logs() {
    print_header "Following Container Logs (Press Ctrl+C to stop)"
    docker logs -f --tail 10 "$CONTAINER_NAME"
}

show_container_info() {
    log_info "Container Status:"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

exec_container_shell() {
    print_header "Accessing Container Shell"
    
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Container not found: $CONTAINER_NAME"
        exit 1
    fi
    
    if ! docker ps --filter "name=$CONTAINER_NAME" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Container is not running"
        exit 1
    fi
    
    log_info "Accessing shell in container: $CONTAINER_NAME"
    docker exec -it "$CONTAINER_NAME" /bin/bash
}

################################################################################
# Docker Compose Functions
################################################################################

compose_up() {
    print_header "Starting Docker Compose"
    
    validate_env_file
    
    local compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"
    
    if [ ! -f "$compose_file" ]; then
        log_error "Docker Compose file not found: $compose_file"
        exit 1
    fi
    
    log_info "Using compose file: $compose_file"
    docker-compose -f "$compose_file" --env-file "$ENV_FILE" up -d
    
    sleep 3
    log_success "Docker Compose started"
    docker-compose -f "$compose_file" ps
}

compose_down() {
    print_header "Stopping Docker Compose"
    
    local compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"
    
    if [ ! -f "$compose_file" ]; then
        log_error "Docker Compose file not found: $compose_file"
        exit 1
    fi
    
    docker-compose -f "$compose_file" down
    log_success "Docker Compose stopped"
}

compose_logs() {
    local compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"
    docker-compose -f "$compose_file" logs -f --tail 50
}

################################################################################
# Cleanup Functions
################################################################################

clean_containers() {
    print_header "Cleaning Up Containers"
    
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Removing container: $CONTAINER_NAME"
        docker rm -f "$CONTAINER_NAME"
        log_success "Container removed"
    else
        log_info "No container found to remove"
    fi
}

clean_images() {
    print_header "Cleaning Up Images"
    
    local image_name="$APP_NAME:$IMAGE_TAG"
    if [ -n "$REGISTRY" ]; then
        image_name="$REGISTRY/$image_name"
    fi
    
    if docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${image_name}$"; then
        log_info "Removing image: $image_name"
        docker rmi -f "$image_name"
        log_success "Image removed"
    else
        log_info "No image found to remove"
    fi
}

clean_dangling() {
    print_header "Cleaning Dangling Resources"
    
    log_info "Removing dangling images..."
    docker image prune -f
    
    log_info "Removing dangling volumes..."
    docker volume prune -f
    
    log_success "Cleanup complete"
}

clean_all() {
    print_header "Full Cleanup"
    
    clean_containers
    clean_images
    clean_dangling
    
    log_success "Full cleanup complete"
}

################################################################################
# Utility Functions
################################################################################

show_help() {
    cat << EOF
${BLUE}========================================${NC}
${BLUE}ARDHI Backend Docker Management Script${NC}
${BLUE}========================================${NC}

${GREEN}Usage:${NC}
  ./docker.sh [command] [options]

${GREEN}Commands:${NC}

  ${YELLOW}build${NC}
    Build Docker image
    Options:
      --dockerfile FILE    Specify Dockerfile (default: Dockerfile.prod)
      --tag TAG            Image tag (default: latest)
      --registry REGISTRY  Docker registry URL

  ${YELLOW}run${NC}
    Run Docker container
    Options:
      --port PORT          Container port (default: 8000)
      --env-file FILE      Environment file (default: .env.production)
      --name NAME          Container name (default: ardhi-backend-container)

  ${YELLOW}stop${NC}
    Stop running container
    Options:
      --name NAME          Container name (default: ardhi-backend-container)

  ${YELLOW}restart${NC}
    Restart container
    Options:
      --name NAME          Container name (default: ardhi-backend-container)

  ${YELLOW}logs${NC}
    View container logs
    Options:
      --name NAME          Container name (default: ardhi-backend-container)
      --follow             Follow logs in real-time

  ${YELLOW}shell${NC}
    Access container shell (bash)
    Options:
      --name NAME          Container name (default: ardhi-backend-container)

  ${YELLOW}tag${NC}
    Tag image with new tag
    Usage: ./docker.sh tag <source-tag> <target-tag>

  ${YELLOW}push${NC}
    Push image to registry
    Requires: --registry flag

  ${YELLOW}compose${NC}
    Docker Compose operations
    Subcommands:
      up                   Start all services
      down                 Stop all services
      logs                 View compose logs

  ${YELLOW}clean${NC}
    Clean up containers and images
    Subcommands:
      containers           Remove containers only
      images               Remove images only
      dangling             Remove dangling resources
      all                  Full cleanup

  ${YELLOW}help${NC}
    Show this help message

${GREEN}Environment Variables:${NC}
  APP_NAME             Application name (default: ardhi-backend)
  IMAGE_TAG            Image tag (default: latest)
  REGISTRY             Docker registry URL
  CONTAINER_NAME       Container name (default: ardhi-backend-container)
  PORT                 Port mapping (default: 8000)
  ENV_FILE             Environment file path (default: .env.production)
  DOCKERFILE           Dockerfile path (default: Dockerfile.prod)
  COMPOSE_FILE         Docker Compose file (default: docker-compose.prod.yml)

${GREEN}Examples:${NC}
  # Build image
  ./docker.sh build

  # Build with custom tag
  ./docker.sh build --tag v1.0.0

  # Run container
  ./docker.sh run --port 8000

  # View logs
  ./docker.sh logs --follow

  # Start compose stack
  ./docker.sh compose up

  # Clean up all resources
  ./docker.sh clean all

${GREEN}Platform Support:${NC}
  Detected OS: $OS
  Supported: Linux, Mac, Windows (WSL2 recommended)

EOF
}

################################################################################
# Main Script Logic
################################################################################

main() {
    # Check prerequisites
    check_docker
    check_docker_daemon
    
    # Parse command
    local command="${1:-help}"
    
    case "$command" in
        build)
            # Parse build options
            while [[ $# -gt 1 ]]; do
                case "$2" in
                    --dockerfile) DOCKERFILE="$3"; shift 2 ;;
                    --tag) IMAGE_TAG="$3"; shift 2 ;;
                    --registry) REGISTRY="$3"; shift 2 ;;
                    *) shift ;;
                esac
            done
            build_image
            ;;
        
        run)
            # Parse run options
            while [[ $# -gt 1 ]]; do
                case "$2" in
                    --port) PORT="$3"; shift 2 ;;
                    --env-file) ENV_FILE="$3"; shift 2 ;;
                    --name) CONTAINER_NAME="$3"; shift 2 ;;
                    --tag) IMAGE_TAG="$3"; shift 2 ;;
                    *) shift ;;
                esac
            done
            validate_env_file
            run_container
            ;;
        
        stop)
            while [[ $# -gt 1 ]]; do
                case "$2" in
                    --name) CONTAINER_NAME="$3"; shift 2 ;;
                    *) shift ;;
                esac
            done
            stop_container
            ;;
        
        restart)
            while [[ $# -gt 1 ]]; do
                case "$2" in
                    --name) CONTAINER_NAME="$3"; shift 2 ;;
                    *) shift ;;
                esac
            done
            restart_container
            ;;
        
        logs)
            local follow=false
            while [[ $# -gt 1 ]]; do
                case "$2" in
                    --name) CONTAINER_NAME="$3"; shift 2 ;;
                    --follow) follow=true; shift ;;
                    *) shift ;;
                esac
            done
            
            if [ "$follow" = true ]; then
                follow_container_logs
            else
                show_container_logs
            fi
            ;;
        
        shell)
            while [[ $# -gt 1 ]]; do
                case "$2" in
                    --name) CONTAINER_NAME="$3"; shift 2 ;;
                    *) shift ;;
                esac
            done
            exec_container_shell
            ;;
        
        tag)
            tag_image "$2" "$3"
            ;;
        
        push)
            push_image
            ;;
        
        compose)
            case "$2" in
                up) compose_up ;;
                down) compose_down ;;
                logs) compose_logs ;;
                *) log_error "Unknown compose command: $2"; show_help ;;
            esac
            ;;
        
        clean)
            case "$2" in
                containers) clean_containers ;;
                images) clean_images ;;
                dangling) clean_dangling ;;
                all) clean_all ;;
                *) clean_all ;;
            esac
            ;;
        
        help|--help|-h)
            show_help
            ;;
        
        *)
            log_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"

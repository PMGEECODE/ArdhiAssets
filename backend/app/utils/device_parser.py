"""
Device parser utility - extracts device information from user agent
"""

import hashlib
import uuid
from typing import Dict, Any


def parse_device_info(user_agent: str) -> Dict[str, Any]:
    """
    Parse user agent string to extract device information
    
    Returns:
        Dictionary with device_id, device_name, device_type, browser, os, etc.
    """
    device_info = {
        "device_id": generate_device_id(user_agent),
        "device_name": extract_device_name(user_agent),
        "device_type": extract_device_type(user_agent),
        "browser": extract_browser(user_agent),
        "browser_version": extract_browser_version(user_agent),
        "os": extract_os(user_agent),
        "os_version": extract_os_version(user_agent),
    }
    return device_info


def generate_device_id(user_agent: str) -> str:
    """Generate a consistent device ID from user agent"""
    hash_obj = hashlib.sha256(user_agent.encode())
    return hash_obj.hexdigest()[:16]


def extract_device_name(user_agent: str) -> str:
    """Extract device name from user agent"""
    if "iPhone" in user_agent:
        return "iPhone"
    elif "iPad" in user_agent:
        return "iPad"
    elif "Android" in user_agent:
        return "Android Device"
    elif "Windows" in user_agent:
        return "Windows PC"
    elif "Macintosh" in user_agent:
        return "Mac"
    elif "Linux" in user_agent:
        return "Linux"
    return "Unknown Device"


def extract_device_type(user_agent: str) -> str:
    """Extract device type from user agent"""
    if any(x in user_agent for x in ["iPhone", "iPad", "Android"]):
        return "mobile"
    elif "Tablet" in user_agent or "iPad" in user_agent:
        return "tablet"
    return "desktop"


def extract_browser(user_agent: str) -> str:
    """Extract browser name from user agent"""
    if "Chrome" in user_agent and "Chromium" not in user_agent:
        return "Chrome"
    elif "Safari" in user_agent and "Chrome" not in user_agent:
        return "Safari"
    elif "Firefox" in user_agent:
        return "Firefox"
    elif "Edge" in user_agent:
        return "Edge"
    elif "Opera" in user_agent or "OPR" in user_agent:
        return "Opera"
    return "Unknown"


def extract_browser_version(user_agent: str) -> str:
    """Extract browser version from user agent"""
    parts = user_agent.split()
    for part in parts:
        if "/" in part:
            name, version = part.split("/", 1)
            if any(x in name for x in ["Chrome", "Safari", "Firefox", "Edge"]):
                return version.split()[0]
    return "Unknown"


def extract_os(user_agent: str) -> str:
    """Extract operating system from user agent"""
    if "Windows" in user_agent:
        return "Windows"
    elif "Macintosh" in user_agent:
        return "macOS"
    elif "iPhone" in user_agent or "iPad" in user_agent:
        return "iOS"
    elif "Android" in user_agent:
        return "Android"
    elif "Linux" in user_agent:
        return "Linux"
    return "Unknown"


def extract_os_version(user_agent: str) -> str:
    """Extract OS version from user agent"""
    if "Windows NT" in user_agent:
        version_map = {
            "10.0": "Windows 10/11",
            "6.3": "Windows 8.1",
            "6.2": "Windows 8",
        }
        for key, val in version_map.items():
            if key in user_agent:
                return val
    elif "Mac OS X" in user_agent:
        parts = user_agent.split("Mac OS X")[1].split(")")[0].strip()
        return f"macOS {parts.replace('_', '.')}"
    return "Unknown"

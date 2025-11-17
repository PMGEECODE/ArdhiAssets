"""
Utility module for generating secure temporary passwords
"""

import secrets
import string
from typing import Tuple

def generate_temporary_password(
    length: int = 12,
    require_uppercase: bool = True,
    require_lowercase: bool = True,
    require_digits: bool = True,
    require_special: bool = True
) -> str:
    """
    Generate a secure temporary password meeting complexity requirements.
    
    Args:
        length: Total password length (minimum 12)
        require_uppercase: Include uppercase letters (A-Z)
        require_lowercase: Include lowercase letters (a-z)
        require_digits: Include digits (0-9)
        require_special: Include special characters (!@#$%^&*)
    
    Returns:
        A randomly generated secure password
    """
    if length < 12:
        length = 12
    
    # Define character pools
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = "!@#$%^&*"  # Commonly supported special characters
    
    # Build available characters pool
    available_chars = ""
    required_chars = []
    
    if require_uppercase:
        available_chars += uppercase
        required_chars.append(secrets.choice(uppercase))
    
    if require_lowercase:
        available_chars += lowercase
        required_chars.append(secrets.choice(lowercase))
    
    if require_digits:
        available_chars += digits
        required_chars.append(secrets.choice(digits))
    
    if require_special:
        available_chars += special
        required_chars.append(secrets.choice(special))
    
    # Generate remaining characters
    remaining_length = length - len(required_chars)
    remaining_chars = [
        secrets.choice(available_chars) 
        for _ in range(remaining_length)
    ]
    
    # Combine and shuffle
    password_chars = required_chars + remaining_chars
    password = "".join(secrets.SystemRandom().sample(password_chars, len(password_chars)))
    
    return password


def generate_and_validate_password() -> Tuple[str, bool]:
    """
    Generate a password and validate it meets all complexity requirements.
    
    Returns:
        Tuple of (password, is_valid)
    """
    password = generate_temporary_password()
    
    # Validate requirements
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*" for c in password)
    has_min_length = len(password) >= 12
    
    is_valid = has_upper and has_lower and has_digit and has_special and has_min_length
    
    return password, is_valid

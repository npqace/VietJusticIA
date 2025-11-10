#!/usr/bin/env python3
"""
Quick test script to verify conversation creation logic works
Run this before deploying to save time!

Usage:
    python test_conversation_creation.py
"""

import sys
import os

# Load environment variables from root .env file
from pathlib import Path
from dotenv import load_dotenv

# Get backend directory
backend_dir = Path(__file__).parent
# Get root directory (parent of backend)
root_dir = backend_dir.parent
# Load .env from root
env_path = root_dir / '.env'

if env_path.exists():
    print(f"Loading environment from: {env_path}")
    load_dotenv(env_path)
    print(f"[OK] Loaded DATABASE_URL: {os.getenv('DATABASE_URL', 'NOT SET')[:50]}...")
else:
    print(f"[WARNING] .env file not found at {env_path}")
    print("   Script may fail if DATABASE_URL is not set")

sys.path.insert(0, str(backend_dir))

from app.database.models import ServiceRequest
from app.schemas.service_request import RequestStatus

def test_enum_comparison():
    """Test that enum comparison works correctly"""

    print("=" * 60)
    print("Testing Enum Comparison Fix")
    print("=" * 60)

    # Simulate what happens in the endpoint
    class MockUpdateData:
        def __init__(self, status):
            self.status = status

    # Test case 1: Schema enum (what comes from frontend)
    update_data = MockUpdateData(RequestStatus.ACCEPTED)

    # Test case 2: Model enum (what's in database)
    request_status = ServiceRequest.RequestStatus.PENDING

    print(f"\n1. Schema enum type: {type(update_data.status)}")
    print(f"   Value: {update_data.status}")

    print(f"\n2. Model enum type: {type(request_status)}")
    print(f"   Value: {request_status}")

    print(f"\n3. Model ACCEPTED type: {type(ServiceRequest.RequestStatus.ACCEPTED)}")
    print(f"   Value: {ServiceRequest.RequestStatus.ACCEPTED}")

    # OLD BROKEN WAY (this is what was causing the bug)
    is_accepting_old = (
        update_data.status and
        update_data.status == ServiceRequest.RequestStatus.ACCEPTED and
        request_status != ServiceRequest.RequestStatus.ACCEPTED
    )

    # ATTEMPTED FIX #1 (still broken - str() includes class name)
    is_accepting_str = (
        update_data.status and
        str(update_data.status) == "ACCEPTED" and
        request_status != ServiceRequest.RequestStatus.ACCEPTED
    )

    # NEW FIXED WAY (using .value attribute)
    is_accepting_new = (
        update_data.status and
        update_data.status.value == "ACCEPTED" and
        request_status != ServiceRequest.RequestStatus.ACCEPTED
    )

    print("\n" + "=" * 60)
    print("COMPARISON RESULTS:")
    print("=" * 60)

    print(f"\n[X] OLD (BROKEN) WAY:")
    print(f"   update_data.status == ServiceRequest.RequestStatus.ACCEPTED")
    print(f"   Result: {update_data.status == ServiceRequest.RequestStatus.ACCEPTED}")
    print(f"   is_accepting: {is_accepting_old}")
    print(f"   -> Conversation would {'BE CREATED' if is_accepting_old else 'NOT BE CREATED [X]'}")

    print(f"\n[X] ATTEMPTED FIX #1 (str() method):")
    print(f"   str(update_data.status) == 'ACCEPTED'")
    print(f"   str(update_data.status) = '{str(update_data.status)}'")
    print(f"   Result: {str(update_data.status) == 'ACCEPTED'}")
    print(f"   is_accepting: {is_accepting_str}")
    print(f"   -> Conversation would {'BE CREATED' if is_accepting_str else 'NOT BE CREATED [X]'}")
    print(f"   -> FAILS because str() returns 'RequestStatus.ACCEPTED' not 'ACCEPTED'")

    print(f"\n[OK] NEW (FIXED) WAY (.value attribute):")
    print(f"   update_data.status.value == 'ACCEPTED'")
    print(f"   update_data.status.value = '{update_data.status.value}'")
    print(f"   Result: {update_data.status.value == 'ACCEPTED'}")
    print(f"   is_accepting: {is_accepting_new}")
    print(f"   -> Conversation would {'BE CREATED [OK]' if is_accepting_new else 'NOT BE CREATED'}")

    print("\n" + "=" * 60)

    if is_accepting_new and not is_accepting_old:
        print("[OK] SUCCESS! The fix works correctly!")
        print("   Old code would NOT create conversation (bug)")
        print("   Attempted str() fix would NOT create conversation (still broken)")
        print("   New .value fix WILL create conversation (fixed)")
        return True
    else:
        print("[X] FAILURE! Something is wrong with the fix")
        return False


def test_string_comparison():
    """Test that string values match correctly"""
    print("\n" + "=" * 60)
    print("Testing String Value Comparison")
    print("=" * 60)

    schema_enum = RequestStatus.ACCEPTED
    model_enum = ServiceRequest.RequestStatus.ACCEPTED

    schema_str = str(schema_enum)
    model_str = str(model_enum)
    model_value = model_enum.value

    print(f"\nSchema enum string: '{schema_str}'")
    print(f"Model enum string: '{model_str}'")
    print(f"Model enum .value: '{model_value}'")

    print(f"\nDo the values match?")
    print(f"  schema_str == 'ACCEPTED': {schema_str == 'ACCEPTED'}")
    print(f"  model_str == 'ACCEPTED': {model_str == 'ACCEPTED'}")
    print(f"  model_value == 'ACCEPTED': {model_value == 'ACCEPTED'}")

    # Extract just the value from RequestStatus enum string
    # It might be "RequestStatus.ACCEPTED" or just "ACCEPTED"
    schema_value = schema_str.split('.')[-1] if '.' in schema_str else schema_str

    print(f"\nExtracted schema value: '{schema_value}'")
    print(f"Match: {schema_value == 'ACCEPTED'}")

    return schema_value == 'ACCEPTED'


if __name__ == "__main__":
    print("\n[TEST] CONVERSATION CREATION BUG TEST\n")

    test1_pass = test_enum_comparison()
    test2_pass = test_string_comparison()

    print("\n" + "=" * 60)
    print("FINAL RESULTS:")
    print("=" * 60)
    print(f"Enum comparison fix: {'[PASS]' if test1_pass else '[FAIL]'}")
    print(f"String comparison: {'[PASS]' if test2_pass else '[FAIL]'}")

    if test1_pass and test2_pass:
        print("\n[SUCCESS] All tests passed! Safe to deploy.")
        sys.exit(0)
    else:
        print("\n[WARNING] Some tests failed. DO NOT deploy yet!")
        sys.exit(1)

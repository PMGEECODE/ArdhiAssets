
from app.core.id_generator import generate_custom_device_id


def test_device_id_format():
    id_ = generate_custom_device_id()
    assert id_.startswith("DEV_")
    assert len(id_) == 3 + 1 + 12  # DEV_ + 12 chars
    assert id_[4:].isalnum()
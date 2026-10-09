"""Intent detection for chat messages"""

import re
from typing import Dict, Any

async def detect_intent(message: str) -> str:
    """Simple intent detection based on message content"""
    
    message_lower = message.lower()
    
    # Keywords for helpdesk queries
    helpdesk_keywords = [
        'wifi', 'jaringan', 'internet', 'koneksi', 'access point',
        'printer', 'server', 'switch', 'gateway', 'perangkat',
        'masalah', 'error', 'tidak bisa', 'bisa', 'connect', 'offline',
        'online', 'reset', 'ubah', 'configurasi', 'setting'
    ]
    
    # Keywords for task creation
    task_keywords = [
        'buat', 'bikin', 'tiket', 'lapor', 'report', 'issue', 'problem',
        'bantuan', 'tolong', 'request', 'permintaan'
    ]
    
    # Keywords for general questions
    general_keywords = [
        'apa', 'bagaimana', 'kenapa', 'kapan', 'dimana', 'siapa',
        'informasi', 'tentang', 'halo', 'hai', 'selamat', 'terima kasih'
    ]
    
    # Check for helpdesk intent
    if any(keyword in message_lower for keyword in helpdesk_keywords):
        return "helpdesk_query"
    
    # Check for task creation intent
    if any(keyword in message_lower for keyword in task_keywords):
        return "create_task"
    
    # Check for general questions
    if any(keyword in message_lower for keyword in general_keywords):
        return "general_question"
    
    # Default to other
    return "other"
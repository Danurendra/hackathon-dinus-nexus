from pydantic_settings import BaseSettings
from typing import Optional

class LLMSettings(BaseSettings):
    base_url: str
    api_key: str
    model: str
    
    class Config:
        env_file = ".env"

class Settings(BaseSettings):
    llm: LLMSettings
    
    class Config:
        env_file = ".env"
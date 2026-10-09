from pydantic import ConfigDict
from pydantic_settings import BaseSettings

class LLMSettings(BaseSettings):
    base_url: str
    api_key: str
    model: str

    model_config = ConfigDict(extra="ignore")

class Settings(BaseSettings):
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "qwen3-coder-flash"
    llm_fallback_enabled: bool = True
    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: str = ""
    openai_model: str = "gpt-5-nano"

    model_config = ConfigDict(env_file=".env", extra="ignore")

    @property
    def llm(self) -> LLMSettings:
        return LLMSettings(
            base_url=self.llm_base_url,
            api_key=self.llm_api_key,
            model=self.llm_model,
        )

    @property
    def openai(self) -> LLMSettings:
        return LLMSettings(
            base_url=self.openai_base_url,
            api_key=self.openai_api_key,
            model=self.openai_model,
        )
from src.config.settings import Settings


def test_openai_provider_can_be_selected(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5-nano")

    settings = Settings(_env_file=None)

    assert settings.llm_provider == "openai"
    assert settings.openai.model == "gpt-5-nano"

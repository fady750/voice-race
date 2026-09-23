# Optional Azure Speech provider

The game uses the local Arabic pronunciation evaluator by default and does not require Azure. The Azure provider and Vite proxy remain available only for optional provider experiments.

The browser never receives the Azure key. When the optional provider is used, audio is sent to `/api/pronunciation-assessment` and the Vite server proxies it to Azure.

Copy `.env.example` to `.env.local` and add real values:

```text
AZURE_SPEECH_KEY=your-key
AZURE_SPEECH_REGION=your-region
```

Restart the Vite development server after changing `.env.local` because environment values are read when Vite starts.

Do **not** use `VITE_AZURE_SPEECH_KEY`. Vite exposes every variable beginning with `VITE_` to browser JavaScript, which would disclose the Azure secret. `VITE_PRONUNCIATION_API_PATH` is safe because it contains only the proxy path.

For production, implement the same authenticated `/api/pronunciation-assessment` endpoint in the deployment backend. The Vite proxy exists only for local development and does not make a static frontend deployment secure.

The normal game flow does not contact this endpoint, so missing Azure credentials do not affect gameplay.

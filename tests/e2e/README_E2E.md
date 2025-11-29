# E2E / BDD Tests (Playwright + Behave)

## Install
```
pip install -r tests/requirements.txt
playwright install
```

## How to run
- Smoke (tagged `@smoke`):  
  `behave --tags=@smoke`

- Full regression:  
  `behave`

- Single feature:  
  `behave tests/e2e/features/login.feature`

## Base URL / credentials
Set environment variables before running:
```
export E2E_BASE_URL=http://localhost:3000
export E2E_USER=test
export E2E_PASS=test@corbi
```

## Structure
- `features/` – Gherkin `.feature` files (PO-owned)
- `steps/` – Python glue using Playwright sync API
- `environment.py` – Playwright lifecycle (one browser per run, new page per scenario)

## Notes
- Use stable selectors (ids/data-testid) to keep steps readable and maintainable.
- Each scenario gets a fresh page; the browser is reused for speed.
- Keep Given/When/Then language business-friendly; extend step defs when new phrases are needed.



how to run : 

cd "D:\WS\AI autogenerate\OSAConnect\osaconnect\tests\e2e"
$env:E2E_BASE_URL="http://localhost:3000"
$env:E2E_USER="test"
$env:E2E_PASS="test@corbi"
behave --tags=@smoke


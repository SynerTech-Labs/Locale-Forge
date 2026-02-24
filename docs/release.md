# Release and Deployment

## CI Pipeline

File: `.github/workflows/ci-release.yml`

Trigger:

- Push to `main`

Jobs:

1. `build_test_package`
   - `npm ci`
   - `npm run lint`
   - `npm run compile`
   - `npm run test`
   - `npm run package:vsix`
   - Upload generated `.vsix` artifact
2. `publish_marketplace`
   - Runs only if `VSCE_PAT` secret exists
   - Checks whether `publisher.name@version` already exists in Marketplace
   - Skips publish if version already exists
   - Publishes the packaged `.vsix` with `vsce publish --packagePath`

## Required Secret

- `VSCE_PAT`: Personal Access Token for Visual Studio Marketplace.

## Local Release Commands

```bash
npm run lint
npm run test
npm run package:vsix
npx @vscode/vsce publish -p "$VSCE_PAT"
```


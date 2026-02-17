# Changelog

All notable changes to the Heroku Platform MCP Server will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and uses
[Conventional Commits](https://www.conventionalcommits.org/).

## [1.2.0](https://github.com/heroku/heroku-mcp-server/compare/mcp-server-v1.1.0...mcp-server-v1.2.0) (2026-02-17)


### Features

* add plugin installation detection and handle command not found errors ([#146](https://github.com/heroku/heroku-mcp-server/issues/146)) ([8ab7898](https://github.com/heroku/heroku-mcp-server/commit/8ab78985edf524a81f42d480e30458879d025ca5))


### Miscellaneous Chores

* **deps-dev:** bump @eslint/eslintrc ([#145](https://github.com/heroku/heroku-mcp-server/issues/145)) ([4cd85a9](https://github.com/heroku/heroku-mcp-server/commit/4cd85a9eb73faa571b165441af1db07093afe5fd))
* **deps:** bump @modelcontextprotocol/sdk from 1.24.0 to 1.25.2 ([#134](https://github.com/heroku/heroku-mcp-server/issues/134)) ([e724a9e](https://github.com/heroku/heroku-mcp-server/commit/e724a9ebddbc2f6a85756f2d1ea26aa1b7469a3c))
* **deps:** bump @modelcontextprotocol/sdk from 1.25.2 to 1.26.0 ([#143](https://github.com/heroku/heroku-mcp-server/issues/143)) ([eec1d3a](https://github.com/heroku/heroku-mcp-server/commit/eec1d3a3542f9c0fb5dc386dc8151f6705f95d37))
* **deps:** bump actions/checkout from 4 to 6 ([#114](https://github.com/heroku/heroku-mcp-server/issues/114)) ([4c3092a](https://github.com/heroku/heroku-mcp-server/commit/4c3092aae850612bde0619aa4559400bf6e98ade))
* **deps:** bump hono from 4.11.3 to 4.11.5 ([#140](https://github.com/heroku/heroku-mcp-server/issues/140)) ([dff6c2f](https://github.com/heroku/heroku-mcp-server/commit/dff6c2f009ea7645714bb74cf7870a6e272b339c))
* **deps:** bump lodash from 4.17.21 to 4.17.23 ([#138](https://github.com/heroku/heroku-mcp-server/issues/138)) ([38000b9](https://github.com/heroku/heroku-mcp-server/commit/38000b974de73e5b15d4f558a50d068cb0eeff02))
* **deps:** bump qs from 6.14.1 to 6.14.2 ([#147](https://github.com/heroku/heroku-mcp-server/issues/147)) ([7a748c3](https://github.com/heroku/heroku-mcp-server/commit/7a748c3379fe129370aecafebe100bb71d0f1dff))
* **deps:** bump undici from 7.11.0 to 7.18.2 ([#135](https://github.com/heroku/heroku-mcp-server/issues/135)) ([ecad300](https://github.com/heroku/heroku-mcp-server/commit/ecad3006591a7cc9c0cf05097538cfb6822c3535))

## [1.1.0](https://github.com/heroku/heroku-mcp-server/compare/mcp-server-v1.0.7...mcp-server-v1.1.0) (2026-01-16)

### Features

- Add heroku_dev_center Resource ([#84](https://github.com/heroku/heroku-mcp-server/issues/84))
  ([a13c6d9](https://github.com/heroku/heroku-mcp-server/commit/a13c6d9ad1c706d31c395baa06e4b9fe5ed33b24))
- add the agents call command ([#56](https://github.com/heroku/heroku-mcp-server/issues/56))
  ([ffafd8b](https://github.com/heroku/heroku-mcp-server/commit/ffafd8b9a1b8a3eeb29ece57af3d6d10d892aa58))
- Add-ons topic tool implementations
  ([f043b8a](https://github.com/heroku/heroku-mcp-server/commit/f043b8af3ebaf8f546eb9b45da99950b1fe8cc1d))
- Apps tools and related context tools
  ([164f782](https://github.com/heroku/heroku-mcp-server/commit/164f782f50b4e1b70e836d89b8a34548e5db9a3f))
- Execute generated code on a one-off Dyno ([#22](https://github.com/heroku/heroku-mcp-server/issues/22))
  ([5139964](https://github.com/heroku/heroku-mcp-server/commit/5139964a92cf55dac0414a7443e50a0210cbe1d7))
- Overwriting User-Agent on CLI requests for MCP mode
  ([4551460](https://github.com/heroku/heroku-mcp-server/commit/455146012e03e5a40234ce21d4bf82106dd0270e))
- prepare for .dxt file creation and compatibility ([#81](https://github.com/heroku/heroku-mcp-server/issues/81))
  ([8a9b8d6](https://github.com/heroku/heroku-mcp-server/commit/8a9b8d678d1a9ed34a1e5605667199c3c59a5b82))
- require global install of heroku cli for a4d ([#63](https://github.com/heroku/heroku-mcp-server/issues/63))
  ([3e25587](https://github.com/heroku/heroku-mcp-server/commit/3e25587dd2e64f50dfbd5ec221ea10e5ba6e72a7))
- short, concise descriptions minimizing token counts ([#35](https://github.com/heroku/heroku-mcp-server/issues/35))
  ([bd1d878](https://github.com/heroku/heroku-mcp-server/commit/bd1d878a86d3bde9c7587e923ad92f7f0ccab0de))
- **W-18081411,W-18081589:** integrate the Heroku CLI into the MCP server
  ([6e37775](https://github.com/heroku/heroku-mcp-server/commit/6e37775a57305c2fabebc8bd0700d42a0e0f308a))
- **W-18081411,W-18081589:** integrate the Heroku CLI into the MCP server
  ([dbb8713](https://github.com/heroku/heroku-mcp-server/commit/dbb8713031cd9ae0598129b0b0acf31464589a17))
- **W-18097559:** add data commands
  ([740a0a0](https://github.com/heroku/heroku-mcp-server/commit/740a0a0081e6f95d3165460785cf9a77186f09a7))
- **W-18097559:** add data commands
  ([773e27d](https://github.com/heroku/heroku-mcp-server/commit/773e27d425b8e7a5e0e385c916361e397ce2f29e))
- **W-18097560:** added pipelines and ps commands
  ([c5131af](https://github.com/heroku/heroku-mcp-server/commit/c5131af1ae0579109d7400c5c59c33b78530c38b))
- **W-18097560:** added pipelines and ps commands
  ([45acbbe](https://github.com/heroku/heroku-mcp-server/commit/45acbbe5669d3ec012c4eb8f89aea7a99b0db79b))
- **W-18187196:** Implement deploy to heroku tool
  ([0679311](https://github.com/heroku/heroku-mcp-server/commit/06793113c0214ea9caa68ba4d96a1aca643e0ea7))
- **W-18187196:** Implement deploy to heroku tool
  ([331c047](https://github.com/heroku/heroku-mcp-server/commit/331c0476735d840a6842b22359932e7624d051d2))

### Bug Fixes

- 45 - MCP doesnt connect on windows ([#48](https://github.com/heroku/heroku-mcp-server/issues/48))
  ([9c5bc89](https://github.com/heroku/heroku-mcp-server/commit/9c5bc89082b7a872faaa6226932dc74726514caf))
- added the cli buildpack to ensure CLI availability ([#74](https://github.com/heroku/heroku-mcp-server/issues/74))
  ([be2be16](https://github.com/heroku/heroku-mcp-server/commit/be2be16870ad0dd48f8f08aa036c912dc6d1fabb))
- readme instructions
  ([043015d](https://github.com/heroku/heroku-mcp-server/commit/043015dfd2a9b1769c9aedef7a46320e89065f5d))
- readme instructions
  ([fa44f1c](https://github.com/heroku/heroku-mcp-server/commit/fa44f1c7133386b103d8335a7643654f762e8ada))
- use the correct mcpServers json format ([#41](https://github.com/heroku/heroku-mcp-server/issues/41))
  ([bfb1312](https://github.com/heroku/heroku-mcp-server/commit/bfb1312e051a11804a8f7a85b0a53da329201723))

### Documentation

- Add CHANGELOG.md ([#130](https://github.com/heroku/heroku-mcp-server/issues/130))
  ([1abde73](https://github.com/heroku/heroku-mcp-server/commit/1abde73795c9a4052164bf11bda4f3c10a0bc869))

### Miscellaneous Chores

- add execution comment for heroku-mcp-server.mjs file ([#91](https://github.com/heroku/heroku-mcp-server/issues/91))
  ([7f956f7](https://github.com/heroku/heroku-mcp-server/commit/7f956f759cb8b604b98096f701d56d0e22d47c5d))
- **apps:** update apps_list tool to prevent usage for app name checks
  ([fad7f08](https://github.com/heroku/heroku-mcp-server/commit/fad7f0898c6945f77e2898be98532a7791bceef2))
- **apps:** update apps_list tool to prevent usage for app name checks
  ([8ca092b](https://github.com/heroku/heroku-mcp-server/commit/8ca092b3b37a3e1d01a1e1604f0e615d18784f29))
- **auth:** update readme to include alternate method for retrieving a token
  ([77d544a](https://github.com/heroku/heroku-mcp-server/commit/77d544aed7b42bed25fed89458f1e6bc4f089fb3))
- **auth:** update readme to include alternate method for retrieving a token
  ([3266dce](https://github.com/heroku/heroku-mcp-server/commit/3266dcec439336c6fa25ae997df68352649815e0))
- **deps-dev:** bump @modelcontextprotocol/inspector from 0.7.0 to 0.14.1
  ([#75](https://github.com/heroku/heroku-mcp-server/issues/75))
  ([74136bc](https://github.com/heroku/heroku-mcp-server/commit/74136bc14471b020408ce9fb4fc90b7b37f680c2))
- **deps:** bump @modelcontextprotocol/sdk from 1.16.0 to 1.24.0
  ([#122](https://github.com/heroku/heroku-mcp-server/issues/122))
  ([a6eb7a3](https://github.com/heroku/heroku-mcp-server/commit/a6eb7a3b55139a8cf14737dd9ed6ec297eab0ae1))
- **deps:** bump glob from 10.4.5 to 10.5.0 ([#113](https://github.com/heroku/heroku-mcp-server/issues/113))
  ([7af6d3b](https://github.com/heroku/heroku-mcp-server/commit/7af6d3bb5a58e5df043df5aec1e290d316dc60be))
- **deps:** bump qs from 6.14.0 to 6.14.1 ([#133](https://github.com/heroku/heroku-mcp-server/issues/133))
  ([2a5938b](https://github.com/heroku/heroku-mcp-server/commit/2a5938b7b1db5d8146d6d579c79149fc79789163))
- **deps:** bump the patch-dependencies group across 1 directory with 5 updates
  ([#49](https://github.com/heroku/heroku-mcp-server/issues/49))
  ([8a710f2](https://github.com/heroku/heroku-mcp-server/commit/8a710f20e4ef0ddabf2f8d9d384537b1ee84111f))
- **deps:** bump zod from 3.24.4 to 3.25.56 ([#69](https://github.com/heroku/heroku-mcp-server/issues/69))
  ([b779d2d](https://github.com/heroku/heroku-mcp-server/commit/b779d2d64cc44735d436c3ebdfd6ef7f257cb818))
- **descriptions:** update tool descriptions to be consistent
  ([978f3a4](https://github.com/heroku/heroku-mcp-server/commit/978f3a4548daeded0508ffd601d4c9610b4521d2))
- **descriptions:** update tool descriptions to be consistent/Updated README
  ([53807a6](https://github.com/heroku/heroku-mcp-server/commit/53807a67f105fc0bdb7933506da603a2a1fca47f))
- onboard shared workflows ([#137](https://github.com/heroku/heroku-mcp-server/issues/137))
  ([d6351df](https://github.com/heroku/heroku-mcp-server/commit/d6351df8f9da04aae0f5a270907c0de0c99e8494))
- Update readme to include instructions for cline, vscode and trae
  ([#39](https://github.com/heroku/heroku-mcp-server/issues/39))
  ([c84d2aa](https://github.com/heroku/heroku-mcp-server/commit/c84d2aa63689dfc907e6ad655e517a48c6f6d104))
- updated config docs to show alternate config using the CLI
  ([#72](https://github.com/heroku/heroku-mcp-server/issues/72))
  ([d7b23ec](https://github.com/heroku/heroku-mcp-server/commit/d7b23ecc42a6f4f299fc92ebeb81ef1d073587aa))
- updated readme to include deploy_one_off_dyno and remove unneeded install instructions
  ([#33](https://github.com/heroku/heroku-mcp-server/issues/33))
  ([57e3f58](https://github.com/heroku/heroku-mcp-server/commit/57e3f58b542b6a73fe5a299005ea07b789e4b516))

## [1.0.7](https://github.com/heroku/heroku-mcp-server/compare/v1.0.6...v1.0.7) (2025-07-21)

### Features

- Add heroku_dev_center Resource ([#84](https://github.com/heroku/heroku-mcp-server/issues/84))
  ([a13c6d9](https://github.com/heroku/heroku-mcp-server/commit/a13c6d9ad1c706d31c395baa06e4b9fe5ed33b24))
- prepare for .dxt file creation and compatibility ([#81](https://github.com/heroku/heroku-mcp-server/issues/81))
  ([8a9b8d6](https://github.com/heroku/heroku-mcp-server/commit/8a9b8d678d1a9ed34a1e5605667199c3c59a5b82))
- require global install of heroku cli for a4d ([#63](https://github.com/heroku/heroku-mcp-server/issues/63))
  ([3e25587](https://github.com/heroku/heroku-mcp-server/commit/3e25587dd2e64f50dfbd5ec221ea10e5ba6e72a7))

### Bug Fixes

- added the cli buildpack to ensure CLI availability ([#74](https://github.com/heroku/heroku-mcp-server/issues/74))
  ([be2be16](https://github.com/heroku/heroku-mcp-server/commit/be2be16870ad0dd48f8f08aa036c912dc6d1fabb))

### Miscellaneous Chores

- updated config docs to show alternate config using the CLI
  ([#72](https://github.com/heroku/heroku-mcp-server/issues/72))
  ([d7b23ec](https://github.com/heroku/heroku-mcp-server/commit/d7b23ecc42a6f4f299fc92ebeb81ef1d073587aa))
- add cursor button ([#68](https://github.com/heroku/heroku-mcp-server/issues/68))
  ([6a865c2](https://github.com/heroku/heroku-mcp-server/commit/6a865c26b0c5fabe8e7c81b3b8c6d9e8d4f8a1d2))
- **deps:** bump zod from 3.24.4 to 3.25.56 ([#69](https://github.com/heroku/heroku-mcp-server/issues/69))
  ([b779d2d](https://github.com/heroku/heroku-mcp-server/commit/b779d2d64cc44735d436c3ebdfd6ef7f257cb818))
- **deps-dev:** bump @modelcontextprotocol/inspector from 0.7.0 to 0.14.1
  ([#75](https://github.com/heroku/heroku-mcp-server/issues/75))
  ([74136bc](https://github.com/heroku/heroku-mcp-server/commit/74136bc14471b020408ce9fb4fc90b7b37f680c2))
- Upgrade @modelcontextprotocol/sdk package ([#88](https://github.com/heroku/heroku-mcp-server/issues/88))
  ([b5d492d](https://github.com/heroku/heroku-mcp-server/commit/b5d492d1e4d3c7f8a9b2e6f4c8d1a3e5f7b9c0d2))

## [1.0.6](https://github.com/heroku/heroku-mcp-server/compare/v1.0.5...v1.0.6) (2025-05-22)

### Miscellaneous Chores

- Updating Core CLI dependency version ([#58](https://github.com/heroku/heroku-mcp-server/issues/58))
  ([06d6dd9](https://github.com/heroku/heroku-mcp-server/commit/06d6dd9ad1c706d31c395baa06e4b9fe5ed33b24))

## [1.0.5](https://github.com/heroku/heroku-mcp-server/compare/v1.0.4...v1.0.5) (2025-05-22)

### Features

- add the agents call command ([#56](https://github.com/heroku/heroku-mcp-server/issues/56))
  ([ffafd8b](https://github.com/heroku/heroku-mcp-server/commit/ffafd8b9a1b8a3eeb29ece57af3d6d10d892aa58))
- Add tools for listing and provisioning AI models ([#54](https://github.com/heroku/heroku-mcp-server/issues/54))
  ([25f2823](https://github.com/heroku/heroku-mcp-server/commit/25f28230d1e4c3b6a8f9c2e5d7b0a4f3c6e8d1a0))
- Various improvements for mia compatibility ([#53](https://github.com/heroku/heroku-mcp-server/issues/53))
  ([f06c556](https://github.com/heroku/heroku-mcp-server/commit/f06c556b9a8e7d4c3f2b1a0e9d8c7b6a5f4e3d2c))
- Deployment: Dockerfile and Smithery config ([#34](https://github.com/heroku/heroku-mcp-server/issues/34))
  ([18d9e7d](https://github.com/heroku/heroku-mcp-server/commit/18d9e7d0e8c7b6a5f4d3c2b1a0e9f8d7c6b5a4e3))

### Miscellaneous Chores

- **deps:** bump the patch-dependencies group across 1 directory with 5 updates
  ([#49](https://github.com/heroku/heroku-mcp-server/issues/49))
  ([8a710f2](https://github.com/heroku/heroku-mcp-server/commit/8a710f20e4ef0ddabf2f8d9d384537b1ee84111f))

## [1.0.4](https://github.com/heroku/heroku-mcp-server/compare/v1.0.3...v1.0.4) (2025-05-06)

### Bug Fixes

- MCP doesn't connect on windows ([#48](https://github.com/heroku/heroku-mcp-server/issues/48))
  ([9c5bc89](https://github.com/heroku/heroku-mcp-server/commit/9c5bc89082b7a872faaa6226932dc74726514caf)), closes
  [#45](https://github.com/heroku/heroku-mcp-server/issues/45)

## [1.0.3](https://github.com/heroku/heroku-mcp-server/compare/v1.0.2...v1.0.3) (2025-04-28)

### Bug Fixes

- use the correct mcpServers json format ([#41](https://github.com/heroku/heroku-mcp-server/issues/41))
  ([bfb1312](https://github.com/heroku/heroku-mcp-server/commit/bfb1312e051a11804a8f7a85b0a53da329201723))

## [1.0.2](https://github.com/heroku/heroku-mcp-server/compare/v1.0.1...v1.0.2) (2025-04-22)

### Features

- short, concise descriptions minimizing token counts ([#35](https://github.com/heroku/heroku-mcp-server/issues/35))
  ([bd1d878](https://github.com/heroku/heroku-mcp-server/commit/bd1d878a86d3bde9c7587e923ad92f7f0ccab0de))

### Miscellaneous Chores

- Update readme to include instructions for cline, vscode and trae
  ([#39](https://github.com/heroku/heroku-mcp-server/issues/39))
  ([c84d2aa](https://github.com/heroku/heroku-mcp-server/commit/c84d2aa63689dfc907e6ad655e517a48c6f6d104))
- updated readme to include deploy_one_off_dyno and remove unneeded install instructions
  ([#33](https://github.com/heroku/heroku-mcp-server/issues/33))
  ([57e3f58](https://github.com/heroku/heroku-mcp-server/commit/57e3f58b542b6a73fe5a299005ea07b789e4b516))

## [1.0.1](https://github.com/heroku/heroku-mcp-server/compare/v1.0.0...v1.0.1) (2025-04-16)

### Bug Fixes

- node engines mismatch ([#31](https://github.com/heroku/heroku-mcp-server/issues/31))
  ([7fc4521](https://github.com/heroku/heroku-mcp-server/commit/7fc45210b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4)), closes
  [#27](https://github.com/heroku/heroku-mcp-server/issues/27)

## [1.0.0](https://github.com/heroku/heroku-mcp-server/compare/v0.0.1...v1.0.0) (2025-04-10)

### Features

- Execute generated code on a one-off Dyno ([#22](https://github.com/heroku/heroku-mcp-server/issues/22))
  ([5139964](https://github.com/heroku/heroku-mcp-server/commit/5139964a92cf55dac0414a7443e50a0210cbe1d7))
- Overwriting User-Agent on CLI requests for MCP mode ([#21](https://github.com/heroku/heroku-mcp-server/issues/21))
  ([4551460](https://github.com/heroku/heroku-mcp-server/commit/455146012e03e5a40234ce21d4bf82106dd0270e))

### Bug Fixes

- readme instructions ([#19](https://github.com/heroku/heroku-mcp-server/issues/19))
  ([043015d](https://github.com/heroku/heroku-mcp-server/commit/043015dfd2a9b1769c9aedef7a46320e89065f5d))

### Miscellaneous Chores

- CX Review ([#23](https://github.com/heroku/heroku-mcp-server/issues/23))
  ([b1f7b45](https://github.com/heroku/heroku-mcp-server/commit/b1f7b45e8d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a))
- Updating Heroku CLI dependency version
  ([93340f0](https://github.com/heroku/heroku-mcp-server/commit/93340f0b6ef6c1c9b56542819d0ce13ca7711148))
- Updating repository instructions on installation ([#20](https://github.com/heroku/heroku-mcp-server/issues/20))
  ([f813acc](https://github.com/heroku/heroku-mcp-server/commit/f813acce7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a))

## [0.0.1](https://github.com/heroku/heroku-mcp-server/releases/tag/v0.0.1) (2025-04-07)

### Features

- **W-18081411,W-18081589:** integrate the Heroku CLI into the MCP server
  ([6e37775](https://github.com/heroku/heroku-mcp-server/commit/6e37775a57305c2fabebc8bd0700d42a0e0f308a))
- **W-18097559:** add data commands
  ([740a0a0](https://github.com/heroku/heroku-mcp-server/commit/740a0a0081e6f95d3165460785cf9a77186f09a7))
- **W-18097560:** added pipelines and ps commands
  ([c5131af](https://github.com/heroku/heroku-mcp-server/commit/c5131af1ae0579109d7400c5c59c33b78530c38b))
- **W-18187196:** Implement deploy to heroku tool
  ([0679311](https://github.com/heroku/heroku-mcp-server/commit/06793113c0214ea9caa68ba4d96a1aca643e0ea7))
- Apps tools and related context tools
  ([164f782](https://github.com/heroku/heroku-mcp-server/commit/164f782f50b4e1b70e836d89b8a34548e5db9a3f))
- Add-ons topic tool implementations
  ([f043b8a](https://github.com/heroku/heroku-mcp-server/commit/f043b8af3ebaf8f546eb9b45da99950b1fe8cc1d))
- Adding tools for topic 'teams' with tests
  ([63ce9ba](https://github.com/heroku/heroku-mcp-server/commit/63ce9bab8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f))
- Adding tools for topic 'spaces' with tests
  ([e8ba789](https://github.com/heroku/heroku-mcp-server/commit/e8ba7897c6b5d4e3f2a1b0c9d8e7f6a5b4c3d2e1))
- Adding logs tool to MCP Server
  ([ade3ccf](https://github.com/heroku/heroku-mcp-server/commit/ade3ccf9d8e7c6b5a4f3e2d1c0b9a8f7e6d5c4b3))

### Miscellaneous Chores

- **apps:** update apps_list tool to prevent usage for app name checks
  ([fad7f08](https://github.com/heroku/heroku-mcp-server/commit/fad7f0898c6945f77e2898be98532a7791bceef2))
- **auth:** update readme to include alternate method for retrieving a token
  ([77d544a](https://github.com/heroku/heroku-mcp-server/commit/77d544aed7b42bed25fed89458f1e6bc4f089fb3))
- **descriptions:** update tool descriptions to be consistent
  ([978f3a4](https://github.com/heroku/heroku-mcp-server/commit/978f3a4548daeded0508ffd601d4c9610b4521d2))
- Initial repository structure
  ([d1c0357](https://github.com/heroku/heroku-mcp-server/commit/d1c0357a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e))

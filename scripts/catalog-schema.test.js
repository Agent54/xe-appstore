import { jsonSchemaToType } from '@ark/json-schema'
import { strict as assert } from 'node:assert'

const root = new URL('../', import.meta.url)
const schema = JSON.parse(
  await Deno.readTextFile(new URL('catalog.schema.json', root)),
)
const serviceType = jsonSchemaToType(schema)
const readService = async (path) =>
  JSON.parse(await Deno.readTextFile(new URL(path, root)))

Deno.test('the published services satisfy the JSON Schema through ArkType', async () => {
  for (
    const path of [
      'catalog/demo/welcome-to-docker.json',
      'catalog/design/excalidraw.json',
      'catalog/development/darc-code.json',
      'catalog/development/darc-dev.json',
    ]
  ) {
    assert.equal(
      serviceType.assert(await readService(path)).id,
      path.split('/').at(-1).replace('.json', ''),
    )
  }
})

Deno.test('the schema rejects malformed web and repository entries', async () => {
  const web = await readService('catalog/design/excalidraw.json')
  const repo = await readService('catalog/development/darc-code.json')
  for (
    const invalid of [
      { ...web, type: 'unknown' },
      { ...web, url: 'javascript:alert(1)' },
      { ...web, iconUrl: 'assets/../secret.png' },
      { ...web, category: 'ignored' },
      { ...repo, githubUrl: 'https://example.com/repo' },
      { ...repo, branch: 5 },
      { ...repo, path: '../docker-compose.yaml' },
      { ...repo, pathType: 'unknown' },
    ]
  ) {
    assert.throws(() => serviceType.assert(invalid))
  }
})

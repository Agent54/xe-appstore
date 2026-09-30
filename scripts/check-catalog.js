import { jsonSchemaToType } from '@ark/json-schema'

const root = new URL('../', import.meta.url)
const schema = JSON.parse(
  await Deno.readTextFile(new URL('catalog.schema.json', root)),
)
const serviceType = jsonSchemaToType(schema)
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ids = new Set()

for await (const category of Deno.readDir(new URL('catalog/', root))) {
  if (!category.isDirectory || !slug.test(category.name)) {
    throw new Error(
      `catalog/${category.name}: expected a category folder with a lowercase slug`,
    )
  }
  for await (
    const file of Deno.readDir(new URL(`catalog/${category.name}/`, root))
  ) {
    const path = `catalog/${category.name}/${file.name}`
    const id = file.name.replace(/\.json$/, '')
    if (!file.isFile || !file.name.endsWith('.json') || !slug.test(id)) {
      throw new Error(`${path}: expected one JSON file per service`)
    }
    const service = JSON.parse(await Deno.readTextFile(new URL(path, root)))
    try {
      serviceType.assert(service)
    } catch (error) {
      throw new Error(`${path}: ${error.message}`, { cause: error })
    }
    if (service.id !== id || ids.has(id)) {
      throw new Error(
        `${path}: id must match the filename and be unique across categories`,
      )
    }
    ids.add(id)
    if (service.iconUrl.startsWith('assets/')) {
      try {
        if (!(await Deno.stat(new URL(service.iconUrl, root))).isFile) {
          throw new Error('not a file')
        }
      } catch {
        throw new Error(`${path}: icon asset is missing: ${service.iconUrl}`)
      }
    }
  }
}

if (!ids.size) {
  throw new Error('The catalog must contain at least one service')
}
console.log(
  `Validated ${ids.size} catalog services against catalog.schema.json`,
)

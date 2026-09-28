const root = new URL('../', import.meta.url)
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ids = new Set()

function requireText(service, field, path) {
  if (typeof service[field] !== 'string' || !service[field].trim()) {
    throw new Error(`${path}: ${field} must be a non-empty string`)
  }
}

function requireURL(value, path) {
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${path}: expected an HTTP(S) URL without credentials`)
  }
}

for await (const category of Deno.readDir(new URL('catalog/', root))) {
  if (!category.isDirectory || !slug.test(category.name)) {
    throw new Error(`catalog/${category.name}: expected a category folder with a lowercase slug`)
  }
  for await (const file of Deno.readDir(new URL(`catalog/${category.name}/`, root))) {
    const path = `catalog/${category.name}/${file.name}`
    const id = file.name.replace(/\.json$/, '')
    if (!file.isFile || !file.name.endsWith('.json') || !slug.test(id)) {
      throw new Error(`${path}: expected one JSON file per service`)
    }
    const service = JSON.parse(await Deno.readTextFile(new URL(path, root)))
    if (!service || typeof service !== 'object' || Array.isArray(service)) {
      throw new Error(`${path}: expected a service object`)
    }
    for (const field of ['id', 'name', 'description', 'iconUrl', 'type']) {
      requireText(service, field, path)
    }
    if (service.id !== id || ids.has(id)) {
      throw new Error(`${path}: id must match the filename and be unique across categories`)
    }
    ids.add(id)
    if (service.iconUrl.startsWith('assets/')) {
      if (!/^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(service.iconUrl)) {
        throw new Error(`${path}: invalid asset path`)
      }
      if (!(await Deno.stat(new URL(service.iconUrl, root))).isFile) {
        throw new Error(`${path}: icon asset is missing`)
      }
    } else {
      requireURL(service.iconUrl, path)
    }
    if (service.type === 'url') {
      requireText(service, 'url', path)
      requireURL(service.url, path)
    } else if (service.type === 'docker') {
      for (const field of ['githubUrl', 'branch', 'pathType', 'path']) {
        requireText(service, field, path)
      }
      if (!/^https:\/\/github\.com\/[^/\s?#]+\/[^/\s?#]+\/?$/.test(service.githubUrl)) {
        throw new Error(`${path}: githubUrl must point to a GitHub repository`)
      }
      if (!['compose', 'dockerfile'].includes(service.pathType) || service.path.startsWith('/') || service.path.split('/').includes('..')) {
        throw new Error(`${path}: expected a relative compose or dockerfile path`)
      }
      if (service.checkoutPath !== undefined) {
        requireText(service, 'checkoutPath', path)
      }
    } else {
      throw new Error(`${path}: type must be url or docker`)
    }
  }
}

if (!ids.size) {
  throw new Error('The catalog must contain at least one service')
}
console.log(`Validated ${ids.size} catalog services`)

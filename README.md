# Xe Appstore

The live app catalog for [Darc](https://github.com/Agent54/xe-darc).

Each service lives in one JSON file under
`catalog/<category>/<service-id>.json`. The category comes from its folder; it
is not repeated inside the service file. Category names and service IDs use
lowercase slugs, such as `development` and `darc-code`. IDs must be unique
across the catalog and match their filenames. The
[JSON Schema](catalog.schema.json) is the source of truth for service fields.
The repository check and Darc compile it with ArkType's JSON Schema adapter.

```text
catalog/
  demo/
    welcome-to-docker.json
  design/
    excalidraw.json
  development/
    darc-code.json
    darc-dev.json
assets/
  welcome-to-docker.png
  excalidraw.png
  darc-code.png
  darc-dev.png
```

## Adding a service

Add a JSON file to an existing category, or create a new category folder. Every
service requires `id`, `name`, `description`, `iconUrl`, and `type`.

A web service uses `type: "url"` and an HTTP(S) `url`:

```json
{
  "id": "excalidraw",
  "name": "Excalidraw",
  "description": "Sketch diagrams and whiteboards in a shared canvas.",
  "iconUrl": "assets/excalidraw.png",
  "type": "url",
  "url": "https://excalidraw.com"
}
```

A Docker service uses `type: "docker"` and requires `githubUrl`, `branch`,
`pathType` (`compose`, `dockerfile`, or `static`), and `path` (relative to that
repository). An optional `checkoutPath` can prefill the checkout destination in
Darc. See [darc-code.json](catalog/development/darc-code.json) for an example.

The `demo` category includes Docker's official
[Welcome to Docker](https://github.com/docker/welcome-to-docker) example. It uses
the upstream `small-image` branch, which builds the static site and serves it
with `nginx:alpine-slim` on port 80, without a database or host mounts.

Icons can be an HTTP(S) URL or an `assets/...` path in this repository. Keep
repository assets under `assets/` and use an image file extension.

Run `deno task check` before committing. GitHub Actions runs the same validation
on pushes and pull requests.

## Live loading

Darc checks the `main` branch through GitHub's recursive tree API whenever the
catalog opens. It loads the schema and each service through the Git blob API
using SHAs from that tree, so they belong to the same snapshot. Unchanged blobs
are cached in memory; each reopening still checks GitHub for additions, edits,
moves, and deletions. No generated index or Darc rebuild is needed for catalog
updates merged to `main`.

This repository is public so browser requests need no token. GitHub's REST API
supports CORS directly. If GitHub is unavailable or its public API rate limit is
reached, Darc shows an error and a retry button. The initial load uses one tree
request, one schema request, and one request per service; subsequent opens
request only the tree and changed or new blobs. Icons are served from
`raw.githubusercontent.com`.

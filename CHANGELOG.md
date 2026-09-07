# Changelog

Releases before 0.6.0 are documented in the git history.

## 0.6.0

### Removed

- `database.link()` and `database.unlink()`. A managed database now belongs to
  exactly one project for its whole life, so there is nothing to link or
  unlink — the project is chosen at creation (`database.create({ project_id })`)
  and never changes. The backend endpoints `POST /api/v1/databases/:id/link`
  and `POST /api/v1/databases/:id/unlink` are removed in the same release, so
  these methods could only ever return a 404.

  There is no replacement. Create the database in the project that needs it.

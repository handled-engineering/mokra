# GET /v1/books

## Business Logic
- Returns a paginated list of books
- Default page size is 10 items
- Results are sorted by creation date, newest first

## Response Behavior
- Always returns a `data` array with book objects
- Includes `total` count and pagination info
- Empty array if no books exist

## Field Generation
- `id` should be a UUID format
- `title` should be realistic book titles
- `author` should be realistic author names
- `isbn` should follow ISBN-13 format
- `published_at` should be ISO 8601 date

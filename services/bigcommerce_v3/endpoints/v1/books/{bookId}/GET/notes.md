# GET /v1/books/:bookId

## Business Logic
- Retrieves a single book by its UUID
- The `bookId` path parameter is available as a variable

## Response Behavior
- Returns 200 with the book object if found
- Returns 404 if book doesn't exist

## Stateful Mode
- In stateful mode, checks the stored state for this book
- Returns actual stored data if available

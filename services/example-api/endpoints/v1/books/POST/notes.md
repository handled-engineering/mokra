# POST /v1/books

## Business Logic
- Creates a new book in the system
- Automatically generates a UUID for the book
- Sets created_at to current timestamp

## Validation Rules
- `title` is required, 1-200 characters
- `author` is required
- `isbn` must be valid ISBN-13 if provided
- `page_count` must be positive integer if provided

## Response Behavior
- Returns 201 with the created book object
- Returns 422 if validation fails

## Field Generation
- Generate a UUID v4 for the `id`
- Set `created_at` to current ISO 8601 timestamp

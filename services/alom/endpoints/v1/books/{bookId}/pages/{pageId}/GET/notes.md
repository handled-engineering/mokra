# GET /v1/books/:bookId/pages/:pageId

## Path Parameters
- `bookId` - The UUID of the book
- `pageId` - The page number (1-indexed)

## Business Logic
- Returns the content of a specific page
- Both bookId and pageId are accessible for response generation
- Page numbers start at 1, not 0

## Response Behavior
- Returns 200 with page content if found
- Returns 404 if book doesn't exist
- Returns 404 if page number exceeds book's page_count

## Field Generation
- `content` should be realistic book text (Lorem ipsum or actual prose)
- `page_number` matches the requested pageId
- `chapter` can be inferred from page number

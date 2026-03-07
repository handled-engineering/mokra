# Shopify Admin GraphQL API Mock

A mock implementation of Shopify's Admin GraphQL API for testing e-commerce integrations.

## Overview

This service provides realistic mock responses for common Shopify Admin API operations including:

- Products and Variants
- Orders and Fulfillments
- Customers
- Inventory
- Collections

## Usage

### Endpoint

```
POST /api/mock/shopify/2024-01/graphql
```

### Headers

```
X-API-Key: your-project-api-key
Content-Type: application/json
```

### Example Query

```graphql
query GetProducts($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
        title
        handle
        status
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              sku
            }
          }
        }
      }
    }
  }
}
```

### Example Request

```bash
curl -X POST /api/mock/shopify/2024-01/graphql \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { shop { name } }",
    "variables": {}
  }'
```

## Versioning

This mock supports Shopify's date-based API versioning. Available versions:

- `2024-01` (default)

You can specify the version via:
- Path: `/api/mock/shopify/2024-01/graphql`
- Header: `X-Shopify-API-Version: 2024-01`

## Custom Instructions

Use the `X-Custom-Instruction` header to customize responses:

```bash
curl -X POST /api/mock/shopify/2024-01/graphql \
  -H "X-API-Key: your-api-key" \
  -H "X-Custom-Instruction: Return products with out-of-stock variants" \
  -d '{"query": "..."}'
```

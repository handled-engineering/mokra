# Example Books API

A sample API demonstrating the file-based endpoint system for Mockra.

## Overview

This API provides CRUD operations for managing books and their pages.

## Endpoints

- `GET /v1/books` - List all books
- `POST /v1/books` - Create a new book
- `GET /v1/books/:bookId` - Get a specific book
- `GET /v1/books/:bookId/pages/:pageId` - Get a specific page from a book

## Authentication

All endpoints require a Bearer token in the Authorization header.

# Library API Design

A REST API for a library's **books** resource.

## Endpoints

### 1. List all books
- **Method:** GET
- **Path:** `/books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** 200 OK

### 2. Get one book
- **Method:** GET
- **Path:** `/books/{id}` (for example `/books/42`)
- **Description:** Returns the book with the given id.
- **Request body:** none
- **Success status:** 200 OK

### 3. Create a book
- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Request body:**
```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958
  }
```
- **Success status:** 201 Created

### 4. Update a book
- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Request body:**
```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1959
  }
```
- **Success status:** 200 OK

### 5. Delete a book
- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Removes the book with the given id.
- **Request body:** none
- **Success status:** 204 No Content

### 6. List books by an author
- **Method:** GET
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Returns only the books written by the given author.
- **Request body:** none
- **Success status:** 200 OK

## Error codes

### 400 Bad Request
- The request was invalid.
- **Example:** `POST /books` with an empty `title`, or a `year` that is not a number.

### 404 Not Found
- The book or URL does not exist.
- **Example:** `GET /books/9999` when no book has that id.
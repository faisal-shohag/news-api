
# BBC Bengali News API

This is a Node.js application built with Express.js that scrapes news data from the BBC Bengali website (`https://www.bbc.com/bengali`). It provides a RESTful API to access categories, news articles, popular articles, and specific article details. The application includes rate limiting to prevent abuse and ensure fair usage.

## Features
- Scrape news categories and articles from BBC Bengali.
- Retrieve detailed article content, including images and timestamps.
- Fetch popular articles ranked by BBC.
- Rate-limited API endpoints to manage traffic.
- CORS-enabled for cross-origin requests.

---
## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/faisal-shohag/news-api.git
   cd news-api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
   The server will run on `http://localhost:3000`.
---
## Project Structure
```
bbc-bengali-scraper/
├── public/           # Static files (e.g., index.html)
├── crawl.js          # API routes and scraping logic
├── index.js          # Main server file
├── package.json      # Project metadata and dependencies
└── README.md         # This file
```
---
## API Documentation

### Base URL
`http://localhost:3000/api`

### Rate Limits
- **Global**: 100 requests per 15 minutes per IP.
- **API-specific**: 15 requests per minute per IP.
- Exceeding limits returns a `429 Too Many Requests` response with:
  ```json
  {
    "success": false,
    "error": "Too many requests from this IP, please try again after 15 minutes."
  }
  ```
---
### Endpoints

#### 1. Get News Categories
- **Endpoint**: `GET /api/categories`
- **Description**: Retrieves a list of news categories from BBC Bengali.
- **Response**:
  ```json
  {
    "success": true,
    "count": 5,
    "categories": [
      {"id": "main", "title": "মূলপাতা"},
      { "id": "c123abc", "title": "খেলা" },
      { "id": "c456def", "title": "বিজ্ঞান" }
    ]
  }
  ```
- **Error Response**:
  ```json
  {
    "success": false,
    "error": "Failed to fetch news categories."
  }
  ```

#### 2. Get Main News Articles
- **Endpoint**: `GET /api/news`
- **Description**: Fetches the latest news articles from the BBC Bengali homepage.
- **Response**:
  ```json
  {
    "success": true,
    "count": 10,
    "articles": [
      {
        "id": "c1n2m3",
        "title": "Sample News Title",
        "link": "https://www.bbc.com/bengali/articles/c1n2m3",
        "description": "Short description",
        "timestamp": "3 April 2025",
        "image": {
          "alt": "Image description",
          "srcset": [
            { "resolution": "base", "url": "https://example.com/image.jpg" },
            { "resolution": "480w", "url": "https://example.com/image-480.jpg" }
          ]
        },
        "scrapedAt": "2025-04-03T12:00:00.000Z"
      }
    ]
  }
  ```

#### 3. Get Articles by Category
- **Endpoint**: `GET /api/categories/:id`
- **Description**: Retrieves articles for a specific category ID.
- **Parameters**:
  - `id` (string): Category ID (e.g., `c123abc`).
- **Response**:
  ```json
  {
    "success": true,
    "count": 8,
    "articles": [
      {
        "title": "Category Article",
        "link": "https://www.bbc.com/bengali/topics/c123abc",
        "time": "3 April 2025",
        "datetime": "2025-04-03T10:00:00Z",
        "image": {
          "alt": "Image alt text",
          "srcset": [
            { "resolution": "base", "url": "https://example.com/image.jpg" }
          ]
        }
      }
    ]
  }
  ```

#### 4. Get Article Details
- **Endpoint**: `GET /api/news/:id`
- **Description**: Fetches detailed content for a specific article.
- **Parameters**:
  - `id` (string): Article ID (e.g., `c1n2m3`).
- **Response**:
  ```json
  {
    "success": true,
    "article": {
      "id": "c1n2m3",
      "title": "Detailed Article Title",
      "url": "https://www.bbc.com/bengali/articles/c1n2m3",
      "timestamp": "3 April 2025",
      "content": ["Paragraph 1", "Paragraph 2"],
      "images": [
        {
          "url": "https://example.com/image.jpg",
          "caption": "Image caption"
        }
      ],
      "scrapedAt": "2025-04-03T12:00:00.000Z"
    }
  }
  ```

#### 5. Get Popular Articles
- **Endpoint**: `GET /api/popular`
- **Description**: Retrieves a list of popular articles from BBC Bengali.
- **Response**:
  ```json
  {
    "success": true,
    "count": 5,
    "articles": [
      {
        "rank": 1,
        "id": "c7x8y9",
        "title": "Most Popular Article",
        "link": "https://www.bbc.com/bengali/articles/c7x8y9",
        "scrapedAt": "2025-04-03T12:00:00.000Z"
      }
    ]
  }
  ```

### Error Handling
- **404 Not Found**: Returned when no data is found (e.g., invalid ID).
- **500 Internal Server Error**: Returned for server-side issues.
- Example:
  ```json
  {
    "success": false,
    "error": "Failed to fetch article"
  }
  ```

## Usage Example
Using `curl` to fetch news:
```bash
curl http://localhost:3000/api/news
```

## Notes
- This scraper targets `https://www.bbc.com/bengali`. Ensure compliance with BBC's terms of service and `robots.txt`.
- Rate limits are in place to prevent abuse. Adjust them in `index.js` if needed.
- The application serves a static `index.html` at the root (`/`).

## Contributing
Feel free to submit issues or pull requests to improve the project!



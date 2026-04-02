# QA Test Cases - Ceylon Chai DevOps

## Scope
- Frontend availability
- Backend API correctness
- Database write/read/delete flow through API
- Input validation and error handling

## Environment
- Frontend: `http://localhost:8081`
- Backend: `http://localhost:5000`
- Database: MongoDB service in Docker Compose

## Test Cases

1. `TC-001` Backend health endpoint is available
- Steps: `GET /health`
- Expected: `200 OK` and JSON contains `"status":"healthy"` and `"database":"connected"`

2. `TC-002` Products list endpoint responds with JSON array
- Steps: `GET /products`
- Expected: `200 OK` and response body starts with `[`

3. `TC-003` Reject product with empty name
- Steps: `POST /products` with JSON `{ "name": "", "price": 100 }`
- Expected: `400 Bad Request`

4. `TC-004` Reject product with invalid price
- Steps: `POST /products` with JSON `{ "name": "QA Item", "price": "abc" }`
- Expected: `400 Bad Request`

5. `TC-005` Create valid product
- Steps: `POST /products` with JSON `{ "name": "QA Tea", "price": 123 }`
- Expected: `201 Created` and response includes `product._id`

6. `TC-006` Created product appears in list
- Steps: `GET /products` after TC-005
- Expected: response contains created product id

7. `TC-007` Reject delete with invalid id format
- Steps: `DELETE /products/not-a-valid-id`
- Expected: `400 Bad Request`

8. `TC-008` Delete created product by id
- Steps: `DELETE /products/{createdId}`
- Expected: `200 OK`

9. `TC-009` Deleting same product again returns not found
- Steps: `DELETE /products/{createdId}` again
- Expected: `404 Not Found`

10. `TC-010` Frontend homepage is reachable
- Steps: `GET /` on frontend URL
- Expected: `200 OK` and HTML contains `Ceylon`

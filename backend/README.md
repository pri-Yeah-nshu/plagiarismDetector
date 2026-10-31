# Assignment Plagiarism Detector: Backend (Version 1)

## 1. Project overview

A REST API that lets a teacher upload an original assignment, then upload a student's submission. The backend extracts text from both files, sends them to an OpenAI-compatible LLM, validates the structured JSON the model returns, stores the result in MongoDB, and exposes it for a frontend to display.

Version 1 deliberately has no RAG, embeddings, vector databases, Redis, queues, microservices, WebSockets, fuzzy student-to-student comparison, or AI-generated-text detection. (Exact duplicate-file detection between students is included, see section 15.)

## 2. Features

- Separate student and teacher sign-up / login with role-based access (JWT)
- Create, list, view, and delete assignments (teachers only; each teacher sees only their own)
- Students submit their own work once per assignment
- Exact duplicate detection: students who submitted the same file are grouped for the teacher
- PDF, DOCX and TXT uploads (extension, MIME type and file signature are all checked)
- Text extraction and normalization
- LLM-based plagiarism analysis with a strict JSON contract
- Validation of every LLM response before it is stored
- Configurable maximum analysis size (no silent truncation)
- Centralized error handling with stable error codes
- Helmet, CORS, rate limiting (stricter on the LLM endpoint)
- Temporary upload files are always deleted

## 3. Tech stack

Node.js (18+), Express 4, MongoDB + Mongoose, ES Modules, Multer, pdf-parse, mammoth, bcryptjs, jsonwebtoken, dotenv, Helmet, CORS, Morgan, express-rate-limit. The LLM is called through Node's built-in `fetch`, so no SDK is needed.

## 4. Architecture

```
Route -> Controller -> Service -> MongoDB / LLM API
```

- Routes map URLs to controllers and attach middleware (upload, rate limit).
- Controllers are thin: read the request, call a service, send the response.
- `file.service.js` handles type detection, extraction and normalization.
- `llm.service.js` is the only module that talks to the LLM provider.
- `plagiarism.service.js` orchestrates the check and validates LLM output.
- `assignment.service.js` holds assignment business logic.
- `error.middleware.js` converts every error into the standard error format.

## 5. Folder structure

```
backend/
├── src/
│   ├── config/        db.js, env.js
│   ├── controllers/   assignment, plagiarism, health
│   ├── models/        Assignment.js, PlagiarismReport.js
│   ├── routes/        assignment, plagiarism, health
│   ├── services/      assignment, file, llm, plagiarism
│   ├── middleware/    upload, error, notFound, rateLimit
│   ├── utils/         apiError, apiResponse, asyncHandler
│   ├── prompts/       plagiarism.prompt.js
│   ├── app.js
│   └── server.js
├── uploads/           temporary files only (.gitkeep)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 6. Installation

```bash
npm install
cp .env.example .env
```

Then edit `.env` with your values.

## 7. Environment variables

| Variable                  | Required | Description                                                  |
| ------------------------- | -------- | ------------------------------------------------------------ |
| `PORT`                    | no       | Server port (default 5000)                                   |
| `MONGODB_URI`             | yes      | MongoDB connection string                                    |
| `LLM_API_KEY`             | yes      | API key for the LLM provider                                 |
| `LLM_MODEL`               | yes      | Model name sent to the provider                              |
| `LLM_BASE_URL`            | yes      | OpenAI-compatible base URL, e.g. `https://api.openai.com/v1` |
| `JWT_SECRET`              | yes      | Secret for signing login tokens, at least 32 characters      |
| `TEACHER_SIGNUP_CODE`     | no       | Code teachers must enter at sign-up (see section 15)         |
| `JWT_EXPIRES_IN`          | no       | Token lifetime (default `7d`)                                |
| `CLIENT_URL`              | no       | Allowed CORS origin(s); comma-separate for several           |
| `MAX_FILE_SIZE_MB`        | no       | Max upload size (default 10)                                 |
| `MAX_ANALYSIS_CHARACTERS` | no       | Max combined source + student characters (default 100000)    |
| `NODE_ENV`                | no       | `development` or `production`                                |
| `LLM_TIMEOUT_MS`          | no       | LLM request timeout (default 90000)                          |
| `RATE_LIMIT_MAX`          | no       | Requests per 15 min per IP on `/api` (default 100)           |
| `ANALYSIS_RATE_LIMIT_MAX` | no       | Plagiarism checks per 15 min per user (default 10)           |
| `LOGIN_RATE_LIMIT_MAX`    | no       | Failed logins per 15 min per IP (default 20)                 |
| `SIGNUP_RATE_LIMIT_MAX`   | no       | Sign-ups per 15 min per IP (default 30)                      |

If a required variable is missing, the server prints which ones and exits cleanly.

## 8. MongoDB setup

Local: install MongoDB Community Edition and keep the default `MONGODB_URI=mongodb://127.0.0.1:27017/plagiarism-detector`.

Docker:

```bash
docker run -d --name plagiarism-mongo -p 27017:27017 mongo:7
```

Atlas: create a free cluster, add your IP to the access list, and paste the connection string into `MONGODB_URI`.

## 9. How to run

```bash
npm install
npm run dev     # development with nodemon
npm start       # production
```

## 10. API documentation

All responses use `{ success, message, data }` or `{ success: false, message, error: { code } }`.

Every endpoint except `/api/health` and the sign-up/login routes needs `Authorization: Bearer <token>`.

| Method | Path                                                  | Role    | Description                                                         |
| ------ | ----------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| GET    | `/api/health`                                         | public  | Health check                                                        |
| POST   | `/api/auth/student/signup`                            | public  | Create student account (`name`, `email`, `password`)               |
| POST   | `/api/auth/student/login`                             | public  | Student login (`email`, `password`) returns `{ token, user }`       |
| POST   | `/api/auth/teacher/signup`                            | public  | Create teacher account (+ `accessCode`)                             |
| POST   | `/api/auth/teacher/login`                             | public  | Teacher login                                                       |
| GET    | `/api/auth/me`                                        | any     | Current user                                                        |
| POST   | `/api/assignments`                                    | teacher | Create assignment (multipart: `title`, `description`, `sourceFile`) |
| GET    | `/api/assignments`                                    | any     | Teacher: own assignments. Student: all assignments                  |
| GET    | `/api/assignments/:assignmentId`                      | any     | Assignment metadata (students do not see the source file name)      |
| DELETE | `/api/assignments/:assignmentId`                      | teacher | Delete own assignment and its reports                               |
| POST   | `/api/plagiarism/check/:assignmentId`                 | student | Submit work (multipart: `studentFile`). One submission per student  |
| GET    | `/api/plagiarism/my`                                  | student | The student's own submissions (no scores)                           |
| GET    | `/api/plagiarism/reports/:reportId`                   | teacher | One report (includes `studentText` and `sharedFileWith`)            |
| GET    | `/api/plagiarism/assignment/:assignmentId`            | teacher | All reports for an assignment                                       |
| GET    | `/api/plagiarism/assignment/:assignmentId/duplicates` | teacher | Groups of students who submitted the same file                      |

## 11. Example requests

```bash
curl http://localhost:5000/api/health

# Log in as a teacher and keep the token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/teacher/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@school.edu","password":"your-password"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).data.token")

curl -X POST http://localhost:5000/api/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Essay on Climate Change" \
  -F "description=Week 3 essay" \
  -F "sourceFile=@./original.pdf"

# DOCX needs an explicit type with curl (Postman/browsers set it automatically)
curl -X POST http://localhost:5000/api/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Essay" \
  -F "sourceFile=@./original.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"

# As a student (use a token from /api/auth/student/login)
curl -X POST http://localhost:5000/api/plagiarism/check/<ASSIGNMENT_ID> \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -F "studentFile=@./student.pdf"

# As the teacher
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/plagiarism/reports/<REPORT_ID>
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/plagiarism/assignment/<ASSIGNMENT_ID>
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/plagiarism/assignment/<ASSIGNMENT_ID>/duplicates
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/assignments/<ASSIGNMENT_ID>
```

## 12. Example responses

Create assignment (201):

```json
{
  "success": true,
  "message": "Assignment created successfully",
  "data": {
    "assignment": {
      "_id": "66f1a2b3c4d5e6f708192a3b",
      "title": "Essay on Climate Change",
      "description": "Week 3 essay",
      "sourceFileName": "original.pdf",
      "sourceFileType": "pdf",
      "createdAt": "2026-10-08T10:15:00.000Z",
      "updatedAt": "2026-10-08T10:15:00.000Z",
      "__v": 0
    }
  }
}
```

Student submission (201): students only receive a confirmation. The report below is what the teacher sees via `GET /api/plagiarism/reports/:reportId`.

```json
{
  "success": true,
  "message": "Submission received and analyzed",
  "data": {
    "submission": { "_id": "66f1a5c6d7e8f9a0b1c2d3e4", "assignmentId": "66f1a2b3c4d5e6f708192a3b", "studentFileName": "student.pdf", "createdAt": "2026-10-08T10:20:00.000Z" }
  }
}
```

Teacher report (200):

```json
{
  "success": true,
  "message": "Plagiarism report retrieved successfully",
  "data": {
    "report": {
      "_id": "66f1a5c6d7e8f9a0b1c2d3e4",
      "assignmentId": "66f1a2b3c4d5e6f708192a3b",
      "studentName": "Jane Doe",
      "studentFileName": "student.pdf",
      "overallSimilarityScore": 62,
      "directCopyScore": 35,
      "paraphraseScore": 50,
      "verdict": "MEDIUM",
      "summary": "Several paragraphs closely follow the source. Teacher review recommended.",
      "matchedSections": [
        {
          "sourceText": "Global temperatures have risen by about 1.1C since 1880.",
          "studentText": "Global temperatures have risen by about 1.1C since 1880.",
          "similarity": 100,
          "type": "direct_copy",
          "explanation": "Sentence is identical."
        }
      ],
      "recommendations": [
        "Ask the student to explain the highlighted sections."
      ],
      "modelUsed": "your_model_name",
      "createdAt": "2026-10-08T10:20:00.000Z",
      "updatedAt": "2026-10-08T10:20:00.000Z"
    }
  }
}
```

## 13. Error handling

Format:

```json
{
  "success": false,
  "message": "Assignment not found",
  "error": { "code": "ASSIGNMENT_NOT_FOUND" }
}
```

| Code                                                                                                         | HTTP | Meaning                                         |
| ------------------------------------------------------------------------------------------------------------ | ---- | ----------------------------------------------- |
| `VALIDATION_ERROR`                                                                                           | 400  | Missing or invalid input                        |
| `INVALID_ID`                                                                                                 | 400  | Malformed MongoDB ID                            |
| `FILE_REQUIRED`                                                                                              | 400  | No file uploaded                                |
| `UNEXPECTED_FILE_FIELD`                                                                                      | 400  | Wrong multipart field name                      |
| `AUTH_REQUIRED` / `INVALID_TOKEN` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS`                                  | 401  | Not logged in, or login failed          
| `FORBIDDEN` / `WRONG_ROLE` / `INVALID_ACCESS_CODE` / `TEACHER_SIGNUP_DISABLED`                               | 403  | Role not allowed                        
| `ASSIGNMENT_NOT_FOUND` / `REPORT_NOT_FOUND` / `ROUTE_NOT_FOUND`                                              | 404  | Resource missing (or not yours)         
| `EMAIL_TAKEN` / `ALREADY_SUBMITTED`                                                                          | 409  | Duplicate account or submission                 |
| `FILE_TOO_LARGE`                                                                                             | 413  | Upload exceeds `MAX_FILE_SIZE_MB`               |
| `ASSIGNMENT_TOO_LARGE`                                                                                       | 413  | Combined text exceeds `MAX_ANALYSIS_CHARACTERS` |
| `UNSUPPORTED_FILE_TYPE` / `INVALID_FILE_CONTENT`                                                             | 415  | Bad type or content mismatch                    |
| `FILE_EXTRACTION_FAILED` / `EMPTY_FILE_TEXT`                                                                 | 422  | Could not read text                             |
| `RATE_LIMIT_EXCEEDED`                                                                                        | 429  | Too many requests                               |
| `INVALID_LLM_RESPONSE` / `LLM_REQUEST_FAILED` / `LLM_UNAVAILABLE` / `LLM_AUTH_FAILED` / `LLM_EMPTY_RESPONSE` | 502  | LLM problems                                    |
| `LLM_RATE_LIMITED` / `DATABASE_ERROR`                                                                        | 503  | Temporary upstream issue                        |
| `LLM_TIMEOUT`                                                                                                | 504  | LLM took too long                               |
| `INTERNAL_SERVER_ERROR`                                                                                      | 500  | Unexpected error (no stack trace in production) |

## 14. Future improvements

- Password reset, email verification, classes/enrolment (currently any student can see every assignment)
- Chunking for large documents instead of rejecting them
- Verifying that matched snippets truly occur in the documents
- Async job processing with a queue
- Fuzzy student-to-student comparison, embeddings and RAG
- Support for scanned PDFs through OCR
- Object storage for original files
- Automated tests and CI

## 15. Roles and shared-file detection

### Roles

- **Student** sign-up/login at `/api/auth/student/*`. Can list assignments, submit once per assignment and see their own submission status. They never see scores or findings.
- **Teacher** sign-up/login at `/api/auth/teacher/*`. Teacher sign-up requires `TEACHER_SIGNUP_CODE`. If it is not set, teacher sign-up is open when `NODE_ENV` is not `production` and disabled in production. A teacher can only see and manage their own assignments and the reports under them.
- Logging in through the wrong role's endpoint is rejected with `WRONG_ROLE`.
- Assignments created before accounts existed have no `teacherId`, so no teacher can see them. Set `teacherId` on those documents manually if you want to keep them.

### Shared-file detection

Every submission is stored with two hashes:

- `fileHash`: SHA-256 of the uploaded file's bytes. Equal hashes mean the students uploaded the exact same file.
- `textHash`: SHA-256 of the extracted text with case and whitespace normalized. Equal hashes with different file hashes mean the same content was saved or exported separately.

`GET /api/plagiarism/assignment/:assignmentId/duplicates` groups, per assignment, the reports that share a hash across at least two different students, with the earliest submission first. Groups are computed on request, so nothing needs to be re-synced. Teachers see the groups on the assignment page and a banner on each affected report.

Limitations: matching is exact. A re-scan, a re-export from another tool or a single edited character produces a different hash. Image-only (scanned) PDFs still cannot be analyzed in Version 1 because no text can be extracted from them, so they are rejected before a report is saved.

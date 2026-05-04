import { http, HttpResponse } from "msw";

export const handlers = [
    http.get("http://localhost:8000/api/v1/question/today", () =>
        HttpResponse.json({
            id: 1,
            title: "Test Question",
            question_text: "What is your favorite color?",
            description: "tell us your favorite color",
            publish_date: "2026-05-01",
            created_at: "2026-05-01T00:00:00",
            options: [
                { id: 1, question_id: 1, option_text: "Red", created_at: "" },
                { id: 2, question_id: 1, option_text: "Blue", created_at: "" },
            ],
        })
    ),
    http.get("http://localhost:8000/api/v1/vote/me/question/:id", () =>
        HttpResponse.json(null)
    ),
    http.post("http://localhost:8000/api/v1/vote/", () =>
        HttpResponse.json({
        id: 1,
        user_id: 1,
        question_id: 1,
        option_id: 1,
        created_at: "",
        })
    ),
    http.get("http://localhost:8000/api/v1/user/me", () =>
        HttpResponse.json(null, { status: 401 })
    ),
];
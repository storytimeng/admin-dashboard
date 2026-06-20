import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://storytime-backend-1-0.onrender.com";

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function sanitizeAuthorizationHeader(value: string | null): string | undefined {
  if (!value) return undefined;

  let token = value.trim();
  while (/^Bearer\s+/i.test(token)) {
    token = token.replace(/^Bearer\s+/i, "").trim();
  }

  if (!JWT_PATTERN.test(token)) {
    return undefined;
  }

  return `Bearer ${token}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, "PUT");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, "DELETE");
}

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string,
) {
  const apiPath = path.join("/");
  const url = `${BACKEND_URL}/${apiPath}`;
  const searchParams = request.nextUrl.searchParams.toString();
  const fullUrl = searchParams ? `${url}?${searchParams}` : url;

  let body: string | ArrayBuffer | undefined;
  if (method !== "GET" && method !== "DELETE") {
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      body = await request.text();
    } else {
      body = await request.arrayBuffer();
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const authorization = sanitizeAuthorizationHeader(
    request.headers.get("authorization"),
  );
  if (authorization) {
    headers.Authorization = authorization;
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  try {
    const isAnalytics = apiPath.startsWith("admin/analytics");
    const timeoutMs = isAnalytics ? 60000 : 30000;

    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const responseData = await response.text();
    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch {
      parsedResponse = undefined;
    }

    const nextResponse =
      parsedResponse !== undefined
        ? NextResponse.json(parsedResponse, { status: response.status })
        : new NextResponse(responseData, {
            status: response.status,
            headers: {
              "Content-Type":
                response.headers.get("content-type") || "text/plain",
            },
          });

    nextResponse.headers.set("Access-Control-Allow-Origin", "*");
    return nextResponse;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Proxy request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
    },
  });
}

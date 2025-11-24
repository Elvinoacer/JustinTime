import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message = "Resource already exists") {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Handle errors and return appropriate NextResponse
 */
export function handleError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation error",
        details: error.issues,
      },
      { status: 400 }
    );
  }

  // Custom errors
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 403 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 404 }
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 409 }
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details,
      },
      { status: 400 }
    );
  }

  // Generic error
  return NextResponse.json(
    {
      success: false,
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" 
        ? (error as Error).message 
        : undefined,
    },
    { status: 500 }
  );
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

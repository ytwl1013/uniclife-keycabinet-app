export type ApiSuccess<T> = {
  code: 'OK';
  message: string;
  data: T;
};

export type ApiFailure<T = unknown> = {
  code: string;
  message: string;
  data: T | null;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, message = 'ok'): ApiSuccess<T> {
  return { code: 'OK', message, data };
}

export function fail<T = unknown>(code: string, message: string, data: T | null = null): ApiFailure<T> {
  return { code, message, data };
}

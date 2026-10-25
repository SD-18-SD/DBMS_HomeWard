// A normal Error with an HTTP status code attached.
// Throw it anywhere: throw new AppError('Pet not found', 404)
export default class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

import AppError from '../utils/AppError.js';

// validate(schema) checks req.body against a Zod schema.
// You can also pass a function (req) => schema to pick a schema per request,
// for example a stricter one for regular users than for admins.
// If valid, req.body is replaced with the cleaned data.
// If not, the request stops with a 400 error and a readable message.
export function validate(schemaOrPicker) {
  return (req, _res, next) => {
    const schema = typeof schemaOrPicker === 'function' ? schemaOrPicker(req) : schemaOrPicker;
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const first = result.error.issues[0];
      const field = first.path.join('.');
      throw new AppError(field ? `${field}: ${first.message}` : first.message, 400);
    }
    req.body = result.data;
    next();
  };
}

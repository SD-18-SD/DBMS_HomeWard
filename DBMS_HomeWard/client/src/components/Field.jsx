// A label + input + error message, so forms stay short.
// Usage: <Field label="Email" error={errors.email} {...register('email')} />
import { forwardRef } from 'react';

const Field = forwardRef(function Field({ label, error, id, as = 'input', ...props }, ref) {
  const Tag = as;
  const fieldId = id || props.name;
  return (
    <div>
      <label htmlFor={fieldId} className="label">{label}</label>
      <Tag id={fieldId} ref={ref} className="input" aria-invalid={!!error} {...props} />
      {error && <p className="error-text">{error.message}</p>}
    </div>
  );
});

export default Field;

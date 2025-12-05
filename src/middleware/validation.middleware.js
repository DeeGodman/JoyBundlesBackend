// VALIDATION MIDDLEWARE
// Middleware for validating request data using Zod schemas

const { formatZodErrors } = require("../utils/response.util");
const { validationErrorResponse } = require("../utils/response.util");

/**
 * Validate request body using Zod schema
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/register', validate(registerSchema), authController.register);
 */
const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return validationErrorResponse(res, errors, "Validation failed");
    }

    // Attach validated data to request
    req.validatedData = result.data;
    next();
  };
};

/**
 * Validate request query parameters using Zod schema
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/orders', validateQuery(paginationSchema), orderController.getAll);
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return validationErrorResponse(res, errors, "Invalid query parameters");
    }

    // Attach validated query to request
    req.validatedQuery = result.data;
    next();
  };
};

/**
 * Validate request params using Zod schema
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/users/:id', validateParams(uuidSchema), userController.getById);
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return validationErrorResponse(res, errors, "Invalid route parameters");
    }

    // Attach validated params to request
    req.validatedParams = result.data;
    next();
  };
};

/**
 * Validate multiple parts of request (body, query, params)
 * @param {Object} schemas - Object containing schemas for different parts
 * @param {Object} schemas.body - Schema for request body
 * @param {Object} schemas.query - Schema for query parameters
 * @param {Object} schemas.params - Schema for route parameters
 * @returns {Function} Express middleware function
 *
 * @example
 * router.put('/users/:id', validateRequest({
 *   params: uuidSchema,
 *   body: updateUserSchema,
 *   query: paginationSchema
 * }), userController.update);
 */
const validateRequest = (schemas = {}) => {
  return (req, res, next) => {
    const allErrors = [];

    // Validate body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        allErrors.push(...errors);
      } else {
        req.validatedData = result.data;
      }
    }

    // Validate query
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        allErrors.push(...errors);
      } else {
        req.validatedQuery = result.data;
      }
    }

    // Validate params
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        allErrors.push(...errors);
      } else {
        req.validatedParams = result.data;
      }
    }

    // If any validation failed, return error
    if (allErrors.length > 0) {
      return validationErrorResponse(res, allErrors, "Validation failed");
    }

    next();
  };
};

/**
 * Sanitize request data (remove extra fields not in schema)
 * @param {Object} schema - Zod schema
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/users', sanitize(createUserSchema), userController.create);
 */
const sanitize = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (result.success) {
      // Replace request body with only validated fields
      req.body = result.data;
    }

    next();
  };
};

module.exports = {
  validate,
  validateQuery,
  validateParams,
  validateRequest,
  sanitize,
};

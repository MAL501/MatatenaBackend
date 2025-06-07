// Clase para errores de la API
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware para manejar errores
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  console.error(`Error ${statusCode}: ${message}`);
  console.error(err.stack);
  
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message
  });
}

module.exports = {
  ApiError,
  errorHandler
};
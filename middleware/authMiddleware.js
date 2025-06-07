const { verifyAccessToken } = require('../utils/jwtUtils');
const { ApiError } = require('../utils/errorHandler');

function authenticate(req, res, next) {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No se proporcionó token de autenticación');
    }
    
    // Extraer el token
    const token = authHeader.split(' ')[1];
    
    // Verificar el token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw new ApiError(401, 'Token inválido o expirado');
    }
    
    // Añadir el usuario al objeto request
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticate
};
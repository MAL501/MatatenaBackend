const bcrypt = require('bcrypt');
const { executeQuery } = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwtUtils');
const { ApiError } = require('../utils/errorHandler');

// Registrar un nuevo usuario
async function register(req, res, next) {
  try {
    const { username, password } = req.body;
    
    // Validar datos
    if (!username || !password) {
      throw new ApiError(400, 'Se requiere nombre de usuario y contraseña');
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await executeQuery('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      throw new ApiError(409, 'El nombre de usuario ya está en uso');
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear usuario
    const result = await executeQuery(
      'INSERT INTO users (username, password, created_at) VALUES (?, ?, NOW())',
      [username, hashedPassword]
    );
    
    // Obtener el usuario creado
    const userId = result.insertId;
    const user = await executeQuery('SELECT id, username, created_at FROM users WHERE id = ?', [userId]);
    
    // Generar tokens
    const accessToken = generateAccessToken(user[0]);
    const refreshToken = generateRefreshToken(user[0]);
    
    res.status(201).json({
      status: 'success',
      message: 'Usuario registrado correctamente',
      data: {
        user: {
          id: user[0].id,
          username: user[0].username,
          created_at: user[0].created_at
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

// Iniciar sesión
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    
    // Validar datos
    if (!username || !password) {
      throw new ApiError(400, 'Se requiere nombre de usuario y contraseña');
    }
    
    // Buscar usuario
    const users = await executeQuery('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      throw new ApiError(401, 'Credenciales inválidas');
    }
    
    const user = users[0];
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Credenciales inválidas');
    }
    
    // Generar tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(200).json({
      status: 'success',
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          id: user.id,
          username: user.username,
          created_at: user.created_at
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

// Refrescar token
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ApiError(400, 'Se requiere token de refresco');
    }
    
    // Verificar refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new ApiError(401, 'Token de refresco inválido o expirado');
    }
    
    // Buscar usuario
    const users = await executeQuery('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      throw new ApiError(404, 'Usuario no encontrado');
    }
    
    const user = users[0];
    
    // Generar nuevos tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    res.status(200).json({
      status: 'success',
      message: 'Token refrescado correctamente',
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refreshToken
};
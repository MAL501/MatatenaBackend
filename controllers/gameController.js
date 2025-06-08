const { executeQuery } = require('../config/db');
const { ApiError } = require('../utils/errorHandler');

// Función para generar código aleatorio de 5 caracteres (mayúsculas y números)
function generateGameCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Crear una nueva partida
async function createGame(req, res, next) {
  try {
    const hostUserId = req.user.id;
    
    // Generar código único para la partida
    let gameCode;
    let isUnique = false;
    
    // Asegurar que el código sea único
    while (!isUnique) {
      gameCode = generateGameCode();
      const existingGame = await executeQuery('SELECT id FROM game WHERE code = ?', [gameCode]);
      if (existingGame.length === 0) {
        isUnique = true;
      }
    }
    
    // Crear partida en la base de datos
    const result = await executeQuery(
      'INSERT INTO game (code, host_user, started_at) VALUES (?, ?, NOW())',
      [gameCode, hostUserId]
    );
    
    const gameId = result.insertId;
    
    res.status(201).json({
      status: 'success',
      message: 'Partida creada correctamente',
      data: {
        gameId,
        gameCode,
        hostUserId
      }
    });
  } catch (error) {
    next(error);
  }
}

// Unirse a una partida usando el código
async function joinGameByCode(req, res, next) {
  try {
    const guestUserId = req.user.id;
    const { code } = req.body;
    
    if (!code) {
      throw new ApiError(400, 'Se requiere el código de la partida');
    }
    
    // Verificar si la partida existe
    const games = await executeQuery('SELECT * FROM game WHERE code = ?', [code.toUpperCase()]);
    if (games.length === 0) {
      throw new ApiError(404, 'Partida no encontrada');
    }
    
    const game = games[0];
    
    // Verificar si la partida ya tiene un invitado
    if (game.guest_user) {
      throw new ApiError(409, 'La partida ya está completa');
    }
    
    // Verificar que el usuario no sea el anfitrión
    if (game.host_user == guestUserId) {
      throw new ApiError(400, 'No puedes unirte a tu propia partida');
    }
    
    // Actualizar la partida con el usuario invitado
    await executeQuery(
      'UPDATE game SET guest_user = ? WHERE id = ?',
      [guestUserId, game.id]
    );
    
    // Obtener información completa de la partida con nombres de usuario
    const updatedGame = await executeQuery(`
      SELECT g.*, 
             host.username AS host_username, 
             guest.username AS guest_username
      FROM game g
      LEFT JOIN users host ON g.host_user = host.id
      LEFT JOIN users guest ON g.guest_user = guest.id
      WHERE g.id = ?
    `, [game.id]);
    
    res.status(200).json({
      status: 'success',
      message: 'Te has unido a la partida correctamente',
      data: {
        game: updatedGame[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

// Finalizar una partida
async function endGame(req, res, next) {
  try {
    const userId = req.user.id;
    const { gameId } = req.params;
    const { winnerId } = req.body;
    
    // Verificar si la partida existe
    const games = await executeQuery(
      'SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?)',
      [gameId, userId, userId]
    );
    
    if (games.length === 0) {
      throw new ApiError(404, 'Partida no encontrada o no tienes permiso');
    }
    
    const game = games[0];
    
    // Verificar que el ganador sea uno de los jugadores
    if (winnerId !== game.host_user && winnerId !== game.guest_user) {
      throw new ApiError(400, 'El ganador debe ser uno de los jugadores');
    }
    
    // Actualizar la partida con el ganador y fecha de finalización
    await executeQuery(
      'UPDATE game SET winner = ?, ended_at = NOW() WHERE id = ?',
      [winnerId, gameId]
    );
    
    // Obtener información del ganador
    const winner = await executeQuery('SELECT username FROM users WHERE id = ?', [winnerId]);
    
    res.status(200).json({
      status: 'success',
      message: 'Partida finalizada correctamente',
      data: {
        gameId,
        winnerId,
        winnerUsername: winner[0].username
      }
    });
  } catch (error) {
    next(error);
  }
}

// Obtener información de una partida
async function getGame(req, res, next) {
  try {
    const { gameId } = req.params;
    
    // Obtener información de la partida con nombres de usuario
    const games = await executeQuery(`
      SELECT g.*, 
             host.username AS host_username, 
             guest.username AS guest_username,
             winner.username AS winner_username
      FROM game g
      LEFT JOIN users host ON g.host_user = host.id
      LEFT JOIN users guest ON g.guest_user = guest.id
      LEFT JOIN users winner ON g.winner = winner.id
      WHERE g.id = ?
    `, [gameId]);
    
    if (games.length === 0) {
      throw new ApiError(404, 'Partida no encontrada');
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        game: games[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

// Obtener partida por código
async function getGameByCode(req, res, next) {
  try {
    const { code } = req.params;
    
    // Obtener información de la partida con nombres de usuario
    const games = await executeQuery(`
      SELECT g.*, 
             host.username AS host_username, 
             guest.username AS guest_username,
             winner.username AS winner_username
      FROM game g
      LEFT JOIN users host ON g.host_user = host.id
      LEFT JOIN users guest ON g.guest_user = guest.id
      LEFT JOIN users winner ON g.winner = winner.id
      WHERE g.code = ?
    `, [code.toUpperCase()]);
    
    if (games.length === 0) {
      throw new ApiError(404, 'Partida no encontrada');
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        game: games[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGame,
  joinGameByCode,
  endGame,
  getGame,
  getGameByCode
};
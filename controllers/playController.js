const { executeQuery } = require('../config/db');
const { ApiError } = require('../utils/errorHandler');

// Registrar una jugada
async function registerPlay(req, res, next) {
  try {
    const userId = req.user.id;
    const { gameId } = req.params;
    const { dice, column } = req.body;
    
    // Validar datos
    if (dice === undefined || column === undefined) {
      throw new ApiError(400, 'Se requiere el valor del dado y la columna');
    }
    
    if (column < 0 || column > 2) {
      throw new ApiError(400, 'La columna debe estar entre 0 y 2');
    }
    
    if (dice < 1 || dice > 6) {
      throw new ApiError(400, 'El valor del dado debe estar entre 1 y 6');
    }
    
    // Verificar si la partida existe y el usuario es parte de ella
    const games = await executeQuery(
      'SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?)',
      [gameId, userId, userId]
    );
    
    if (games.length === 0) {
      throw new ApiError(404, 'Partida no encontrada o no eres parte de ella');
    }
    
    const game = games[0];
    
    // Verificar que la partida no haya terminado
    if (game.ended_at) {
      throw new ApiError(400, 'La partida ya ha terminado');
    }
    
    // Verificar que la partida tenga ambos jugadores
    if (!game.guest_user) {
      throw new ApiError(400, 'La partida aún no tiene un segundo jugador');
    }
    
    // Verificar que sea el turno del jugador
    const lastPlay = await executeQuery(
      'SELECT * FROM plays WHERE match_id = ? ORDER BY id DESC LIMIT 1',
      [gameId]
    );
    
    // Si hay una jugada anterior, verificar que no sea del mismo jugador
    if (lastPlay.length > 0 && lastPlay[0].move == userId) {
      throw new ApiError(400, 'No es tu turno');
    }
    
    // Registrar la jugada
    const result = await executeQuery(
      'INSERT INTO plays (match_id, move, dice, col, created_at) VALUES (?, ?, ?, ?, NOW())',
      [gameId, userId, dice, column]
    );
    
    const playId = result.insertId;
    
    // Obtener información del usuario que hizo la jugada
    const user = await executeQuery('SELECT username FROM users WHERE id = ?', [userId]);
    
    res.status(201).json({
      status: 'success',
      message: 'Jugada registrada correctamente',
      data: {
        playId,
        gameId,
        userId,
        username: user[0].username,
        dice,
        column
      }
    });
  } catch (error) {
    next(error);
  }
}

// Obtener jugadas de una partida
async function getGamePlays(req, res, next) {
  try {
    const { gameId } = req.params;
    
    // Verificar si la partida existe
    const games = await executeQuery('SELECT * FROM game WHERE id = ?', [gameId]);
    if (games.length === 0) {
      throw new ApiError(404, 'Partida no encontrada');
    }
    
    // Obtener todas las jugadas de la partida con información del usuario
    const plays = await executeQuery(`
      SELECT p.*, u.username
      FROM plays p
      JOIN users u ON p.move = u.id
      WHERE p.match_id = ?
      ORDER BY p.id ASC
    `, [gameId]);
    
    res.status(200).json({
      status: 'success',
      data: {
        plays
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerPlay,
  getGamePlays
};
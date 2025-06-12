const { executeQuery } = require("../config/db")
const { ApiError } = require("../utils/errorHandler")

// Función para generar código aleatorio de 5 caracteres (mayúsculas y números)
function generateGameCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Crear una nueva partida
async function createGame(req, res, next) {
  try {
    const hostUserId = req.user.id

    // Generar código único para la partida
    let gameCode
    let isUnique = false

    // Asegurar que el código sea único
    while (!isUnique) {
      gameCode = generateGameCode()
      const existingGame = await executeQuery("SELECT id FROM game WHERE code = ?", [gameCode])
      if (existingGame.length === 0) {
        isUnique = true
      }
    }

    // Crear partida en la base de datos
    const result = await executeQuery("INSERT INTO game (code, host_user, started_at) VALUES (?, ?, NOW())", [
      gameCode,
      hostUserId,
    ])

    const gameId = result.insertId

    res.status(201).json({
      status: "success",
      message: "Partida creada correctamente",
      data: {
        gameId,
        gameCode,
        hostUserId,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Unirse a una partida usando el código
async function joinGameByCode(req, res, next) {
  try {
    const guestUserId = req.user.id
    const { code } = req.body

    if (!code) {
      throw new ApiError(400, "Se requiere el código de la partida")
    }

    // Verificar si la partida existe
    const games = await executeQuery("SELECT * FROM game WHERE code = ?", [code.toUpperCase()])
    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada")
    }

    const game = games[0]

    // Verificar si la partida ya tiene un invitado
    if (game.guest_user) {
      throw new ApiError(409, "La partida ya está completa")
    }

    // Verificar que el usuario no sea el anfitrión
    if (game.host_user == guestUserId) {
      throw new ApiError(400, "No puedes unirte a tu propia partida")
    }

    // Actualizar la partida con el usuario invitado
    await executeQuery("UPDATE game SET guest_user = ? WHERE id = ?", [guestUserId, game.id])

    // Obtener información completa de la partida con nombres de usuario
    const updatedGame = await executeQuery(
      `
      SELECT g.*, 
             host.username AS host_username, 
             guest.username AS guest_username
      FROM game g
      LEFT JOIN users host ON g.host_user = host.id
      LEFT JOIN users guest ON g.guest_user = guest.id
      WHERE g.id = ?
    `,
      [game.id],
    )

    res.status(200).json({
      status: "success",
      message: "Te has unido a la partida correctamente",
      data: {
        game: updatedGame[0],
      },
    })
  } catch (error) {
    next(error)
  }
}

// Finalizar una partida - SIN VALIDACIONES COMPLEJAS
async function endGame(req, res, next) {
  try {
    const userId = req.user.id
    const { gameId } = req.params
    const { winnerId } = req.body

    // Solo verificar que la partida existe y el usuario es parte de ella
    const games = await executeQuery("SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?)", [
      gameId,
      userId,
      userId,
    ])

    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada o no tienes permiso")
    }

    // Actualizar la partida con el ganador y fecha de finalización - CONFIAR EN EL CLIENTE
    await executeQuery("UPDATE game SET winner = ?, ended_at = NOW() WHERE id = ?", [winnerId, gameId])

    // Obtener información del ganador
    const winner = await executeQuery("SELECT username FROM users WHERE id = ?", [winnerId])

    res.status(200).json({
      status: "success",
      message: "Partida finalizada correctamente",
      data: {
        gameId,
        winnerId,
        winnerUsername: winner[0].username,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obtener información de una partida
async function getGame(req, res, next) {
  try {
    const { gameId } = req.params

    // Obtener información de la partida con nombres de usuario
    const games = await executeQuery(
      `
      SELECT g.*, 
             host.username AS host_username, 
             guest.username AS guest_username,
             winner.username AS winner_username
      FROM game g
      LEFT JOIN users host ON g.host_user = host.id
      LEFT JOIN users guest ON g.guest_user = guest.id
      LEFT JOIN users winner ON g.winner = winner.id
      WHERE g.id = ?
    `,
      [gameId],
    )

    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada")
    }

    res.status(200).json({
      status: "success",
      data: {
        game: games[0],
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obtener partida por código
async function getGameByCode(req, res, next) {
  try {
    const { code } = req.params

    // Obtener información de la partida con nombres de usuario
    const games = await executeQuery(
      `
      SELECT g.*, 
             host.username AS host_username, 
             guest.username AS guest_username,
             winner.username AS winner_username
      FROM game g
      LEFT JOIN users host ON g.host_user = host.id
      LEFT JOIN users guest ON g.guest_user = guest.id
      LEFT JOIN users winner ON g.winner = winner.id
      WHERE g.code = ?
    `,
      [code.toUpperCase()],
    )

    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada")
    }

    res.status(200).json({
      status: "success",
      data: {
        game: games[0],
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obtener estado completo del juego con información de columnas - SIN VALIDACIONES
async function getGameState(req, res, next) {
  try {
    const { gameId } = req.params

    // Obtener información de la partida
    const games = await executeQuery(
      `
      SELECT g.*, 
             host.username AS host_username, 
             guest.username AS guest_username,
             winner.username AS winner_username
      FROM game g
      LEFT JOIN users host ON g.host_user = host.id
      LEFT JOIN users guest ON g.guest_user = guest.id
      LEFT JOIN users winner ON g.winner = winner.id
      WHERE g.id = ?
    `,
      [gameId],
    )

    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada")
    }

    const game = games[0]

    // Obtener todas las jugadas de la partida
    const plays = await executeQuery(
      `
      SELECT p.*, u.username
      FROM plays p
      JOIN users u ON p.move = u.id
      WHERE p.match_id = ?
      ORDER BY p.id ASC
    `,
      [gameId],
    )

    // Organizar el estado del juego SIN VALIDACIONES DE CANTIDAD
    const gameState = {
      game: {
        id: game.id,
        code: game.code,
        hostUser: game.host_user,
        guestUser: game.guest_user,
        hostUsername: game.host_username,
        guestUsername: game.guest_username,
        winner: game.winner,
        winnerUsername: game.winner_username,
        startedAt: game.started_at,
        endedAt: game.ended_at,
      },
      columns: {
        // Columnas del host (jugador 1) - IDs 1, 2, 3
        1: [], // columna 0 del host
        2: [], // columna 1 del host
        3: [], // columna 2 del host
        // Columnas del guest (jugador 2) - IDs 4, 5, 6
        4: [], // columna 0 del guest
        5: [], // columna 1 del guest
        6: [], // columna 2 del guest
      },
      currentTurn: null,
      plays: plays,
      gameStatus: game.ended_at ? "finished" : game.guest_user ? "playing" : "waiting",
    }

    // Llenar las columnas con los dados jugados SIN LÍMITES
    plays.forEach((play) => {
      const isHostPlay = play.move === game.host_user
      let columnId

      if (isHostPlay) {
        // Jugada del host - columnas 1, 2, 3
        columnId = (play.col + 1).toString()
      } else {
        // Jugada del guest - columnas 4, 5, 6
        columnId = (play.col + 4).toString()
      }

      if (gameState.columns[columnId]) {
        gameState.columns[columnId].push(play.dice)
      }
    })

    // Determinar de quién es el turno
    if (game.ended_at) {
      gameState.currentTurn = null // Juego terminado
    } else if (plays.length === 0) {
      gameState.currentTurn = game.host_user // El host siempre empieza
    } else {
      const lastPlay = plays[plays.length - 1]
      // El turno es del jugador que NO hizo la última jugada
      gameState.currentTurn = lastPlay.move === game.host_user ? game.guest_user : game.host_user
    }

    res.status(200).json({
      status: "success",
      data: gameState,
    })
  } catch (error) {
    next(error)
  }
}

// Eliminar una partida (solo el host puede eliminarla)
async function deleteGame(req, res, next) {
  try {
    const userId = req.user.id
    const { gameId } = req.params

    // Verificar que la partida existe y el usuario es el host
    const games = await executeQuery(
      "SELECT * FROM game WHERE id = ? AND host_user = ?",
      [gameId, userId],
    )

    if (games.length === 0) {
      throw new ApiError(403, "Solo el host puede eliminar la partida o la partida no existe")
    }

    // Eliminar la partida
    await executeQuery("DELETE FROM game WHERE id = ?", [gameId])

    res.status(200).json({
      status: "success",
      message: "Partida eliminada correctamente",
      data: { gameId },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createGame,
  joinGameByCode,
  endGame,
  getGame,
  getGameByCode,
  getGameState,
  deleteGame, // Exportar el nuevo servicio
}

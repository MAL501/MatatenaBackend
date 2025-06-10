const { executeQuery } = require("../config/db")
const { ApiError } = require("../utils/errorHandler")

// Registrar una jugada - SIN VALIDACIONES DE LÓGICA DE JUEGO
async function registerPlay(req, res, next) {
  try {
    const userId = req.user.id
    const { gameId } = req.params
    const { dice, column } = req.body

    // Validar solo que los datos básicos estén presentes
    if (dice === undefined || column === undefined) {
      throw new ApiError(400, "Se requiere el valor del dado y la columna")
    }

    // Validar que column sea un string válido del frontend
    if (!["1", "2", "3", "4", "5", "6"].includes(column.toString())) {
      throw new ApiError(400, "La columna debe ser 1, 2, 3, 4, 5 o 6")
    }

    if (dice < 1 || dice > 6) {
      throw new ApiError(400, "El valor del dado debe estar entre 1 y 6")
    }

    // Verificar solo que la partida existe y el usuario es parte de ella
    const games = await executeQuery("SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?)", [
      gameId,
      userId,
      userId,
    ])

    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada o no eres parte de ella")
    }

    // Convertir el ID de columna del frontend al formato de la base de datos
    let dbColumn
    if (["1", "2", "3"].includes(column.toString())) {
      dbColumn = Number.parseInt(column.toString()) - 1 // 0, 1, 2
    } else {
      dbColumn = Number.parseInt(column.toString()) - 4 // 0, 1, 2
    }

    // Registrar la jugada SIN VALIDACIONES ADICIONALES
    const result = await executeQuery(
      "INSERT INTO plays (match_id, move, dice, col, created_at) VALUES (?, ?, ?, ?, NOW())",
      [gameId, userId, dice, dbColumn],
    )

    const playId = result.insertId

    // Obtener información del usuario que hizo la jugada
    const user = await executeQuery("SELECT username FROM users WHERE id = ?", [userId])

    res.status(201).json({
      status: "success",
      message: "Jugada registrada correctamente",
      data: {
        playId,
        gameId,
        userId,
        username: user[0].username,
        dice,
        column: column.toString(), // Devolver el ID de columna del frontend
        dbColumn, // También incluir el valor de la base de datos para debug
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obtener jugadas de una partida
async function getGamePlays(req, res, next) {
  try {
    const { gameId } = req.params

    // Verificar si la partida existe
    const games = await executeQuery("SELECT * FROM game WHERE id = ?", [gameId])
    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada")
    }

    // Obtener todas las jugadas de la partida con información del usuario
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

    res.status(200).json({
      status: "success",
      data: {
        plays,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  registerPlay,
  getGamePlays,
}

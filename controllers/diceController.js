const { executeQuery } = require("../config/db")
const { ApiError } = require("../utils/errorHandler")

// Función para obtener un dado basado en probabilidades
function getWeightedRandomDice(probabilities) {
  // Normalizar probabilidades (asegurar que sumen 1)
  const total = probabilities.reduce((sum, prob) => sum + prob, 0)

  if (total === 0) {
    // Si todas las probabilidades son 0, devolver dado aleatorio
    return Math.floor(Math.random() * 6) + 1
  }

  const normalizedProbs = probabilities.map((prob) => prob / total)

  // Generar número aleatorio entre 0 y 1
  const random = Math.random()

  // Seleccionar dado basado en probabilidades acumulativas
  let cumulativeProb = 0
  for (let i = 0; i < normalizedProbs.length; i++) {
    cumulativeProb += normalizedProbs[i]
    if (random <= cumulativeProb) {
      return i + 1 // Los dados van de 1 a 6
    }
  }

  // Fallback (no debería llegar aquí)
  return 6
}

// Obtener un dado para un usuario
async function getDiceForUser(req, res, next) {
  try {
    const userId = req.user.id

    // Obtener las probabilidades del usuario de la tabla gambling
    const gamblingData = await executeQuery(
      "SELECT dice_1, dice_2, dice_3, dice_4, dice_5, dice_6 FROM gambling WHERE user_id = ?",
      [userId],
    )

    let probabilities

    if (gamblingData.length === 0) {
      // Si el usuario no tiene datos de gambling, crear registro con probabilidades iguales
      const defaultProb = 1.0 / 6 // 16.67% para cada dado

      await executeQuery(
        "INSERT INTO gambling (user_id, dice_1, dice_2, dice_3, dice_4, dice_5, dice_6, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [userId, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb],
      )

      probabilities = [defaultProb, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb]
    } else {
      // Usar las probabilidades existentes
      const data = gamblingData[0]
      probabilities = [
        Number.parseFloat(data.dice_1),
        Number.parseFloat(data.dice_2),
        Number.parseFloat(data.dice_3),
        Number.parseFloat(data.dice_4),
        Number.parseFloat(data.dice_5),
        Number.parseFloat(data.dice_6),
      ]
    }

    // Obtener el dado basado en probabilidades
    const dice = getWeightedRandomDice(probabilities)

    console.log(`🎲 Usuario ${userId} obtuvo dado: ${dice} con probabilidades:`, probabilities)

    res.status(200).json({
      status: "success",
      data: {
        dice,
        probabilities: {
          dice_1: probabilities[0],
          dice_2: probabilities[1],
          dice_3: probabilities[2],
          dice_4: probabilities[3],
          dice_5: probabilities[4],
          dice_6: probabilities[5],
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obtener las probabilidades de un usuario
async function getUserProbabilities(req, res, next) {
  try {
    const userId = req.user.id

    const gamblingData = await executeQuery("SELECT * FROM gambling WHERE user_id = ?", [userId])

    if (gamblingData.length === 0) {
      // Crear registro con probabilidades por defecto
      const defaultProb = 1.0 / 6

      await executeQuery(
        "INSERT INTO gambling (user_id, dice_1, dice_2, dice_3, dice_4, dice_5, dice_6, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [userId, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb],
      )

      return res.status(200).json({
        status: "success",
        data: {
          user_id: userId,
          dice_1: defaultProb,
          dice_2: defaultProb,
          dice_3: defaultProb,
          dice_4: defaultProb,
          dice_5: defaultProb,
          dice_6: defaultProb,
          created_at: new Date(),
          updated_at: new Date(),
        },
      })
    }

    res.status(200).json({
      status: "success",
      data: gamblingData[0],
    })
  } catch (error) {
    next(error)
  }
}

// Actualizar las probabilidades de un usuario
async function updateUserProbabilities(req, res, next) {
  try {
    const userId = req.user.id
    const { dice_1, dice_2, dice_3, dice_4, dice_5, dice_6 } = req.body

    // Validar que todas las probabilidades estén presentes
    if (
      dice_1 === undefined ||
      dice_2 === undefined ||
      dice_3 === undefined ||
      dice_4 === undefined ||
      dice_5 === undefined ||
      dice_6 === undefined
    ) {
      throw new ApiError(400, "Se requieren todas las probabilidades (dice_1 a dice_6)")
    }

    // Validar que las probabilidades sean números positivos
    const probs = [dice_1, dice_2, dice_3, dice_4, dice_5, dice_6]
    for (const prob of probs) {
      if (isNaN(prob) || prob < 0) {
        throw new ApiError(400, "Las probabilidades deben ser números positivos")
      }
    }

    // Verificar si el usuario ya tiene un registro
    const existingData = await executeQuery("SELECT id FROM gambling WHERE user_id = ?", [userId])

    if (existingData.length === 0) {
      // Crear nuevo registro
      await executeQuery(
        "INSERT INTO gambling (user_id, dice_1, dice_2, dice_3, dice_4, dice_5, dice_6, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [userId, dice_1, dice_2, dice_3, dice_4, dice_5, dice_6],
      )
    } else {
      // Actualizar registro existente
      await executeQuery(
        "UPDATE gambling SET dice_1 = ?, dice_2 = ?, dice_3 = ?, dice_4 = ?, dice_5 = ?, dice_6 = ?, updated_at = NOW() WHERE user_id = ?",
        [dice_1, dice_2, dice_3, dice_4, dice_5, dice_6, userId],
      )
    }

    res.status(200).json({
      status: "success",
      message: "Probabilidades actualizadas correctamente",
      data: {
        user_id: userId,
        dice_1,
        dice_2,
        dice_3,
        dice_4,
        dice_5,
        dice_6,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getDiceForUser,
  getUserProbabilities,
  updateUserProbabilities,
}

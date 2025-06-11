const express = require("express")
const { getDiceForUser, getUserProbabilities, updateUserProbabilities } = require("../controllers/diceController")
const { authenticate } = require("../middleware/authMiddleware")

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(authenticate)

/**
 * @swagger
 * /dice/roll:
 *   get:
 *     summary: Obtener un dado basado en las probabilidades del usuario
 *     tags: [Dados]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dado generado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         dice:
 *                           type: integer
 *                           minimum: 1
 *                           maximum: 6
 *                           description: Valor del dado generado
 *                         probabilities:
 *                           type: object
 *                           description: Probabilidades actuales del usuario
 */
router.get("/roll", getDiceForUser)

/**
 * @swagger
 * /dice/probabilities:
 *   get:
 *     summary: Obtener las probabilidades actuales del usuario
 *     tags: [Dados]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Probabilidades obtenidas correctamente
 */
router.get("/probabilities", getUserProbabilities)

/**
 * @swagger
 * /dice/probabilities:
 *   put:
 *     summary: Actualizar las probabilidades del usuario
 *     tags: [Dados]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dice_1
 *               - dice_2
 *               - dice_3
 *               - dice_4
 *               - dice_5
 *               - dice_6
 *             properties:
 *               dice_1:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 0.16
 *               dice_2:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 0.17
 *               dice_3:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 0.15
 *               dice_4:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 0.18
 *               dice_5:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 0.16
 *               dice_6:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 0.18
 *     responses:
 *       200:
 *         description: Probabilidades actualizadas correctamente
 */
router.put("/probabilities", updateUserProbabilities)

module.exports = router

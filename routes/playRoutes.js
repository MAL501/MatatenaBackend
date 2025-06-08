const express = require('express');
const { registerPlay, getGamePlays } = require('../controllers/playController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @swagger
 * /games/{gameId}/play:
 *   post:
 *     summary: Registrar una jugada
 *     tags: [Jugadas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único de la partida
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dice
 *               - column
 *             properties:
 *               dice:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 6
 *                 example: 5
 *                 description: Valor del dado (1-6)
 *               column:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 2
 *                 example: 1
 *                 description: Columna donde colocar el dado (0-2)
 *     responses:
 *       201:
 *         description: Jugada registrada correctamente
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
 *                         playId:
 *                           type: string
 *                         gameId:
 *                           type: string
 *                         userId:
 *                           type: integer
 *                         dice:
 *                           type: integer
 *                         column:
 *                           type: integer
 *       400:
 *         description: Datos inválidos o no es tu turno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Partida no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:gameId/play', registerPlay);

/**
 * @swagger
 * /games/{gameId}/plays:
 *   get:
 *     summary: Obtener todas las jugadas de una partida
 *     tags: [Jugadas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único de la partida
 *     responses:
 *       200:
 *         description: Lista de jugadas de la partida
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
 *                         plays:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/Play'
 *                               - type: object
 *                                 properties:
 *                                   username:
 *                                     type: string
 *                                     description: Nombre del usuario que hizo la jugada
 *       404:
 *         description: Partida no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:gameId/plays', getGamePlays);

module.exports = router;
const express = require("express")
const http = require("http")
const cors = require("cors")
const dotenv = require("dotenv")
const swaggerUi = require("swagger-ui-express")
const swaggerSpec = require("./config/swagger")

// Cargar variables de entorno
dotenv.config()

// Importar rutas
const authRoutes = require("./routes/authRoutes")
const gameRoutes = require("./routes/gameRoutes")
const playRoutes = require("./routes/playRoutes")
const diceRoutes = require("./routes/diceRoutes") // Nueva ruta para dados

// Importar middleware de errores
const { errorHandler } = require("./utils/errorHandler")

// Importar configuración de WebSockets
const setupWebSockets = require("./websockets/gameSocket")

// Crear aplicación Express
const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging de rutas
app.use((req, res, next) => {
  //console.log(`${req.method} ${req.url}`);
  next();
});

// Documentación Swagger
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Matatena API Documentation",
  }),
)

// Endpoint para obtener el JSON de Swagger
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json")
  res.send(swaggerSpec)
})

// Rutas
app.use("/auth", authRoutes)
app.use("/dice", diceRoutes) 
app.use("/games", playRoutes)
app.use("/games", gameRoutes)

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "API de Matatena funcionando correctamente",
    documentation: "http://localhost:8080/api-docs",
  })
})

// Middleware de manejo de errores
app.use(errorHandler)

// Crear servidor HTTP
const server = http.createServer(app)

// Configurar WebSockets
const io = setupWebSockets(server)

// Puerto
const PORT = process.env.PORT || 8080

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`)
  console.log(`Documentación Swagger disponible en http://localhost:${PORT}/api-docs`)
})

# 1. Elegir una imagen base (aquí usamos Node.js 18 slim)
FROM node:18-slim

# 2. Crear directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 3. Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# 4. Instalar dependencias
RUN npm ci --only=production

# 5. Copiar el resto del código de la aplicación
COPY . .

# 6. Exponer el puerto en el que corre la app (ajusta según tu proyecto)
EXPOSE 8080

# 7. Comando por defecto para iniciar el servidor
CMD ["npm", "start"]

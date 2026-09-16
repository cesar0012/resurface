# Resurface Oregon Construction LLC — imagen de producción para Coolify
FROM python:3.12-alpine

WORKDIR /app

# Copiar el sitio completo (assets incluidos: viven en el repositorio)
COPY . .

# Puerto inyectado por Coolify mediante la variable de entorno PORT
ENV PORT=8080
EXPOSE 8080

# Servidor estático con rutas amigables, 301 y cabeceras por ambiente
CMD ["python", "server.py"]

# Etapa de build: compila la SPA con Vite
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Las variables VITE_* se incrustan en tiempo de build
ARG VITE_USE_MOCK=false
ARG VITE_API_BASE_URL=/api
ENV VITE_USE_MOCK=$VITE_USE_MOCK VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Etapa de ejecución: nginx sirve la SPA y reenvía /api al backend (evita CORS)
FROM nginx:1.27-alpine
ENV BACKEND_URL=http://backend:8080
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

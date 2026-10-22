# =============================================================================
# Dockerfile gộp cho Render: build backend (Spring Boot) + frontend (React/Vite),
# chạy chung trong 1 container (nginx phục vụ frontend và proxy /api, /uploads
# sang Spring Boot) để giữ nguyên kiến trúc "cùng origin".
# =============================================================================

# ---------- Stage 1: build backend ----------
FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn -q -DskipTests dependency:go-offline || true
COPY backend/src ./src
RUN mvn -q -DskipTests package

# ---------- Stage 2: build frontend ----------
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ---------- Stage 3: runtime (nginx + JRE) ----------
FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache nginx supervisor tzdata

WORKDIR /app
COPY --from=backend-build /app/target/*.jar app.jar
COPY --from=frontend-build /app/dist /usr/share/nginx/html

COPY render/nginx.conf /etc/nginx/http.d/default.conf
COPY render/supervisord.conf /etc/supervisord.conf
COPY render/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

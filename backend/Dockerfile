FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY backend/pom.xml .
COPY backend/src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/uploads

EXPOSE 8080

# Render Blueprint cấp DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD qua env.
# Runtime docker không cho dùng startCommand nên dựng JDBC URL ngay tại đây.
# Khi không có DB_HOST (chạy local docker-compose) thì giữ nguyên SPRING_DATASOURCE_URL.
ENTRYPOINT ["sh", "-c", "if [ -n \"$DB_HOST\" ]; then export SPRING_DATASOURCE_URL=\"jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require\"; export SPRING_DATASOURCE_USERNAME=\"${DB_USER}\"; fi; exec java -jar app.jar"]
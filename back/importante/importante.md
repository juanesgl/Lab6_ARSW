# Guía completa para ejecutar el proyecto

Este documento explica de forma detallada cómo ejecutar correctamente el proyecto de la Parte 2 del laboratorio.

El proyecto corresponde a una API desarrollada con **Spring Boot**, conectada a una base de datos **PostgreSQL** que se ejecuta mediante **Docker Compose**. Además, la API utiliza autenticación mediante **JWT**, por lo que para consumir los endpoints protegidos primero se debe obtener un token de acceso.

El orden correcto de ejecución es:

1. Abrir Docker.
2. Levantar la base de datos PostgreSQL.
3. Verificar que el contenedor esté corriendo.
4. Ejecutar la aplicación Spring Boot.
5. Obtener un token JWT mediante el endpoint de login.
6. Consumir los endpoints protegidos usando el token.
7. Al finalizar, detener la aplicación y el contenedor.

---

# 1. Requisitos previos

Antes de ejecutar el proyecto, se debe tener instalado lo siguiente:

- Java JDK 21.
- Maven 3.9 o superior.
- Docker.
- Docker Compose.
- Git, en caso de clonar el proyecto desde un repositorio.
- Un IDE o editor de código, por ejemplo:
    - IntelliJ IDEA.
    - Visual Studio Code.
    - Eclipse.

Para comprobar que las herramientas están instaladas correctamente, se pueden ejecutar los siguientes comandos en una terminal.

Verificar Java:

```bash
java -version
```

Verificar Maven:

```bash
mvn -version
```

Verificar Docker:

```bash
docker --version
```

Verificar Docker Compose:

```bash
docker compose version
```

Si alguno de estos comandos no funciona, primero se debe instalar o configurar la herramienta correspondiente antes de continuar.

---

# 2. Archivos importantes del proyecto

Dentro del proyecto se encuentran varios archivos importantes para la ejecución:

```text
Parte2/
├── importante/
│   ├── importante.md
│   └── respuestas.md
├── src/
├── api.http
├── compose.yaml
├── Dockerfile
├── init.sql
├── LICENSE
├── pom.xml
└── README.md
```

Los archivos más importantes para ejecutar el proyecto son:

- `compose.yaml`: define el servicio de PostgreSQL que se ejecuta con Docker.
- `init.sql`: contiene instrucciones SQL para inicializar la base de datos.
- `pom.xml`: contiene la configuración Maven y las dependencias del proyecto.
- `src/main/resources/application.yml`: contiene la configuración de Spring Boot.
- `api.http`: contiene peticiones HTTP para probar el login y los endpoints protegidos.
- `Dockerfile`: permite construir una imagen Docker de la aplicación Spring Boot, si se desea ejecutar la aplicación también en contenedor.

---

# 3. Configuración de PostgreSQL

La base de datos del proyecto se ejecuta usando PostgreSQL dentro de Docker.

La configuración principal definida para PostgreSQL es:

```yaml
POSTGRES_DB: lab4_arsw
POSTGRES_USER: postgres
POSTGRES_PASSWORD: chefai?
```

El contenedor expone el puerto:

```text
5432
```

Por lo tanto, la aplicación Spring Boot se conecta a PostgreSQL usando una URL similar a:

```text
jdbc:postgresql://localhost:5432/lab4_arsw
```

Es importante que la base de datos esté corriendo antes de iniciar la aplicación Spring Boot. Si PostgreSQL no está disponible, la aplicación puede fallar al arrancar porque no podrá conectarse a la base de datos.

---

# 4. Levantar la base de datos con Docker Compose

Antes de ejecutar Spring Boot, se debe iniciar PostgreSQL.

Desde la raíz del proyecto, ejecutar:

```bash
docker compose up -d
```

Este comando hace lo siguiente:

- Lee el archivo `compose.yaml`.
- Descarga la imagen de PostgreSQL si no existe localmente.
- Crea el contenedor de base de datos.
- Ejecuta PostgreSQL en segundo plano.
- Expone el puerto `5432`.

La opción `-d` significa que el contenedor queda ejecutándose en segundo plano.

---

# 5. Verificar que el contenedor esté corriendo

Después de levantar Docker Compose, se debe verificar que el contenedor esté activo.

Ejecutar:

```bash
docker ps
```

Debe aparecer un contenedor con un nombre similar a:

```text
LAB4_ARSW-POSTGRES
```

También debe aparecer el puerto:

```text
0.0.0.0:5432->5432/tcp
```

Esto indica que PostgreSQL está corriendo y que el puerto `5432` está disponible para que Spring Boot se conecte.

---

# 6. Comandos para Windows

En Windows, primero se debe abrir **Docker Desktop** y esperar a que Docker esté iniciado.

Luego, desde la raíz del proyecto, ejecutar:

```bash
docker compose up -d
```

Verificar que el contenedor esté corriendo:

```bash
docker ps
```

Detener el contenedor por nombre:

```bash
docker stop LAB4_ARSW-POSTGRES
```

Detener todos los servicios definidos en Docker Compose:

```bash
docker compose down
```

Ver logs del contenedor:

```bash
docker logs LAB4_ARSW-POSTGRES
```

Reiniciar el contenedor:

```bash
docker restart LAB4_ARSW-POSTGRES
```

---

# 7. Comandos para macOS

En macOS, los comandos normalmente son los mismos que en Windows.

Levantar la base de datos:

```bash
docker compose up -d
```

Verificar el estado del contenedor:

```bash
docker ps
```

Detener los servicios:

```bash
docker compose down
```

Ver logs:

```bash
docker logs LAB4_ARSW-POSTGRES
```

Reiniciar el contenedor:

```bash
docker restart LAB4_ARSW-POSTGRES
```

---

# 8. Comandos para Linux

En Linux, dependiendo de la configuración del sistema, puede ser necesario usar `sudo`.

Primero se puede intentar ejecutar Docker sin `sudo`:

```bash
docker compose up -d
```

Si aparece un error de permisos, ejecutar:

```bash
sudo docker compose up -d
```

Verificar el contenedor sin `sudo`:

```bash
docker ps
```

O con `sudo`:

```bash
sudo docker ps
```

Detener servicios sin `sudo`:

```bash
docker compose down
```

O con `sudo`:

```bash
sudo docker compose down
```

Ver logs sin `sudo`:

```bash
docker logs LAB4_ARSW-POSTGRES
```

O con `sudo`:

```bash
sudo docker logs LAB4_ARSW-POSTGRES
```

---

# 9. Nota importante para Fedora, Red Hat o sistemas con SELinux

En algunas distribuciones Linux, especialmente Fedora, Red Hat o derivados, SELinux puede bloquear el acceso del contenedor al archivo `init.sql`.

Para evitar ese problema, el volumen del archivo SQL se monta usando el sufijo `:Z`:

```yaml
./init.sql:/docker-entrypoint-initdb.d/init.sql:Z
```

El sufijo:

```text
:Z
```

Permite que Docker ajuste el contexto de seguridad del archivo para que el contenedor pueda leerlo correctamente.

Por esta razón, si se usa Fedora, Red Hat o una distribución con SELinux activo, se recomienda conservar esa configuración.

---

# 10. Ejecutar la aplicación Spring Boot

Cuando PostgreSQL ya esté corriendo, se puede iniciar la aplicación.

Desde la raíz del proyecto, ejecutar:

```bash
mvn spring-boot:run
```

También se puede ejecutar omitiendo las pruebas:

```bash
mvn -DskipTests spring-boot:run
```

Si se desea una salida más corta en consola:

```bash
mvn -q -DskipTests spring-boot:run
```

La aplicación debe iniciar en el puerto:

```text
8080
```

Por lo tanto, la URL base del proyecto es:

```text
http://localhost:8080
```

---

# 11. Verificar que Spring Boot inició correctamente

Cuando la aplicación inicia correctamente, en la consola debe aparecer un mensaje indicando que Spring Boot terminó de arrancar sin errores.

También se puede abrir en el navegador:

```text
http://localhost:8080
```

Es posible que esa ruta no muestre una página web como tal, porque el proyecto funciona principalmente como una API REST.

Para probar correctamente la API, se recomienda usar:

- Swagger UI.
- El archivo `api.http`.
- Postman.
- Insomnia.
- `curl`.

---

# 12. Swagger UI

El proyecto incluye documentación interactiva con Swagger.

Una vez la aplicación esté corriendo, abrir en el navegador:

```text
http://localhost:8080/swagger-ui/index.html
```

También se puede intentar con:

```text
http://localhost:8080/swagger-ui.html
```

Desde Swagger se pueden consultar y probar los endpoints disponibles.

Como varios endpoints están protegidos con JWT, primero se debe obtener un token mediante el login y después usarlo en Swagger mediante el botón `Authorize`.

---

# 13. Login y obtención del token JWT

Para consumir endpoints protegidos, primero se debe obtener un token JWT.

La petición de login es:

```http
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "username": "student",
  "password": "student123"
}
```

Si las credenciales son correctas, la respuesta será similar a:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

El campo importante es:

```text
access_token
```

Ese valor se debe usar para consumir los endpoints protegidos.

---

# 14. Usar el token JWT en peticiones protegidas

Para enviar el token, se debe usar el encabezado `Authorization`.

El formato correcto es:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

Ejemplo:

```http
GET http://localhost:8080/api/blueprints
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Es importante incluir la palabra `Bearer` antes del token.

Si no se envía el token, si se envía mal o si el token está vencido, la API puede responder con errores como:

```text
401 Unauthorized
```

o:

```text
403 Forbidden
```

---

# 15. Probar la API con api.http

El proyecto incluye un archivo llamado `api.http`, que permite ejecutar peticiones directamente desde el IDE.

Primero se ejecuta la petición de login:

```http
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "username": "student",
  "password": "student123"
}
```

Luego se puede ejecutar una petición protegida usando el token obtenido:

```http
GET http://localhost:8080/api/blueprints
Authorization: Bearer {{access_token}}
```

Esto permite comprobar que:

- La aplicación Spring Boot está corriendo.
- PostgreSQL está disponible.
- El endpoint de login funciona.
- El token JWT se genera correctamente.
- Los endpoints protegidos aceptan el token.
- La seguridad de la API está funcionando.

---

# 16. Probar la API con curl

También se puede probar desde consola usando `curl`.

Primero, obtener el token:

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"student123"}'
```

La respuesta incluirá un `access_token`.

Luego, copiar el token y usarlo en una petición protegida:

```bash
curl -X GET http://localhost:8080/api/blueprints \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Reemplazar:

```text
<ACCESS_TOKEN>
```

Por el token real recibido en el login.

---

# 17. Probar la API con Swagger

Para probar con Swagger:

1. Abrir:

```text
http://localhost:8080/swagger-ui/index.html
```

2. Buscar el endpoint de login.
3. Ejecutar el login con:

```json
{
  "username": "student",
  "password": "student123"
}
```

4. Copiar el token recibido.
5. Presionar el botón `Authorize`.
6. Escribir el token con el formato:

```text
Bearer <ACCESS_TOKEN>
```

7. Confirmar la autorización.
8. Ejecutar los endpoints protegidos.

---

# 18. Flujo completo recomendado para ejecutar el proyecto

A continuación se muestra el flujo completo recomendado desde cero.

Entrar a la carpeta del proyecto:

```bash
cd Parte2
```

Levantar PostgreSQL:

```bash
docker compose up -d
```

Verificar que PostgreSQL esté corriendo:

```bash
docker ps
```

Ejecutar Spring Boot:

```bash
mvn -DskipTests spring-boot:run
```

Abrir Swagger:

```text
http://localhost:8080/swagger-ui/index.html
```

Hacer login:

```http
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "username": "student",
  "password": "student123"
}
```

Consumir un endpoint protegido:

```http
GET http://localhost:8080/api/blueprints
Authorization: Bearer <ACCESS_TOKEN>
```

Detener Spring Boot con:

```text
Ctrl + C
```

Detener Docker Compose:

```bash
docker compose down
```

---

# 19. Comandos útiles de Docker

Levantar servicios:

```bash
docker compose up -d
```

Ver contenedores activos:

```bash
docker ps
```

Ver todos los contenedores, incluyendo detenidos:

```bash
docker ps -a
```

Detener servicios del proyecto:

```bash
docker compose down
```

Detener un contenedor específico:

```bash
docker stop LAB4_ARSW-POSTGRES
```

Reiniciar el contenedor:

```bash
docker restart LAB4_ARSW-POSTGRES
```

Ver logs del contenedor:

```bash
docker logs LAB4_ARSW-POSTGRES
```

Ver logs en tiempo real:

```bash
docker logs -f LAB4_ARSW-POSTGRES
```

Eliminar servicios y red de Docker Compose:

```bash
docker compose down
```

Eliminar servicios, red y volúmenes:

```bash
docker compose down -v
```

Importante: el comando anterior elimina los datos guardados en la base de datos.

---

# 20. Reiniciar completamente la base de datos

Si se necesita borrar toda la información de PostgreSQL y volver a ejecutar el archivo `init.sql`, se debe eliminar el volumen de la base de datos.

Ejecutar:

```bash
docker compose down -v
```

Luego volver a levantar PostgreSQL:

```bash
docker compose up -d
```

Este procedimiento hace que PostgreSQL cree nuevamente la base de datos desde cero.

Debe usarse únicamente si no se necesita conservar la información actual de la base de datos.

---

# 21. Ejecutar la aplicación usando Dockerfile

Además de ejecutar la aplicación con Maven, el proyecto incluye un `Dockerfile` para construir una imagen Docker de la aplicación Spring Boot.

Primero se debe construir la imagen:

```bash
docker build -t blueprints-api .
```

Luego se puede ejecutar el contenedor:

```bash
docker run -p 8080:8080 blueprints-api
```

Sin embargo, para que la aplicación dentro del contenedor pueda conectarse correctamente a PostgreSQL, se debe tener en cuenta que `localhost` dentro del contenedor de la aplicación no apunta al contenedor de PostgreSQL, sino al mismo contenedor de la aplicación.

Por esa razón, para la ejecución local del laboratorio, la forma más sencilla recomendada es:

1. Ejecutar PostgreSQL con Docker Compose.
2. Ejecutar Spring Boot con Maven desde la máquina local.

Es decir:

```bash
docker compose up -d
```

y luego:

```bash
mvn -DskipTests spring-boot:run
```

---

# 22. Error: el puerto 5432 ya está en uso

Este error ocurre cuando ya existe otro servicio usando el puerto `5432`.

Puede pasar si:

- Hay una instalación local de PostgreSQL ejecutándose.
- Hay otro contenedor usando el mismo puerto.
- Otro proyecto está usando PostgreSQL en Docker.

Para revisar los contenedores activos:

```bash
docker ps
```

Para detener el contenedor de este proyecto:

```bash
docker stop LAB4_ARSW-POSTGRES
```

Si el problema es un PostgreSQL local, se puede detener desde los servicios del sistema operativo.

Otra opción es cambiar el puerto externo en `compose.yaml`.

Por ejemplo:

```yaml
ports:
  - "5433:5432"
```

En ese caso, también se debe cambiar la URL de conexión de Spring Boot para usar el puerto `5433`.

La URL quedaría así:

```text
jdbc:postgresql://localhost:5433/lab4_arsw
```

---

# 23. Error: Spring Boot no se puede conectar a PostgreSQL

Si la aplicación no logra conectarse a la base de datos, revisar lo siguiente:

1. Docker está abierto.
2. El contenedor de PostgreSQL está corriendo.
3. El puerto `5432` está disponible.
4. La base de datos se llama `lab4_arsw`.
5. El usuario es `postgres`.
6. La contraseña es `chefai?`.
7. La URL de conexión apunta a `localhost:5432`.

Comando para revisar el contenedor:

```bash
docker ps
```

Comando para ver logs de PostgreSQL:

```bash
docker logs LAB4_ARSW-POSTGRES
```

Si el contenedor no está corriendo, levantarlo nuevamente:

```bash
docker compose up -d
```

---

# 24. Error: permiso denegado al ejecutar Docker en Linux

Si en Linux aparece un error de permisos al ejecutar Docker, se puede usar `sudo`.

Por ejemplo:

```bash
sudo docker compose up -d
```

```bash
sudo docker ps
```

```bash
sudo docker compose down
```

También se puede agregar el usuario actual al grupo de Docker:

```bash
sudo usermod -aG docker $USER
```

Después de ejecutar ese comando, se debe cerrar sesión y volver a iniciarla para que el cambio tenga efecto.

---

# 25. Error: init.sql no se ejecuta

PostgreSQL solo ejecuta automáticamente los scripts ubicados en:

```text
/docker-entrypoint-initdb.d/
```

Cuando la base de datos se crea por primera vez.

Si el volumen de PostgreSQL ya existe, el archivo `init.sql` no se vuelve a ejecutar.

Para forzar que se ejecute de nuevo, eliminar el volumen:

```bash
docker compose down -v
```

Luego levantar otra vez:

```bash
docker compose up -d
```

Esto crea una base de datos nueva y vuelve a ejecutar el script de inicialización.

---

# 26. Error: el token JWT no funciona

Si el endpoint protegido responde con error de autorización, revisar lo siguiente:

1. Que el login se haya ejecutado correctamente.
2. Que se esté copiando el valor exacto de `access_token`.
3. Que el header se llame `Authorization`.
4. Que se esté usando el prefijo `Bearer`.
5. Que haya un espacio entre `Bearer` y el token.
6. Que el token no esté vencido.

Formato correcto:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

Formato incorrecto:

```http
Authorization: <ACCESS_TOKEN>
```

Formato incorrecto:

```http
Bearer: <ACCESS_TOKEN>
```

---

# 27. Error: credenciales inválidas en login

Si el login responde con error, revisar que las credenciales sean exactamente:

```json
{
  "username": "student",
  "password": "student123"
}
```

Si el usuario o la contraseña están mal escritos, el servidor responderá con error de autenticación.

---

# 28. Detener todo el proyecto

Para detener Spring Boot, ir a la terminal donde se está ejecutando y presionar:

```text
Ctrl + C
```

Luego detener PostgreSQL:

```bash
docker compose down
```

Si se está usando Linux con permisos de administrador:

```bash
sudo docker compose down
```

---

# 29. Limpieza completa del entorno

Si se desea detener todo y borrar también los datos de la base de datos:

```bash
docker compose down -v
```

Si se quiere volver a iniciar desde cero:

```bash
docker compose up -d
```

y luego:

```bash
mvn -DskipTests spring-boot:run
```

---

# 30. Resumen rápido de comandos principales

Levantar PostgreSQL:

```bash
docker compose up -d
```

Verificar contenedor:

```bash
docker ps
```

Ejecutar Spring Boot:

```bash
mvn -DskipTests spring-boot:run
```

Abrir Swagger:

```text
http://localhost:8080/swagger-ui/index.html
```

Hacer login:

```http
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "username": "student",
  "password": "student123"
}
```

Consumir endpoint protegido:

```http
GET http://localhost:8080/api/blueprints
Authorization: Bearer <ACCESS_TOKEN>
```

Detener Spring Boot:

```text
Ctrl + C
```

Detener PostgreSQL:

```bash
docker compose down
```

Eliminar también los datos de PostgreSQL:

```bash
docker compose down -v
```

---

# 31. Orden final recomendado

El orden final recomendado para ejecutar el proyecto sin errores es:

1. Abrir Docker o Docker Desktop.
2. Entrar a la carpeta raíz del proyecto.
3. Ejecutar:

```bash
docker compose up -d
```

4. Verificar el contenedor:

```bash
docker ps
```

5. Ejecutar la aplicación:

```bash
mvn -DskipTests spring-boot:run
```

6. Abrir Swagger:

```text
http://localhost:8080/swagger-ui/index.html
```

7. Hacer login para obtener el token.
8. Usar el token en los endpoints protegidos.
9. Al terminar, detener Spring Boot con:

```text
Ctrl + C
```

10. Detener Docker Compose con:

```bash
docker compose down
```

---

# 32. Conclusión

Para ejecutar correctamente el proyecto, lo más importante es respetar el orden de inicio:

1. Primero PostgreSQL con Docker.
2. Después Spring Boot con Maven.
3. Luego el login para obtener el JWT.
4. Finalmente, las pruebas de los endpoints protegidos.

Si se sigue este flujo, el proyecto debería ejecutarse correctamente en Windows, macOS y Linux.
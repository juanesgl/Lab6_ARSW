# Actividades propuestas 

1. Revisar el código de configuración de seguridad (SecurityConfig) e identificar cómo se definen los endpoints públicos y protegidos.

2. Explorar el flujo de login y analizar las claims del JWT emitido.

3. Extender los scopes (blueprints.read, blueprints.write) para controlar otros endpoints de la API, del laboratorio P1 trabajado.

4. Modificar el tiempo de expiración del token y observar el efecto.

5. Documentar en Swagger los endpoints de autenticación y de negocio.

--- 

## Actividad 1  

El sistema de seguridad de la aplicación está gestionado mediante Spring Security (`SecurityConfig.java`), implementando un Resource Server basado en OAuth2/JWT.

### Mapeo de Endpoints

Las reglas de control de acceso se dividen en tres categorías principales:

- **Públicos (Acceso libre):**
    - Monitoreo: `/actuator/health`
    - Autenticación: `/auth/login`
    - Documentación: `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`
- **Protegidos por Scopes (`/api/**`):** Requieren que el token JWT contenga el scope `SCOPE_blueprints.read` **o** `SCOPE_blueprints.write`.
- **Protegidos por Autenticación (Regla por defecto):** Cualquier otra solicitud (incluyendo rutas como `/blueprints/**`) requiere un token válido (`authenticated()`), pero no exige un scope específico.

---

### Hallazgos y Puntos de Atención

Durante la revisión de la configuración, se identificaron dos comportamientos arquitectónicos importantes:

#### 1. Riesgo de Sobre-privilegio en `/api/**`
Actualmente, un usuario cuyo token **solo** tiene el permiso `blueprints.read` puede ejecutar operaciones de escritura (POST, PUT, DELETE) con éxito.

**¿Por qué sucede?**
La regla `.requestMatchers("/api/**").hasAnyAuthority("SCOPE_blueprints.read", "SCOPE_blueprints.write")` no distingue entre métodos HTTP. Al usar `hasAnyAuthority` (que actúa como un operador lógico `OR`), cualquiera de los dos permisos otorga acceso total a todas las operaciones sobre esos endpoints.

#### 2. Ignorancia de la propiedad `jwk-set-uri`
La configuración en el archivo `application.yml` (`spring.security.oauth2.resourceserver.jwt.jwk-set-uri`) es ignorada en la práctica por la aplicación.

**¿Por qué sucede?**
Spring Boot utiliza autoconfiguración, pero da prioridad a los Beans explícitos definidos en el código. Al existir un `@Bean` de tipo `JwtDecoder` en `SecurityConfig.java` que utiliza una clave inyectada localmente (`JwtKeyProvider`), Spring descarta la URL del `application.yml` y usa exclusivamente la configuración local en memoria.

--- 

## Actividad 2 — Flujo de login y claims del JWT

Lo primero que haremos será compilar el proyecto y verificar que todas las dependencias y pruebas se ejecuten correctamente usando el comando `mvn clean install`:

![Primera Imagen](../img/1.png)

Después de esto, levantamos los contenedores de Docker para iniciar la base de datos PostgreSQL:

![Segunda Imagen](../img/2.png)

Una vez que la base de datos está lista, ejecutamos la aplicación, la cual quedará escuchando en el puerto local 8080:

![Tercera Imagen](../img/3.png)

Esto nos permitirá verificar que el servicio está arriba y acceder a la interfaz desde el navegador:

![Cuarta Imagen](../img/4.png)

### Análisis del Payload del JWT

Para entender qué sucede realmente por debajo con la autenticación de los diferentes usuarios (`student` y `assistant`), realizamos peticiones mediante `curl` al endpoint `/auth/login`. Luego, extraemos y decodificamos el payload de sus respectivos tokens JWT para analizar sus *claims*:

![Quinta Imagen](../img/5.png)

![Sexta Imagen](../img/6.png)

![Septima Imagen](../img/7.png)

**Lo que podemos observar detalladamente en estas capturas es lo siguiente:**

1. **Emisor e Identidad (`iss` y `sub`):** El sistema identifica correctamente a cada usuario (`sub` es `student` o `assistant` según corresponda). Además, vemos que el emisor (`iss`) no es un valor por defecto, sino que está configurado con la URL específica de la API (`"https://decsis-eci/blueprints"`).
2. **Tiempo de Vida (`iat` y `exp`):** Al procesar las fechas de emisión y expiración, el script de la terminal nos confirma matemáticamente que los tokens tienen un tiempo de vida (TTL) configurado de exactamente **3600 segundos (1 hora)**.
3. **Falla de Diseño en los Permisos (`scope`):** El hallazgo más crítico es que el sistema asigna **exactamente los mismos privilegios** a ambas cuentas. Tanto el estudiante como el asistente reciben el permiso `"blueprints.read blueprints.write"`. Esto evidencia un problema de diseño, ya que no existe una verdadera segregación de roles que impida a un estudiante modificar registros.

--- 

## Actividad 3 — Extender scopes a los endpoints de negocio

Para solucionar la vulnerabilidad de sobreprivilegio identificada anteriormente, implementamos una estrategia de Control de Acceso Basado en Roles (RBAC) modificando tanto la asignación de permisos como la protección de los recursos.

### 1. Asignación Diferenciada de Permisos
El primer paso fue corregir la clase `InMemoryUserService` para que el proveedor de identidad asigne permisos (`scopes`) acordes al perfil de cada usuario en el momento de emitir el JWT:
- El usuario `student` ahora recibe únicamente el scope `blueprints.read`.
- El usuario `assistant` recibe ambos scopes: `blueprints.read` y `blueprints.write`.

```java
package co.edu.eci.blueprints.security;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class InMemoryUserService {
    private final Map<String, String> users;
    private final Map<String, String> userScopes; 
    private final PasswordEncoder encoder;

    public InMemoryUserService(PasswordEncoder encoder) {
        this.encoder = encoder;
        this.users = Map.of(
            "student", encoder.encode("student123"),
            "assistant", encoder.encode("assistant123")
        );
        
        // Parte nueva agregada para hacer uso de RBAC. 
        this.userScopes = Map.of(
            "student", "blueprints.read",
            "assistant", "blueprints.read"
        );
    }

    public boolean isValid(String username, String rawPassword) {
        String hash = users.get(username);
        return hash != null && encoder.matches(rawPassword, hash);
    }
}
```

### 2. Protección a Nivel de Método (@PreAuthorize)
Aunque las reglas generales de enrutamiento se definen en `SecurityConfig`, la autorización detallada de las operaciones de negocio se delegó a la capa de controladores.

Dado que la aplicación cuenta con `@EnableMethodSecurity`, decidimos aplicar el control de acceso directamente en los *handlers* de `BlueprintsAPIController`, lo que permite un control más granular:

- **Operaciones de Lectura (GET):** Se protegieron con `@PreAuthorize("hasAuthority('SCOPE_blueprints.read')")`.
- **Operaciones de Escritura (POST, PUT):** Se protegieron con `@PreAuthorize("hasAuthority('SCOPE_blueprints.write')")`.

![Octava Imagen](../img/8.png)

### 3. Verificación de Seguridad (Pruebas de Acceso)
Para comprobar la correcta implementación del modelo de seguridad, se ejecutaron las siguientes pruebas:

1. **Generación de Token (Student):** Se obtuvo el `access_token` del usuario `student`. Al decodificar el payload, se verificó que el claim `scope` es exclusivamente `"blueprints.read"`.
2. **Prueba de Lectura (Éxito):** Al realizar una petición `GET /blueprints` con el token del estudiante, el servidor responde correctamente con HTTP `200 OK`.
3. **Prueba de Escritura (Bloqueo):** Al intentar ejecutar un `POST /blueprints` con el mismo token del estudiante, el servidor deniega la operación y devuelve un HTTP `403 Forbidden`, confirmando que el endpoint de escritura está blindado contra usuarios no autorizados.

![Novena Imagen](../img/9.png)

![Decima Imagen](../img/10.png)

Como se evidencia en la **primera imagen**, el proceso de autenticación del usuario `student` genera un JWT cuyo payload ahora refleja un único permiso (`scope: "blueprints.read"`). Al utilizar este token en la cabecera de autorización para consultar los planos (`GET /blueprints`), el servidor valida el *scope* y autoriza la operación exitosamente.

Por otro lado, la **segunda imagen** demuestra la efectividad de la protección a nivel de método. Al intentar inyectar un nuevo plano mediante una petición `POST`, el interceptor de Spring Security detecta la ausencia del permiso `blueprints.write` en el token y bloquea la transacción inmediatamente, retornando el estado `403 Forbidden`.

Con esta validación, se confirma que la vulnerabilidad de **sobreprivilegio** ha sido mitigada y que el control de acceso basado en roles (**RBAC**) está funcionando correctamente en los endpoints de negocio.

---

## Actividad 4

El tiempo de vida de los tokens (Time-To-Live o TTL) no está "quemado" en el código, sino que se parametriza dinámicamente utilizando el sistema de propiedades y perfiles de Spring Boot.

### 1. Trazabilidad de la Configuración
El flujo mediante el cual se determina cuándo expira un token sigue esta ruta en la arquitectura:

1. **`application.yml`:** La raíz de la configuración está en la propiedad `blueprints.security.token-ttl-seconds` (por ejemplo, con un valor por defecto de 3600).
2. **`RsaKeyProperties.java`:** Gracias a la anotación `@ConfigurationProperties(prefix = "blueprints.security")`, Spring Boot inyecta automáticamente el valor numérico definido en el YAML dentro de este *record* de configuración.
3. **`AuthController.java`:** El controlador inyecta la clase `RsaKeyProperties` y extrae el valor. Luego, toma la hora exacta de emisión (`Instant.now()`), le suma esos segundos, y usa el resultado para sellar el *claim* `exp` dentro del JWT. Finalmente, también expone ese valor al cliente en el JSON de respuesta bajo la llave `expires_in`.

---

### 2. Pruebas de Comportamiento del JWT

Para comprobar la robustez de este flujo, realizamos alteraciones en el `application.yml` y analizamos la respuesta del servidor:

**A. Prueba con TTL Corto (30 segundos)**
* Al ajustar `token-ttl-seconds: 30`, el endpoint `/auth/login` devuelve correctamente `"expires_in": 30`.
* Al decodificar el payload en Base64, la diferencia matemática entre las marcas de tiempo de `exp` (Expiración) e `iat` (Emisión) es exactamente de 30 segundos.
* **Resultado del acceso:** Al intentar consumir un endpoint protegido (ej. `GET /blueprints`) transcurridos los 30 segundos, el *Resource Server* de Spring Security intercepta el JWT, detecta que la firma temporal ya caducó y bloquea la transacción devolviendo un código **`HTTP/1.1 401 Unauthorized`** (indicando que la credencial es inválida).





**B. Prueba con TTL Largo (1 día / 86400 segundos)**
* Al ajustar `token-ttl-seconds: 86400`, la aplicación escala la vigencia del token sin problemas.
* Al inspeccionar el payload, se constata que la diferencia entre `iat` y `exp` es matemáticamente consistente (exactamente 24 horas en formato Unix). Esto demuestra que el sistema es flexible para manejar sesiones prolongadas si los requerimientos de negocio o la configuración de seguridad lo ameritan.

## Actividad 5 — Documentación con Swagger

Para finalizar con las actividades propuestas, se documentaron los endpoints de autenticación y de negocio de la API mediante Swagger/OpenAPI. La configuración global de seguridad (Bearer JWT) se definió en `OpenApiConfig.java`, y cada controlador (`BlueprintsAPIController` y `AuthController`) fue enriquecido con anotaciones como `@Tag`, `@Operation` y `@ApiResponses` para describir detalladamente su funcionalidad, requerimientos y posibles respuestas.

### Evidencias de la configuración de Swagger

A continuación, se presentan las evidencias (capturas de pantalla) de la interfaz de Swagger UI (accesible en `http://localhost:8080/swagger-ui.html`):

1. **Captura general de la interfaz de Swagger UI** mostrando ambos controladores (Blueprints y Autenticación).
   ![Evidencia Swagger 1](../img/swagger_1.png)

2. **Captura del botón Authorize**, demostrando que la API exige configuración del token Bearer para probar los endpoints.
   ![Evidencia Swagger 2](../img/swagger_2.png)

3. **Captura de la documentación detallada del endpoint `/auth/login`**, mostrando los modelos esperados de Request (`LoginRequest`) y Response (`TokenResponse`), así como los códigos de estado HTTP configurados (200, 401).
   ![Evidencia Swagger 3](../img/swagger_3.png)

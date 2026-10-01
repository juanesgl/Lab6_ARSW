# Escuela Colombiana de Ingeniería Julio Garavito
## Arquitectura de Software – ARSW
### Laboratorio – Parte 2: BluePrints API con Seguridad JWT (OAuth 2.0)

---

## Integrantes del equipo

| Nombre                                                     | Rol        |
|------------------------------------------------------------|------------|
| [Juan David Valero Abril](https://github.com/Valero25)     | Estudiante |
| [Juan Esteban Sanchez Garcia](https://github.com/juanesgl) | Estudiante |

---

## Descripción

Este laboratorio extiende la **Parte 1** ([Lab_P1_BluePrints_Java21_API](https://github.com/juanesgl/Lab_P1_BluePrints_Java21_API)), agregando **seguridad a la API** mediante **Spring Boot 3, Java 21 y JWT (OAuth 2.0)**.

La API se configura como un **Resource Server**, protegido mediante tokens Bearer firmados con **RS256**. Además, se incluye un endpoint didáctico `/auth/login` que permite emitir tokens para facilitar las pruebas de los diferentes endpoints protegidos.

---

## Objetivos

- Implementar seguridad en servicios REST mediante **OAuth 2.0 Resource Server**.
- Configurar la **emisión y validación de tokens JWT**.
- Proteger los endpoints mediante **roles y scopes**, específicamente `blueprints.read` y `blueprints.write`.
- Integrar la documentación de seguridad en **Swagger/OpenAPI**.

---

## Documentación del laboratorio

Para organizar el desarrollo y las evidencias del laboratorio, se crearon dos archivos `.md`:

- **[`importante.md`](./importante/importante.md)**: contiene las instrucciones para la ejecución de la aplicación y la información relevante para su configuración y funcionamiento.
- **[`respuestas.md`](./importante/respuestas.md)**: contiene la retrospectiva de las actividades propuestas, junto con las respectivas evidencias y respuestas para cada punto.

---

## Licencia

Proyecto educativo con fines académicos – Escuela Colombiana de Ingeniería Julio Garavito.

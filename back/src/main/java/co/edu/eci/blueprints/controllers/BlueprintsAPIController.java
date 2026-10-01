package co.edu.eci.blueprints.controllers;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.Point;
import co.edu.eci.blueprints.persistence.BlueprintNotFoundException;
import co.edu.eci.blueprints.persistence.BlueprintPersistenceException;
import co.edu.eci.blueprints.services.BlueprintsServices;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/blueprints")
@Tag(name = "Blueprints", description = "API para la gestión y consulta de planos arquitectónicos")
public class BlueprintsAPIController {

    private final BlueprintsServices services;

    public BlueprintsAPIController(BlueprintsServices services) { this.services = services; }

    // GET /blueprints
    @Operation(summary = "Obtener todos los planos", description = "Retorna una lista con la totalidad de los planos registrados en el sistema.")
    @ApiResponse(responseCode = "200", description = "Lista de planos obtenida exitosamente")
    @PreAuthorize("hasAuthority('SCOPE_blueprints.read')")
    @GetMapping
    public ResponseEntity<Set<Blueprint>> getAll() {
        return ResponseEntity.ok(services.getAllBlueprints());
    }

    // GET /blueprints/{author}
    @Operation(summary = "Obtener planos por autor", description = "Retorna todos los planos que pertenecen a un autor específico.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Planos del autor encontrados con éxito"),
            @ApiResponse(responseCode = "404", description = "El autor especificado no tiene planos registrados")
    })
    @PreAuthorize("hasAuthority('SCOPE_blueprints.read')")
    @GetMapping("/{author}")
    public ResponseEntity<?> byAuthor(@PathVariable String author) {
        try {
            return ResponseEntity.ok(services.getBlueprintsByAuthor(author));
        } catch (BlueprintNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // GET /blueprints/{author}/{bpname}
    @Operation(summary = "Obtener un plano específico", description = "Busca y retorna un único plano usando el nombre del autor y el nombre del plano.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Plano encontrado con éxito"),
            @ApiResponse(responseCode = "404", description = "El plano solicitado no existe")
    })
    @PreAuthorize("hasAuthority('SCOPE_blueprints.read')")
    @GetMapping("/{author}/{bpname}")
    public ResponseEntity<?> byAuthorAndName(@PathVariable String author, @PathVariable String bpname) {
        try {
            return ResponseEntity.ok(services.getBlueprint(author, bpname));
        } catch (BlueprintNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /blueprints
    @Operation(summary = "Registrar un nuevo plano", description = "Crea y almacena un nuevo plano en el sistema con su autor, nombre y puntos geométricos.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Plano creado exitosamente"),
            @ApiResponse(responseCode = "403", description = "No se pudo crear el plano debido a un conflicto de persistencia (ej. ya existe)"),
            @ApiResponse(responseCode = "400", description = "Datos de entrada inválidos o faltantes")
    })
    @PreAuthorize("hasAuthority('SCOPE_blueprints.write')")
    @PostMapping
    public ResponseEntity<?> add(@Valid @RequestBody NewBlueprintRequest req) {
        try {
            Blueprint bp = new Blueprint(req.author(), req.name(), req.points());
            services.addNewBlueprint(bp);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (BlueprintPersistenceException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }
    }

    // PUT /blueprints/{author}/{bpname}/points
    @Operation(summary = "Agregar un punto a un plano", description = "Añade dinámicamente un nuevo punto coordenado (X, Y) a un plano existente.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "202", description = "Punto añadido y procesado correctamente"),
            @ApiResponse(responseCode = "404", description = "El plano al que se le intenta añadir el punto no fue encontrado")
    })
    @PreAuthorize("hasAuthority('SCOPE_blueprints.write')")
    @PutMapping("/{author}/{bpname}/points")
    public ResponseEntity<?> addPoint(@PathVariable String author, @PathVariable String bpname,
                                      @RequestBody Point p) {
        try {
            services.addPoint(author, bpname, p.getX(), p.getY());
            return ResponseEntity.status(HttpStatus.ACCEPTED).build();
        } catch (BlueprintNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    public record NewBlueprintRequest(
            @NotBlank String author,
            @NotBlank String name,
            @Valid java.util.List<Point> points
    ) { }
}
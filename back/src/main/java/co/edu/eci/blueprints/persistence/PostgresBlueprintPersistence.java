package co.edu.eci.blueprints.persistence;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.BlueprintPK;
import co.edu.eci.blueprints.model.Point;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Repository
@Primary
public class PostgresBlueprintPersistence implements BlueprintPersistence {

    private final BlueprintJpaRepository repository;

    public PostgresBlueprintPersistence(BlueprintJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public void saveBlueprint(Blueprint bp) throws BlueprintPersistenceException {
        BlueprintPK id = new BlueprintPK(bp.getAuthor(), bp.getName());
        if (repository.existsById(id)) {
            throw new BlueprintPersistenceException("Blueprint already exists: " + bp.getAuthor() + "/" + bp.getName());
        }
        repository.save(bp);
    }

    @Override
    public Blueprint getBlueprint(String author, String name) throws BlueprintNotFoundException {
        return repository.findById(new BlueprintPK(author, name))
                .orElseThrow(() -> new BlueprintNotFoundException("Blueprint not found: " + author + "/" + name));
    }

    @Override
    public Set<Blueprint> getBlueprintsByAuthor(String author) throws BlueprintNotFoundException {
        List<Blueprint> blueprints = repository.findByAuthor(author);
        if (blueprints.isEmpty()) {
            throw new BlueprintNotFoundException("No blueprints for author: " + author);
        }
        return new HashSet<>(blueprints);
    }

    @Override
    public Set<Blueprint> getAllBlueprints() {
        return new HashSet<>(repository.findAll());
    }

    @Override
    @Transactional
    public void addPoint(String author, String name, int x, int y) throws BlueprintNotFoundException {
        Blueprint bp = getBlueprint(author, name);
        bp.addPoint(new Point(x, y));
        repository.save(bp);
    }
}
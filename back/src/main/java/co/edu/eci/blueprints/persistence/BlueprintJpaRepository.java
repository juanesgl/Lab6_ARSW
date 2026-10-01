package co.edu.eci.blueprints.persistence;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.BlueprintPK;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlueprintJpaRepository extends JpaRepository<Blueprint, BlueprintPK> {
    List<Blueprint> findByAuthor(String author);
}